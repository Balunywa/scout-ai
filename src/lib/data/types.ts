export type PSL =
  | "Drilling & Evaluation"
  | "Completion & Production"
  | "Cementing"
  | "Artificial Lift"
  | "Testing & Subsea"
  | "Wireline & Perforating"
  | "Landmark / Digital"
  | "Corporate Technology";

export type TechCategory =
  | "Chemicals"
  | "Materials & Coatings"
  | "Sensors"
  | "Electronics"
  | "Water Treatment"
  | "Power Systems"
  | "AI / ML"
  | "Automation"
  | "Engineering Technologies"
  | "Scientific Technologies";

export type NeedStatus =
  | "Draft"
  | "Scouting"
  | "Companies Identified"
  | "Evaluation"
  | "Pilot / Test"
  | "Project"
  | "Closed"
  | "Archived";

export type Role =
  | "Engineer / Technologist"
  | "Technology Scout"
  | "PSL Leader"
  | "Evaluator / SME"
  | "Administrator";

export interface Person {
  id: string;
  name: string;
  title: string;
  psl: PSL;
  role: Role;
  location: string;
  expertise: string[];
}

export interface AISignal {
  kind: "similar" | "stale" | "new-companies" | "prior-evaluation" | "external";
  label: string;
  detail: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  type:
    | "evaluation-completed"
    | "feedback-added"
    | "company-matched"
    | "report-uploaded"
    | "status-changed"
    | "external-signal"
    | "need-created"
    | "project-funded";
  actor: string;
  summary: string;
  entityType?: "need" | "company" | "evaluation" | "project" | "report";
  entityId?: string;
}

export interface Requirement {
  id: string;
  label: string;
  value: string;
  critical: boolean;
}

export interface TechnologyNeed {
  id: string;
  ref: string;
  title: string;
  psl: PSL;
  category: TechCategory;
  status: NeedStatus;
  ownerId: string;
  scoutId: string;
  createdAt: string;
  lastActivityAt: string;
  strategicPriority: "Strategic" | "High" | "Medium" | "Low";
  trlExpectation: string;
  followers: string[];
  problemStatement: string;
  businessImpact: string;
  operatingEnvironment: Record<string, string>;
  constraints: string[];
  desiredOutcome: string;
  timeline: string;
  existingApproaches: string;
  requirements: Requirement[];
  keywords: string[];
  aiSummary: string;
  aiSignals: AISignal[];
  companyIds: string[];
  evaluationIds: string[];
  projectIds: string[];
  reportIds: string[];
  relatedNeedIds: string[];
}

export interface EngineerFeedback {
  id: string;
  author: string;
  psl: PSL;
  at: string;
  rating: number;
  comment: string;
  sourceLabel: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  technologyAreas: string[];
  domain: TechCategory;
  website: string;
  headquarters: string;
  country: string;
  founded: number;
  employees: string;
  maturity: "Research" | "Prototype" | "Field Trial" | "Commercial" | "Scaled";
  relationship:
    | "None"
    | "Contacted"
    | "Evaluated"
    | "Piloted"
    | "Supplier"
    | "Strategic Partner";
  status: "Discovered" | "Under Review" | "Evaluated" | "Piloting" | "Approved" | "Declined";
  lastEvaluatedAt?: string | undefined;
  aiSummary: string;
  needIds: string[];
  evaluationIds: string[];
  projectIds: string[];
  feedback: EngineerFeedback[];
  external?: boolean | undefined;
}

export interface EvaluationCriterion {
  key: string;
  label: string;
  score: number;
  weight: number;
  comment: string;
  aiAssist?: string | undefined;
}

export interface Evaluation {
  id: string;
  ref: string;
  companyId: string;
  needId: string;
  title: string;
  status: "In Progress" | "Awaiting Feedback" | "Completed";
  leadEvaluatorId: string;
  contributors: string[];
  startedAt: string;
  updatedAt: string;
  criteria: EvaluationCriterion[];
  recommendation: {
    decision: string;
    confidence: "High" | "Medium" | "Low";
    reasons: string[];
  };
  documents: { id: string; name: string; kind: string; source: string; at: string }[];
}

export interface Project {
  id: string;
  ref: string;
  name: string;
  needId: string;
  companyId: string;
  psl: PSL;
  status: "Funded" | "In Field" | "Complete" | "On Hold";
  budget: string;
  startedAt: string;
  location: string;
  summary: string;
  reportIds: string[];
  leadId: string;
}

export interface TestReport {
  id: string;
  ref: string;
  title: string;
  projectId?: string | undefined;
  companyId: string;
  needId: string;
  uploadedBy: string;
  uploadedAt: string;
  source: "SharePoint" | "Azure Blob" | "Lab System";
  summary: string;
  findings: string[];
  outcome: "Pass" | "Conditional Pass" | "Fail";
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  kind: "Scout Note" | "SharePoint Document" | "Presentation" | "Spec" | "Email Thread";
  source: string;
  at: string;
  author: string;
  excerpt: string;
  origin: "internal" | "external";
}

export interface NotificationItem {
  id: string;
  at: string;
  kind: "match" | "stale" | "report" | "activity" | "external";
  title: string;
  body: string;
  entityType: "need" | "company" | "project" | "report";
  entityId: string;
  read: boolean;
}

export interface FollowItem {
  id: string;
  type: "need" | "company" | "topic" | "project";
  entityId: string;
  label: string;
  meta: string;
  since: string;
}
