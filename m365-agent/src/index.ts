import "./proxy";
import { startServer } from "@microsoft/agents-hosting-express";
import { agentApp } from "./agent";
import { registerMeetingNotes } from "./meetingNotes";

// Attach the meeting note-taking surface (meetingEnd -> transcript -> notes).
registerMeetingNotes(agentApp);

startServer(agentApp);
