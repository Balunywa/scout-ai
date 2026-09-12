/**
 * Lazy, keyless Azure client singletons (server-only).
 *
 * All auth uses the App Service system-assigned managed identity via
 * DefaultAzureCredential — matching the RBAC role assignments granted in
 * deploy/azure/main.bicep. No keys or connection strings are read here.
 *
 * Clients are created lazily and memoised so the credential/token machinery is
 * only spun up when a request actually needs a given service.
 */

import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { AzureOpenAI } from "openai";
import { CosmosClient, type Container } from "@azure/cosmos";
import { SearchClient, SearchIndexClient } from "@azure/search-documents";

import { cosmosConfig, openAiConfig, searchConfig } from "./config";

const COGNITIVE_SERVICES_SCOPE = "https://cognitiveservices.azure.com/.default";

let credential: DefaultAzureCredential | undefined;
export function getCredential(): DefaultAzureCredential {
  credential ??= new DefaultAzureCredential();
  return credential;
}

let openAiClient: AzureOpenAI | undefined;
export function getOpenAiClient(): AzureOpenAI {
  if (!openAiConfig) {
    throw new Error("Azure OpenAI is not configured (AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_CHAT_DEPLOYMENT missing).");
  }
  if (!openAiClient) {
    const tokenProvider = getBearerTokenProvider(getCredential(), COGNITIVE_SERVICES_SCOPE);
    // Note: do NOT pin `deployment` on the client. When set, the SDK forces
    // every deployment-scoped call (chat AND embeddings) onto that one
    // deployment. Leaving it unset lets each request's `model` field select the
    // correct deployment (chat vs embedding) in the request path.
    openAiClient = new AzureOpenAI({
      endpoint: openAiConfig.endpoint,
      azureADTokenProvider: tokenProvider,
      apiVersion: openAiConfig.apiVersion,
    });
  }
  return openAiClient;
}

let cosmosContainer: Container | undefined;
export function getConversationsContainer(): Container | undefined {
  if (!cosmosConfig) return undefined;
  if (!cosmosContainer) {
    const client = new CosmosClient({
      endpoint: cosmosConfig.endpoint,
      aadCredentials: getCredential(),
    });
    cosmosContainer = client
      .database(cosmosConfig.database)
      .container(cosmosConfig.conversationsContainer);
  }
  return cosmosContainer;
}

/** Data-plane client for querying / uploading documents to the Digital Scout index. */
export function getSearchClient<T extends object>(): SearchClient<T> | undefined {
  if (!searchConfig) return undefined;
  return new SearchClient<T>(searchConfig.endpoint, searchConfig.indexName, getCredential());
}

/** Control-plane client for creating / updating the index definition. */
export function getSearchIndexClient(): SearchIndexClient | undefined {
  if (!searchConfig) return undefined;
  return new SearchIndexClient(searchConfig.endpoint, getCredential());
}
