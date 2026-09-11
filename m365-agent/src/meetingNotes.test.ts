import { test } from "node:test";
import assert from "node:assert/strict";

// Provide harmless env so importing ./agent (constructs the Foundry client) is safe.
process.env.FOUNDRY_PROJECT_ENDPOINT ||= "https://example.services.ai.azure.com/api/projects/test";
process.env.FOUNDRY_AGENT_NAME ||= "scout-test";

// Require after env is set so module-load side effects don't throw.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parseVtt, resolveMeetingContext } = require("./meetingNotes") as typeof import("./meetingNotes");

test("parseVtt extracts speaker-attributed lines and drops VTT scaffolding", () => {
  const vtt = [
    "WEBVTT",
    "",
    "NOTE This is a note that should be ignored",
    "",
    "1",
    "00:00:01.000 --> 00:00:04.000",
    "<v User Name>This is a transcript test.</v>",
    "",
    "2",
    "00:00:05.000 --> 00:00:07.000",
    "<v Second Person>Second line here.</v>",
  ].join("\n");

  const result = parseVtt(vtt);

  assert.equal(result, "User Name: This is a transcript test.\nSecond Person: Second line here.");
});

test("parseVtt keeps unattributed lines verbatim", () => {
  const vtt = ["WEBVTT", "", "00:00:01.000 --> 00:00:02.000", "Plain caption line"].join("\n");
  assert.equal(parseVtt(vtt), "Plain caption line");
});

test("resolveMeetingContext uses channelData.meeting.id, NOT activity.value", () => {
  const context = {
    activity: {
      name: "application/vnd.microsoft.meetingEnd",
      type: "event",
      serviceUrl: "https://smba.trafficmanager.net/amer/",
      value: {
        // Per Microsoft docs this id must NOT be used as the meeting id.
        Id: "FORBIDDEN_VALUE_ID",
        Title: "Quarterly Planning",
      },
      channelData: {
        tenant: { id: "tenant-123" },
        meeting: {
          id: "teams-meeting-id-abc",
          details: { msGraphResourceId: "graph-resource-id-xyz", title: "Quarterly Planning" },
          organizer: { id: "29:organizer", aadObjectId: "aad-organizer-guid" },
        },
      },
      conversation: { tenantId: "tenant-123" },
    },
  } as any;

  const meeting = resolveMeetingContext(context);

  assert.equal(meeting.meetingId, "teams-meeting-id-abc");
  assert.notEqual(meeting.meetingId, "FORBIDDEN_VALUE_ID");
  assert.equal(meeting.msGraphResourceId, "graph-resource-id-xyz");
  assert.equal(meeting.organizerId, "aad-organizer-guid");
  assert.equal(meeting.serviceUrl, "https://smba.trafficmanager.net/amer/");
  assert.equal(meeting.tenantId, "tenant-123");
  assert.equal(meeting.title, "Quarterly Planning");
});

test("resolveMeetingContext degrades gracefully when meeting details are absent", () => {
  const context = {
    activity: {
      name: "application/vnd.microsoft.meetingEnd",
      type: "event",
      serviceUrl: "https://smba.trafficmanager.net/amer/",
      channelData: { meeting: { id: "teams-meeting-id-only" } },
    },
  } as any;

  const meeting = resolveMeetingContext(context);

  assert.equal(meeting.meetingId, "teams-meeting-id-only");
  assert.equal(meeting.msGraphResourceId, undefined);
  assert.equal(meeting.organizerId, undefined);
  assert.equal(meeting.title, "Meeting");
});
