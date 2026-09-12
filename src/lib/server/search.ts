/**
 * Azure AI Search integration for Digital Scout, exposed as server functions.
 *
 * - `runSearch` executes a hybrid (keyword + vector) query against the
 *   `digital-scout` index and maps results back to the app's SearchHit shape.
 * - `reindex` (idempotent) creates/updates the index definition and ingests the
 *   current seed corpus, computing embeddings with the Azure OpenAI embedding
 *   deployment. It is the bridge that populates the index the first time.
 *
 * Everything degrades gracefully: when Search (or embeddings) is not configured
 * the query returns `{ configured: false }` and the caller keeps seed search.
 */

import { createServerFn } from "@tanstack/react-start";
import type { SearchIndex } from "@azure/search-documents";

import {
  companies,
  evaluations,
  knowledgeDocs,
  needs,
  people,
  projects,
  reports,
} from "../data/seed";
import { getOpenAiClient, getSearchClient, getSearchIndexClient } from "./clients";
import { isEmbeddingConfigured, isSearchConfigured, openAiConfig, searchConfig } from "./config";

/** Shape stored in the Azure AI Search index. */
interface ScoutDoc {
  key: string;
  id: string;
  type: string;
  title: string;
  subtitle: string;
  snippet: string;
  content: string;
  origin: string;
  href: string;
  contentVector?: number[];
}

/** Mirror of SearchHit in ../api/client (kept structural to avoid a runtime cycle). */
export interface IndexHit {
  id: string;
  type: "need" | "company" | "evaluation" | "project" | "report" | "document" | "person";
  title: string;
  subtitle: string;
  snippet: string;
  origin: "internal" | "external";
  href: string;
  score: number;
}

const sanitiseKey = (raw: string) => raw.replace(/[^A-Za-z0-9_\-=]/g, "_");

/** Build the full display+search corpus from the seed data. */
function buildCorpus(): ScoutDoc[] {
  const docs: ScoutDoc[] = [];
  const add = (d: Omit<ScoutDoc, "key">) => docs.push({ key: sanitiseKey(`${d.type}_${d.id}`), ...d });

  for (const n of needs) {
    add({
      id: n.id,
      type: "need",
      title: n.title,
      subtitle: `${n.ref} · ${n.psl} · ${n.status}`,
      snippet: n.problemStatement.slice(0, 220) + "…",
      content: [n.title, n.problemStatement, n.businessImpact, n.desiredOutcome, n.category, n.keywords.join(" ")].join(" "),
      origin: "internal",
      href: `/needs/${n.id}`,
    });
  }
  for (const c of companies) {
    add({
      id: c.id,
      type: "company",
      title: c.name,
      subtitle: `${c.domain} · ${c.headquarters} · ${c.relationship}`,
      snippet: c.description,
      content: [c.name, c.description, c.technologyAreas.join(" "), c.domain].join(" "),
      origin: c.external ? "external" : "internal",
      href: `/companies/${c.id}`,
    });
  }
  for (const e of evaluations) {
    add({
      id: e.id,
      type: "evaluation",
      title: e.title,
      subtitle: `${e.ref} · ${e.status}`,
      snippet: e.recommendation.decision + " — " + e.recommendation.reasons[0],
      content: [e.title, e.recommendation.decision, e.criteria.map((cr) => cr.comment).join(" ")].join(" "),
      origin: "internal",
      href: `/evaluations/${e.id}`,
    });
  }
  for (const p of projects) {
    add({
      id: p.id,
      type: "project",
      title: p.name,
      subtitle: `${p.ref} · ${p.status} · ${p.location}`,
      snippet: p.summary,
      content: [p.name, p.summary, p.location].join(" "),
      origin: "internal",
      href: `/projects`,
    });
  }
  for (const r of reports) {
    add({
      id: r.id,
      type: "report",
      title: r.title,
      subtitle: `${r.ref} · ${r.source} · ${r.outcome}`,
      snippet: r.summary,
      content: [r.title, r.summary, r.findings.join(" ")].join(" "),
      origin: "internal",
      href: `/knowledge?doc=${r.id}`,
    });
  }
  for (const d of knowledgeDocs) {
    add({
      id: d.id,
      type: "document",
      title: d.title,
      subtitle: `${d.kind} · ${d.source}`,
      snippet: d.excerpt,
      content: [d.title, d.excerpt, d.kind].join(" "),
      origin: d.origin,
      href: `/knowledge?doc=${d.id}`,
    });
  }
  for (const p of people) {
    add({
      id: p.id,
      type: "person",
      title: p.name,
      subtitle: `${p.title} · ${p.psl}`,
      snippet: `Expertise: ${p.expertise.join(", ")}`,
      content: [p.name, p.title, p.expertise.join(" "), p.psl].join(" "),
      origin: "internal",
      href: `/knowledge?person=${p.id}`,
    });
  }
  return docs;
}

/** Compute embeddings for a batch of strings via the Azure OpenAI embedding deployment. */
async function embed(inputs: string[]): Promise<number[][]> {
  if (!openAiConfig?.embeddingDeployment) return [];
  const client = getOpenAiClient();
  const vectors: number[][] = [];
  const batchSize = 16;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await client.embeddings.create({
      model: openAiConfig.embeddingDeployment,
      input: batch,
    });
    for (const item of res.data) vectors.push(item.embedding);
  }
  return vectors;
}

function buildIndexDefinition(): SearchIndex {
  const withVectors = isEmbeddingConfigured();
  const dimensions = openAiConfig?.embeddingDimensions ?? 1536;
  const fields: SearchIndex["fields"] = [
    { name: "key", type: "Edm.String", key: true, filterable: true },
    { name: "id", type: "Edm.String" },
    { name: "type", type: "Edm.String", filterable: true, facetable: true },
    { name: "title", type: "Edm.String", searchable: true },
    { name: "subtitle", type: "Edm.String" },
    { name: "snippet", type: "Edm.String" },
    { name: "content", type: "Edm.String", searchable: true },
    { name: "origin", type: "Edm.String", filterable: true },
    { name: "href", type: "Edm.String" },
  ];
  if (withVectors) {
    fields.push({
      name: "contentVector",
      type: "Collection(Edm.Single)",
      searchable: true,
      hidden: true,
      vectorSearchDimensions: dimensions,
      vectorSearchProfileName: "scout-vector-profile",
    });
  }
  const index: SearchIndex = { name: searchConfig!.indexName, fields };
  if (withVectors) {
    index.vectorSearch = {
      algorithms: [{ name: "scout-hnsw", kind: "hnsw" }],
      profiles: [{ name: "scout-vector-profile", algorithmConfigurationName: "scout-hnsw" }],
    };
  }
  return index;
}

/**
 * Create/update the index and ingest the seed corpus. Idempotent — safe to run
 * repeatedly (documents are upserted by key).
 */
export const reindex = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ configured: boolean; indexed?: number; vectors?: boolean; error?: string }> => {
    if (!isSearchConfigured()) return { configured: false };
    try {
      const indexClient = getSearchIndexClient();
      const searchClient = getSearchClient<ScoutDoc>();
      if (!indexClient || !searchClient) return { configured: false };

      await indexClient.createOrUpdateIndex(buildIndexDefinition());

      const corpus = buildCorpus();
      if (isEmbeddingConfigured()) {
        const vectors = await embed(corpus.map((d) => d.content));
        corpus.forEach((d, i) => {
          if (vectors[i]) d.contentVector = vectors[i];
        });
      }

      // Upload in batches to stay within request-size limits.
      const batchSize = 200;
      for (let i = 0; i < corpus.length; i += batchSize) {
        await searchClient.uploadDocuments(corpus.slice(i, i + batchSize));
      }

      return { configured: true, indexed: corpus.length, vectors: isEmbeddingConfigured() };
    } catch (err) {
      return { configured: true, error: err instanceof Error ? err.message : "reindex failed" };
    }
  },
);

/** Execute a hybrid query against the index. Returns null-ish when unconfigured. */
export const runSearch = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<{ configured: boolean; hits?: IndexHit[] }> => {
    if (!isSearchConfigured()) return { configured: false };
    try {
      const searchClient = getSearchClient<ScoutDoc>();
      if (!searchClient) return { configured: false };

      let vector: number[] | undefined;
      if (isEmbeddingConfigured()) {
        const [v] = await embed([data.query]);
        vector = v;
      }

      const results = await searchClient.search(data.query, {
        top: 40,
        ...(vector
          ? {
              vectorSearchOptions: {
                queries: [
                  {
                    kind: "vector",
                    vector,
                    fields: ["contentVector"],
                    kNearestNeighborsCount: 40,
                  },
                ],
              },
            }
          : {}),
      });

      const hits: IndexHit[] = [];
      for await (const r of results.results) {
        const doc = r.document;
        hits.push({
          id: doc.id,
          type: doc.type as IndexHit["type"],
          title: doc.title,
          subtitle: doc.subtitle,
          snippet: doc.snippet,
          origin: doc.origin as IndexHit["origin"],
          href: doc.href,
          score: r.score ?? 0,
        });
      }
      return { configured: true, hits };
    } catch {
      return { configured: false };
    }
  });
