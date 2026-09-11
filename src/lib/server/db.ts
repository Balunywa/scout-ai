/**
 * PostgreSQL (Azure Database for PostgreSQL Flexible Server) integration.
 *
 * Auth is keyless: the connection password is a short-lived Microsoft Entra
 * access token obtained from the App Service managed identity, matching the
 * `POSTGRES_*` app settings wired in deploy/azure/main.bicep. The needs corpus
 * is stored as JSONB; when the embedding deployment is available a pgvector
 * column is populated so needs can be retrieved by semantic similarity.
 *
 * Server-only. All functions degrade to `{ configured: false }` when Postgres
 * is not configured, so the app falls back to the in-memory seed.
 */

import { createServerFn } from "@tanstack/react-start";
import type { Pool as PgPool } from "pg";

import { needs as seedNeeds } from "../data/seed";
import type { TechnologyNeed } from "../data/types";
import { getCredential, getOpenAiClient } from "./clients";
import { isEmbeddingConfigured, openAiConfig, postgresConfig } from "./config";

const POSTGRES_AAD_SCOPE = "https://ossrdbms-aad.database.windows.net/.default";

let pool: PgPool | undefined;

async function getPool(): Promise<PgPool | undefined> {
  if (!postgresConfig) return undefined;
  if (pool) return pool;
  // Dynamic import keeps `pg` out of any accidental client graph.
  const { Pool } = await import("pg");
  pool = new Pool({
    host: postgresConfig.host,
    port: postgresConfig.port,
    database: postgresConfig.database,
    user: postgresConfig.user,
    ssl: { rejectUnauthorized: true },
    // Fresh Entra token per new physical connection (tokens are ~1h lived).
    password: async () => {
      const token = await getCredential().getToken(POSTGRES_AAD_SCOPE);
      if (!token) throw new Error("Failed to acquire Entra token for PostgreSQL.");
      return token.token;
    },
  });
  return pool;
}

const vectorLiteral = (v: number[]) => `[${v.join(",")}]`;

async function embedOne(text: string): Promise<number[] | undefined> {
  if (!openAiConfig?.embeddingDeployment) return undefined;
  const res = await getOpenAiClient().embeddings.create({
    model: openAiConfig.embeddingDeployment,
    input: text,
  });
  return res.data[0]?.embedding;
}

const needText = (n: TechnologyNeed) =>
  [n.title, n.problemStatement, n.businessImpact, n.desiredOutcome, n.category, n.keywords.join(" ")].join(" ");

/**
 * Create the schema and load the seed needs. Idempotent — rows are upserted.
 * Enables the `vector` extension and populates embeddings when available.
 */
export const syncNeeds = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ configured: boolean; rows?: number; vectors?: boolean; error?: string }> => {
    const client = await getPool();
    if (!client) return { configured: false };
    const withVectors = isEmbeddingConfigured();
    const dims = openAiConfig?.embeddingDimensions ?? 1536;
    try {
      if (withVectors) {
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      }
      await client.query(
        `CREATE TABLE IF NOT EXISTS needs (
           id text PRIMARY KEY,
           data jsonb NOT NULL,
           ${withVectors ? `embedding vector(${dims}),` : ""}
           updated_at timestamptz NOT NULL DEFAULT now()
         )`,
      );

      for (const n of seedNeeds) {
        const embedding = withVectors ? await embedOne(needText(n)) : undefined;
        if (embedding) {
          await client.query(
            `INSERT INTO needs (id, data, embedding, updated_at)
             VALUES ($1, $2, $3::vector, now())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, embedding = EXCLUDED.embedding, updated_at = now()`,
            [n.id, JSON.stringify(n), vectorLiteral(embedding)],
          );
        } else {
          await client.query(
            `INSERT INTO needs (id, data, updated_at)
             VALUES ($1, $2, now())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
            [n.id, JSON.stringify(n)],
          );
        }
      }
      return { configured: true, rows: seedNeeds.length, vectors: withVectors };
    } catch (err) {
      return { configured: true, error: err instanceof Error ? err.message : "sync failed" };
    }
  },
);

/** Load all needs from Postgres. */
export const fetchNeeds = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ configured: boolean; needs?: TechnologyNeed[] }> => {
    const client = await getPool();
    if (!client) return { configured: false };
    try {
      const res = await client.query<{ data: TechnologyNeed }>("SELECT data FROM needs");
      return { configured: true, needs: res.rows.map((r) => r.data) };
    } catch {
      return { configured: false };
    }
  },
);

/** Load a single need by id from Postgres. */
export const fetchNeed = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ configured: boolean; need?: TechnologyNeed | null }> => {
    const client = await getPool();
    if (!client) return { configured: false };
    try {
      const res = await client.query<{ data: TechnologyNeed }>("SELECT data FROM needs WHERE id = $1", [data.id]);
      return { configured: true, need: res.rows[0]?.data ?? null };
    } catch {
      return { configured: false };
    }
  });

/** Semantic "similar needs" via pgvector cosine distance. */
export const findSimilarNeeds = createServerFn({ method: "POST" })
  .validator((data: { needId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<{ configured: boolean; needs?: TechnologyNeed[] }> => {
    const client = await getPool();
    if (!client || !isEmbeddingConfigured()) return { configured: false };
    try {
      const seed = seedNeeds.find((n) => n.id === data.needId);
      const embedding = seed ? await embedOne(needText(seed)) : undefined;
      if (!embedding) return { configured: false };
      const res = await client.query<{ data: TechnologyNeed }>(
        `SELECT data FROM needs
         WHERE id <> $1 AND embedding IS NOT NULL
         ORDER BY embedding <=> $2::vector
         LIMIT $3`,
        [data.needId, vectorLiteral(embedding), data.limit ?? 5],
      );
      return { configured: true, needs: res.rows.map((r) => r.data) };
    } catch {
      return { configured: false };
    }
  });
