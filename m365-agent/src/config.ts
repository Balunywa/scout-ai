const config = {
  // Microsoft Foundry (Azure AI Projects) configuration
  foundryProjectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT,
  foundryAgentName: process.env.FOUNDRY_AGENT_NAME,

  // Microsoft Graph configuration used for meeting-notes / transcript retrieval.
  // The bot's identity (managed identity in prod, developer identity in dev)
  // must be granted the Graph permissions required to read meeting transcripts.
  graphBaseUrl: process.env.GRAPH_BASE_URL || "https://graph.microsoft.com/v1.0",
  graphScope: process.env.GRAPH_SCOPE || "https://graph.microsoft.com/.default",

  // Toggle the automatic meeting-notes feature (meetingEnd -> transcript -> notes).
  meetingNotesEnabled: (process.env.MEETING_NOTES_ENABLED || "true").toLowerCase() === "true",
};

export default config;
