/**
 * Server-only runtime configuration for Digital Scout.
 *
 * Values come from the App Service application settings that the Bicep template
 * (deploy/azure/main.bicep) wires to each backing service. When a setting is
 * absent the corresponding feature reports itself as "not configured" and the
 * app falls back to the in-memory seed behaviour, so local development and the
 * Phase-0 deployment keep working unchanged.
 *
 * This module must never be imported into client code — it reads process.env.
 * It is only pulled in by `createServerFn` handlers, which the bundler strips
 * from the browser build.
 */

const env = (key: string): string | undefined => {
  const value = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

export interface OpenAiConfig {
  endpoint: string;
  chatDeployment: string;
  embeddingDeployment?: string;
  apiVersion: string;
}

export interface CosmosConfig {
  endpoint: string;
  database: string;
  conversationsContainer: string;
}

export const openAiConfig: OpenAiConfig | undefined = (() => {
  const endpoint = env("AZURE_OPENAI_ENDPOINT") ?? env("AZURE_AI_FOUNDRY_ENDPOINT");
  const chatDeployment = env("AZURE_OPENAI_CHAT_DEPLOYMENT");
  if (!endpoint || !chatDeployment) return undefined;
  return {
    endpoint,
    chatDeployment,
    embeddingDeployment: env("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
    apiVersion: env("AZURE_OPENAI_API_VERSION") ?? "2024-10-21",
  };
})();

export const cosmosConfig: CosmosConfig | undefined = (() => {
  const endpoint = env("AZURE_COSMOS_ENDPOINT");
  if (!endpoint) return undefined;
  return {
    endpoint,
    database: env("AZURE_COSMOS_DATABASE") ?? "digitalscout",
    conversationsContainer: env("AZURE_COSMOS_CONVERSATIONS_CONTAINER") ?? "conversations",
  };
})();

export const searchConfig = (() => {
  const endpoint = env("AZURE_SEARCH_ENDPOINT");
  if (!endpoint) return undefined;
  return {
    endpoint,
    indexName: env("AZURE_SEARCH_INDEX") ?? "digital-scout",
  };
})();

export const postgresConfig = (() => {
  const host = env("POSTGRES_HOST");
  if (!host) return undefined;
  return {
    host,
    database: env("POSTGRES_DATABASE") ?? "digitalscout",
    user: env("POSTGRES_USER") ?? "scoutadmin",
    port: Number(env("POSTGRES_PORT") ?? "5432"),
  };
})();

export const isOpenAiConfigured = () => openAiConfig !== undefined;
export const isCosmosConfigured = () => cosmosConfig !== undefined;
