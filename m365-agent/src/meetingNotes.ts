import { ActivityTypes } from "@microsoft/agents-activity";
import {
  AgentApplication,
  CloudAdapter,
  TurnContext,
  TurnState,
} from "@microsoft/agents-hosting";
import config from "./config";
import { credential, projectClient, retryWithBackoff } from "./agent";

// Teams surfaces meeting lifecycle as `event` activities with these names.
const MEETING_START_EVENT = "application/vnd.microsoft.meetingStart";
const MEETING_END_EVENT = "application/vnd.microsoft.meetingEnd";

// Transcripts are not written instantly when a meeting ends; poll a few times.
const TRANSCRIPT_MAX_ATTEMPTS = 6;
const TRANSCRIPT_RETRY_DELAY_MS = 15_000;

// Guardrail so we never push an enormous transcript into the model.
const MAX_TRANSCRIPT_CHARS = 100_000;

interface MeetingContext {
  /** Teams meeting id from channelData.meeting.id (used only for the Teams meeting-details REST call). */
  meetingId?: string;
  /** Graph online-meeting id — the ONLY id valid for Graph /onlineMeetings/{id}/transcripts. */
  msGraphResourceId?: string;
  /** Organizer AAD object id — the {userId} segment for the Graph transcript path. */
  organizerId?: string;
  title: string;
  tenantId?: string;
  /** Bot Framework service URL, needed to call the Teams meeting-details REST API. */
  serviceUrl?: string;
}

/**
 * Registers the automatic meeting-notes flow on the agent application.
 *
 * Flow: Teams sends a `meetingEnd` event -> we resolve the online meeting +
 * organizer -> read the transcript from Microsoft Graph -> summarize it with the
 * Foundry-hosted Scout agent -> post an Adaptive Card of notes back to the chat.
 */
export function registerMeetingNotes(app: AgentApplication<TurnState>): void {
  if (!config.meetingNotesEnabled) {
    console.log("[MEETING] Meeting-notes feature disabled via MEETING_NOTES_ENABLED=false");
    return;
  }

  app.onActivity(ActivityTypes.Event, async (context: TurnContext) => {
    const name = context.activity.name;

    if (name === MEETING_START_EVENT) {
      console.log("[MEETING] Meeting started; notes will be generated when it ends.");
      return;
    }

    if (name !== MEETING_END_EVENT) {
      return; // Not a meeting lifecycle event we handle.
    }

    console.log("[MEETING] meetingEnd event received");

    try {
      const meeting = resolveMeetingContext(context);

      // The meetingEnd event does NOT carry the organizer's AAD id, and often
      // not the Graph resource id either. Both are required to read the
      // transcript from Graph, so fetch them from the Teams meeting-details API.
      if (!meeting.organizerId || !meeting.msGraphResourceId) {
        await hydrateMeetingDetails(context, meeting);
      }

      console.log(
        `[MEETING] Resolved context: title="${meeting.title}" ` +
          `msGraphResourceId=${meeting.msGraphResourceId} organizer=${meeting.organizerId}`
      );

      if (!meeting.organizerId || !meeting.msGraphResourceId) {
        console.warn(
          "[MEETING] Missing organizer AAD id or Graph resource id; cannot fetch transcript."
        );
        await context.sendActivity(
          "I couldn't automatically capture the notes for this meeting because the required " +
            "meeting details weren't available. Please ensure transcription was turned on."
        );
        return;
      }

      const transcript = await fetchLatestTranscript(meeting);
      if (!transcript) {
        await context.sendActivity(
          "No transcript was found for this meeting. Turn on transcription during the meeting " +
            "and I'll summarize it automatically next time."
        );
        return;
      }

      const notes = await summarizeTranscript(transcript, meeting.title);
      await context.sendActivity({
        type: ActivityTypes.Message,
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: createMeetingNotesCard(meeting.title, notes),
          },
        ],
      } as any);

      console.log("[MEETING] Posted meeting notes card to the chat.");
    } catch (error: any) {
      console.error("[MEETING] Failed to generate meeting notes:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
      });
      await context.sendActivity(
        "I ran into a problem generating the meeting notes. The transcript may still be " +
          "processing \u2014 please try again in a few minutes."
      );
    }
  });
}

/**
 * Extracts meeting identifiers from the event activity.
 *
 * Per Microsoft docs (apps-in-teams-meetings/meeting-apps-apis): the meeting id
 * MUST come from `channelData.meeting.id` — never from the conversation id and
 * never from the event payload `activity.value`. The Graph resource id and
 * organizer are not on the event; they are hydrated later from the meeting
 * details API. `channelData.meeting.details` may already carry msGraphResourceId.
 */
export function resolveMeetingContext(context: TurnContext): MeetingContext {
  const channelData = (context.activity.channelData as any) || {};
  const meeting = channelData.meeting || {};
  const value = (context.activity.value as any) || {};

  return {
    meetingId: meeting.id,
    msGraphResourceId: meeting.details?.msGraphResourceId,
    organizerId: meeting.organizer?.aadObjectId || meeting.organizer?.id,
    // Prefer a title from the event value/details for the notes header.
    title: value.Title || value.title || meeting.details?.title || meeting.title || "Meeting",
    tenantId: channelData.tenant?.id || context.activity.conversation?.tenantId,
    serviceUrl: context.activity.serviceUrl,
  };
}

/**
 * Fills in the organizer AAD id and Graph resource id by calling the Teams
 * meeting-details REST API (`GET {serviceUrl}v1/meetings/{meetingId}`).
 *
 * The M365 Agents SDK has no built-in meeting-details helper, so we mint a Bot
 * Framework connector token from the adapter's connection manager and issue the
 * REST call directly — the same endpoint botbuilder's TeamsInfo.getMeetingInfo
 * uses under the hood.
 */
async function hydrateMeetingDetails(context: TurnContext, meeting: MeetingContext): Promise<void> {
  if (!meeting.meetingId || !meeting.serviceUrl) {
    console.warn("[MEETING] No meetingId/serviceUrl available to fetch meeting details.");
    return;
  }

  try {
    const adapter = context.adapter as CloudAdapter;
    const tokenProvider = adapter.connectionManager.getTokenProvider(
      context.identity,
      meeting.serviceUrl
    );
    const token = await tokenProvider.getAccessToken("https://api.botframework.com/.default");

    const base = meeting.serviceUrl.endsWith("/") ? meeting.serviceUrl : `${meeting.serviceUrl}/`;
    const url = `${base}v1/meetings/${encodeURIComponent(meeting.meetingId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok) {
      console.warn(`[MEETING] Meeting-details API returned status ${res.status}.`);
      return;
    }

    const info = (await res.json()) as any;
    meeting.msGraphResourceId = meeting.msGraphResourceId || info?.details?.msGraphResourceId;
    meeting.organizerId =
      meeting.organizerId || info?.organizer?.aadObjectId || info?.organizer?.id;
    if (!meeting.title || meeting.title === "Meeting") {
      meeting.title = info?.details?.title || meeting.title;
    }
  } catch (error: any) {
    console.warn("[MEETING] Failed to fetch meeting details:", error?.message);
  }
}

/** Acquires an app/user token for Microsoft Graph using the bot's credential. */
async function getGraphToken(): Promise<string> {
  const token = await credential.getToken(config.graphScope);
  if (!token?.token) {
    throw new Error("Failed to acquire a Microsoft Graph access token.");
  }
  return token.token;
}

async function graphGet(path: string, token: string, accept?: string): Promise<Response> {
  const url = path.startsWith("http") ? path : `${config.graphBaseUrl}${path}`;
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(accept ? { Accept: accept } : {}),
    },
  });
}

/**
 * Downloads the most recent transcript for the meeting as plain text. Polls
 * because transcripts are written asynchronously after the meeting ends.
 *
 * The Graph transcript path is `/users/{organizerAadId}/onlineMeetings/{msGraphResourceId}/transcripts`.
 * Note the path meeting id is the Graph resource id — NOT the Teams meeting id.
 */
async function fetchLatestTranscript(meeting: MeetingContext): Promise<string | null> {
  const token = await getGraphToken();
  const organizer = encodeURIComponent(meeting.organizerId!);
  const graphMeetingId = encodeURIComponent(meeting.msGraphResourceId!);

  for (let attempt = 0; attempt < TRANSCRIPT_MAX_ATTEMPTS; attempt++) {
    const listRes = await graphGet(
      `/users/${organizer}/onlineMeetings/${graphMeetingId}/transcripts`,
      token,
      "application/json"
    );

    if (listRes.ok) {
      const list = (await listRes.json()) as any;
      const transcripts: any[] = list.value || [];
      if (transcripts.length > 0) {
        // Newest transcript wins.
        transcripts.sort(
          (a, b) =>
            new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime()
        );
        const transcriptId = transcripts[0].id;
        return await downloadTranscriptContent(organizer, graphMeetingId, transcriptId, token);
      }
    } else if (listRes.status === 401 || listRes.status === 403) {
      throw new Error(await describeGraphAccessError(listRes));
    }

    console.log(
      `[MEETING] Transcript not ready (attempt ${attempt + 1}/${TRANSCRIPT_MAX_ATTEMPTS}); waiting...`
    );
    await new Promise((resolve) => setTimeout(resolve, TRANSCRIPT_RETRY_DELAY_MS));
  }

  return null;
}

/**
 * Downloads transcript content. Prefers speaker-attributed VTT, but Graph may
 * reject that with `SpeakerAttributionNotAllowed`; in that case it retries the
 * unattributed text format (`application/vnd.microsoft.graph.transcript+text`).
 */
async function downloadTranscriptContent(
  organizer: string,
  graphMeetingId: string,
  transcriptId: string,
  token: string
): Promise<string | null> {
  const basePath = `/users/${organizer}/onlineMeetings/${graphMeetingId}/transcripts/${transcriptId}/content`;

  const vttRes = await graphGet(`${basePath}?$format=text/vtt`, token, "text/vtt");
  if (vttRes.ok) {
    return parseVtt(await vttRes.text());
  }

  if (vttRes.status === 403) {
    const body = await safeReadJson(vttRes);
    const innerCode = body?.error?.innerError?.code || body?.error?.code;
    if (innerCode === "SpeakerAttributionNotAllowed") {
      console.warn("[MEETING] Speaker attribution not allowed; retrying without attribution.");
      const textRes = await graphGet(
        `${basePath}?$format=application/vnd.microsoft.graph.transcript+text`,
        token,
        "application/vnd.microsoft.graph.transcript+text"
      );
      if (textRes.ok) {
        return truncateTranscript(await textRes.text());
      }
    }
    if (innerCode === "GraphAccessToTranscriptsDisabled") {
      throw new Error(
        "The tenant has disabled Microsoft Graph access to Teams transcripts. An admin must " +
          "enable it before meeting notes can be generated automatically."
      );
    }
  }

  console.warn(`[MEETING] Transcript content fetch failed (status ${vttRes.status}).`);
  return null;
}

/** Reads a JSON body without throwing if it is empty or non-JSON. */
async function safeReadJson(res: Response): Promise<any> {
  try {
    return await res.clone().json();
  } catch {
    return null;
  }
}

/** Builds a clear error message for Graph 401/403 responses on the transcript list. */
async function describeGraphAccessError(res: Response): Promise<string> {
  const body = await safeReadJson(res);
  const innerCode = body?.error?.innerError?.code || body?.error?.code;
  if (innerCode === "GraphAccessToTranscriptsDisabled") {
    return (
      "The tenant has disabled Microsoft Graph access to Teams transcripts. An admin must " +
      "enable it before meeting notes can be generated automatically."
    );
  }
  return (
    `Graph denied transcript access (status ${res.status}${innerCode ? `, ${innerCode}` : ""}). ` +
    "Verify the OnlineMeetingTranscript.Read.All application permission and the tenant " +
    "application access policy for the organizer."
  );
}

/** Converts a WEBVTT transcript into readable "Speaker: text" lines. */
export function parseVtt(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "WEBVTT") continue;
    if (line.startsWith("NOTE")) continue;
    if (/^\d+$/.test(line)) continue; // cue index
    if (line.includes("-->")) continue; // timestamp line

    // Teams embeds the speaker as <v Speaker Name>text</v>.
    const voiceMatch = line.match(/^<v\s+([^>]+)>(.*?)<\/v>$/);
    if (voiceMatch) {
      out.push(`${voiceMatch[1].trim()}: ${voiceMatch[2].trim()}`);
    } else {
      out.push(line);
    }
  }

  return truncateTranscript(out.join("\n"));
}

/** Guardrail so we never push an enormous transcript into the model. */
function truncateTranscript(text: string): string {
  return text.length > MAX_TRANSCRIPT_CHARS ? text.slice(0, MAX_TRANSCRIPT_CHARS) : text;
}

/** Summarizes the transcript with the Foundry-hosted Scout agent. */
async function summarizeTranscript(transcript: string, title: string): Promise<string> {
  const openAIClient = await projectClient.getOpenAIClient();

  const prompt =
    `You are Scout, taking notes for the meeting titled "${title}". ` +
    "Summarize the transcript below into concise meeting notes with these sections:\n" +
    "**Summary** (2-4 sentences), **Key Decisions**, **Action Items** (owner + task), " +
    "and **Follow-ups**. Use Markdown. If a section has no content, omit it.\n\n" +
    `Transcript:\n${transcript}`;

  const conversation = await openAIClient.conversations.create({
    items: [{ type: "message", role: "user", content: prompt }],
  });

  const response = await retryWithBackoff(
    () =>
      openAIClient.responses.create(
        { conversation: conversation.id },
        {
          body: {
            agent: {
              name: config.foundryAgentName,
              type: "agent_reference",
            },
          },
        }
      ),
    3,
    1000
  );

  return (response as any).output_text || "I couldn't generate notes for this meeting.";
}

/** Builds the Adaptive Card that presents the generated notes. */
function createMeetingNotesCard(title: string, notes: string): any {
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: "\uD83D\uDCDD Meeting Notes",
        weight: "bolder",
        size: "large",
      },
      {
        type: "TextBlock",
        text: title,
        weight: "bolder",
        spacing: "none",
        isSubtle: true,
        wrap: true,
      },
      {
        type: "TextBlock",
        text: notes,
        wrap: true,
        spacing: "medium",
      },
      {
        type: "TextBlock",
        text: "Generated by Scout from the meeting transcript.",
        wrap: true,
        size: "small",
        isSubtle: true,
        spacing: "medium",
      },
    ],
  };
}
