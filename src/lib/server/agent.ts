/**
 * Azure AI Foundry (Azure OpenAI) request-path integrations, exposed as
 * TanStack server functions. These run only on the server; the browser calls
 * them over RPC and never sees the Azure SDKs or credentials.
 *
 * Both functions degrade gracefully: when Azure OpenAI is not configured they
 * return `{ configured: false }` and the caller keeps its existing seed-based
 * behaviour. Retrieval/grounding is supplied by the caller (the seed search in
 * client.ts today, Azure AI Search later) so this module stays decoupled from
 * the data layer.
 */

import { createServerFn } from "@tanstack/react-start";

import { getConversationsContainer, getOpenAiClient } from "./clients";
import { isOpenAiConfigured, openAiConfig } from "./config";

export interface GroundingHit {
  title: string;
  type: string;
  snippet: string;
  href: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Digital Scout, Contoso's technology-scouting analyst.
You help scouts and engineers reuse what Contoso already knows before starting new external discovery.
Ground every answer in the provided CONTEXT, which comes from Contoso's internal knowledge index
(technology needs, companies, evaluations, field reports and documents).
- Lead with Contoso's existing internal knowledge; be specific and cite the item titles you used.
- If the context does not cover the question, say so plainly and suggest an external discovery run.
- Be concise and factual. Never invent evaluations, companies, or test results that are not in the context.`;

function buildContextBlock(hits: GroundingHit[]): string {
  if (hits.length === 0) return "CONTEXT: (no internal matches found)";
  const lines = hits
    .slice(0, 8)
    .map((h, i) => `[${i + 1}] (${h.type}) ${h.title}\n    ${h.snippet}`)
    .join("\n");
  return `CONTEXT — top internal matches:\n${lines}`;
}

/**
 * Generate a grounded natural-language summary for a knowledge-search result.
 * Falls back to `{ configured: false }` when Azure OpenAI is unavailable.
 */
export const summarizeSearch = createServerFn({ method: "POST" })
  .validator((data: { query: string; hits: GroundingHit[] }) => data)
  .handler(async ({ data }): Promise<{ configured: boolean; summary?: string }> => {
    if (!isOpenAiConfigured() || !openAiConfig) return { configured: false };
    try {
      const client = getOpenAiClient();
      const completion = await client.chat.completions.create({
        model: openAiConfig.chatDeployment,
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `${buildContextBlock(data.hits)}\n\nWrite a 2-3 sentence briefing for a scout who searched for "${data.query}". Summarise what Contoso already knows and name the strongest matches.`,
          },
        ],
      });
      const summary = completion.choices[0]?.message?.content?.trim();
      return summary ? { configured: true, summary } : { configured: false };
    } catch {
      // Any transient/auth failure falls back to the templated summary.
      return { configured: false };
    }
  });

/**
 * Conversational answer for "Ask Digital Scout", grounded on caller-supplied
 * internal matches. Persists the turn to Cosmos DB when configured.
 */
export const askScout = createServerFn({ method: "POST" })
  .validator(
    (data: {
      query: string;
      hits: GroundingHit[];
      history?: ChatTurn[] | undefined;
      conversationId?: string | undefined;
    }) => data,
  )
  .handler(
    async ({
      data,
    }): Promise<{ configured: boolean; answer?: string; citations?: { label: string; href: string }[] }> => {
      if (!isOpenAiConfigured() || !openAiConfig) return { configured: false };
      try {
        const client = getOpenAiClient();
        const history = (data.history ?? []).slice(-6);
        const completion = await client.chat.completions.create({
          model: openAiConfig.chatDeployment,
          temperature: 0.3,
          max_tokens: 700,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "system", content: buildContextBlock(data.hits) },
            ...history.map((t) => ({ role: t.role, content: t.content }) as const),
            { role: "user", content: data.query },
          ],
        });
        const answer = completion.choices[0]?.message?.content?.trim();
        if (!answer) return { configured: false };

        const citations = data.hits.slice(0, 4).map((h) => ({ label: h.title, href: h.href }));
        await persistConversation(data.conversationId, data.query, answer);
        return { configured: true, answer, citations };
      } catch {
        return { configured: false };
      }
    },
  );

async function persistConversation(conversationId: string | undefined, query: string, answer: string): Promise<void> {
  const container = getConversationsContainer();
  if (!container) return;
  try {
    const id = conversationId ?? `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await container.items.upsert({
      id,
      conversationId: id,
      createdAt: new Date().toISOString(),
      query,
      answer,
    });
  } catch {
    // Persistence is best-effort; never fail the user's request over it.
  }
}
