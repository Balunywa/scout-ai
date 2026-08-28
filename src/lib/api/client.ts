/**
 * Digital Scout service layer.
 *
 * Every UI surface talks to this module — never to the seed data directly.
 * Each function maps 1:1 to an HTTP route that will be served by the
 * Azure-hosted API layer (Azure Functions / Container Apps) in production:
 *
 *   GET  /api/needs                     listNeeds
 *   GET  /api/needs/{id}                getNeed
 *   POST /api/needs                     createNeed
 *   GET  /api/companies                 listCompanies
 *   GET  /api/companies/{id}            getCompany
 *   GET  /api/evaluations               listEvaluations
 *   GET  /api/evaluations/{id}          getEvaluation
 *   GET  /api/projects                  listProjects
 *   GET  /api/reports                   listReports
 *   GET  /api/search                    search            (Azure AI Search)
 *   POST /api/agents/scout              askScout          (Azure AI Foundry)
 *   POST /api/agents/need-definition    extractNeedDraft
 *   GET  /api/recommendations           getRecommendations
 *   GET  /api/notifications             listNotifications
 *   GET  /api/follows                   listFollows
 *
 * The base URL is environment-driven so the mock adapter can be swapped for
 * the real Azure endpoints without touching any component.
 */

import {
  activity,
  companies,
  currentUserId,
  daysSince,
  evaluations,
  follows,
  knowledgeDocs,
  needs,
  notifications,
  people,
  personById,
  projects,
  reports,
} from "../data/seed";
import type {
  Company,
  Evaluation,
  KnowledgeDoc,
  Project,
  TechnologyNeed,
  TestReport,
} from "../data/types";

export const API_BASE_URL = (import.meta.env["VITE_DIGITAL_SCOUT_API_URL"] as string) ?? "/api";
export const USING_MOCK_ADAPTER = !import.meta.env["VITE_DIGITAL_SCOUT_API_URL"];

/** Simulated network latency so loading states are exercised. */
const latency = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const currentUser = personById(currentUserId)!;

/* -------------------------------------------------------------- needs */

export interface NeedFilters {
  q?: string;
  psl?: string;
  category?: string;
  status?: string;
  scoutId?: string;
  ownerId?: string;
  priority?: string;
  followedByMe?: boolean;
  staleOnly?: boolean;
}

export const STALE_THRESHOLD_DAYS = 120;

export const isStale = (need: TechnologyNeed) =>
  daysSince(need.lastActivityAt) >= STALE_THRESHOLD_DAYS &&
  !["Closed", "Archived"].includes(need.status);

export async function listNeeds(filters: NeedFilters = {}): Promise<TechnologyNeed[]> {
  await latency(80);
  const q = filters.q?.toLowerCase().trim();
  return needs.filter((n) => {
    if (q) {
      const hay = [n.title, n.ref, n.problemStatement, ...n.keywords, n.category, n.psl]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.psl && n.psl !== filters.psl) return false;
    if (filters.category && n.category !== filters.category) return false;
    if (filters.status && n.status !== filters.status) return false;
    if (filters.scoutId && n.scoutId !== filters.scoutId) return false;
    if (filters.ownerId && n.ownerId !== filters.ownerId) return false;
    if (filters.priority && n.strategicPriority !== filters.priority) return false;
    if (filters.followedByMe && !n.followers.includes(currentUserId)) return false;
    if (filters.staleOnly && !isStale(n)) return false;
    return true;
  });
}

export async function getNeed(id: string): Promise<TechnologyNeed | undefined> {
  await latency(60);
  return needs.find((n) => n.id === id);
}

export async function createNeed(draft: Partial<TechnologyNeed>): Promise<TechnologyNeed> {
  await latency(400);
  const created: TechnologyNeed = {
    id: `n-new-${Date.now()}`,
    ref: `NEED-2026-${String(40 + needs.length).padStart(3, "0")}`,
    title: draft.title ?? "Untitled Technology Need",
    psl: draft.psl ?? currentUser.psl,
    category: draft.category ?? "Engineering Technologies",
    status: "Scouting",
    ownerId: currentUserId,
    scoutId: "u-marcus",
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    strategicPriority: draft.strategicPriority ?? "High",
    trlExpectation: draft.trlExpectation ?? "TRL 6",
    followers: [currentUserId],
    problemStatement: draft.problemStatement ?? "",
    businessImpact: draft.businessImpact ?? "",
    operatingEnvironment: draft.operatingEnvironment ?? {},
    constraints: draft.constraints ?? [],
    desiredOutcome: draft.desiredOutcome ?? "",
    timeline: draft.timeline ?? "",
    existingApproaches: draft.existingApproaches ?? "",
    requirements: draft.requirements ?? [],
    keywords: draft.keywords ?? [],
    aiSummary: draft.aiSummary ?? "",
    aiSignals: [],
    companyIds: [],
    evaluationIds: [],
    projectIds: [],
    reportIds: [],
    relatedNeedIds: draft.relatedNeedIds ?? [],
  };
  needs.unshift(created);
  return created;
}

/* ---------------------------------------------------------- companies */

export interface CompanyFilters {
  q?: string;
  domain?: string;
  status?: string;
  country?: string;
  maturity?: string;
  relationship?: string;
}

export async function listCompanies(filters: CompanyFilters = {}): Promise<Company[]> {
  await latency(80);
  const q = filters.q?.toLowerCase().trim();
  return companies.filter((c) => {
    if (q) {
      const hay = [c.name, c.description, c.domain, ...c.technologyAreas].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.domain && c.domain !== filters.domain) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.country && c.country !== filters.country) return false;
    if (filters.maturity && c.maturity !== filters.maturity) return false;
    if (filters.relationship && c.relationship !== filters.relationship) return false;
    return true;
  });
}

export async function getCompany(id: string): Promise<Company | undefined> {
  await latency(60);
  return companies.find((c) => c.id === id);
}

/* -------------------------------------------------------- evaluations */

export async function listEvaluations(): Promise<Evaluation[]> {
  await latency(80);
  return [...evaluations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEvaluation(id: string): Promise<Evaluation | undefined> {
  await latency(60);
  return evaluations.find((e) => e.id === id);
}

/* ------------------------------------------------- projects & reports */

export async function listProjects(): Promise<Project[]> {
  await latency(80);
  return projects;
}

export async function listReports(): Promise<TestReport[]> {
  await latency(80);
  return reports;
}

/* ------------------------------------------------------------ lookups */

export const syncNeed = (id: string) => needs.find((n) => n.id === id);
export const syncCompany = (id: string) => companies.find((c) => c.id === id);
export const syncEvaluation = (id: string) => evaluations.find((e) => e.id === id);
export const syncProject = (id: string) => projects.find((p) => p.id === id);
export const syncReport = (id: string) => reports.find((r) => r.id === id);
export const allPeople = people;
export const allNeeds = needs;
export const allCompanies = companies;
export const allEvaluations = evaluations;
export const allProjects = projects;
export const allReports = reports;
export const allActivity = activity;
export const allKnowledgeDocs = knowledgeDocs;

/* ------------------------------------------------------------- search */

export interface SearchHit {
  id: string;
  type: "need" | "company" | "evaluation" | "project" | "report" | "document" | "person";
  title: string;
  subtitle: string;
  snippet: string;
  origin: "internal" | "external";
  href: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  summary: string;
  citations: { label: string; href: string }[];
  hits: SearchHit[];
}

const tokenise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9₂°\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

function score(text: string, tokens: string[]): number {
  const hay = text.toLowerCase();
  return tokens.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
}

/** Mock of the Azure AI Search semantic + vector query. */
export async function search(query: string): Promise<SearchResponse> {
  await latency(260);
  const tokens = tokenise(query);
  const hits: SearchHit[] = [];

  const push = (h: SearchHit) => {
    if (h.score > 0) hits.push(h);
  };

  for (const n of needs) {
    push({
      id: n.id,
      type: "need",
      title: n.title,
      subtitle: `${n.ref} · ${n.psl} · ${n.status}`,
      snippet: n.problemStatement.slice(0, 220) + "…",
      origin: "internal",
      href: `/needs/${n.id}`,
      score: score([n.title, n.problemStatement, n.keywords.join(" "), n.category].join(" "), tokens) * 1.2,
    });
  }
  for (const c of companies) {
    push({
      id: c.id,
      type: "company",
      title: c.name,
      subtitle: `${c.domain} · ${c.headquarters} · ${c.relationship}`,
      snippet: c.description,
      origin: c.external ? "external" : "internal",
      href: `/companies/${c.id}`,
      score: score([c.name, c.description, c.technologyAreas.join(" "), c.domain].join(" "), tokens),
    });
  }
  for (const e of evaluations) {
    push({
      id: e.id,
      type: "evaluation",
      title: e.title,
      subtitle: `${e.ref} · ${e.status}`,
      snippet: e.recommendation.decision + " — " + e.recommendation.reasons[0],
      origin: "internal",
      href: `/evaluations/${e.id}`,
      score: score([e.title, e.recommendation.decision, e.criteria.map((c) => c.comment).join(" ")].join(" "), tokens),
    });
  }
  for (const p of projects) {
    push({
      id: p.id,
      type: "project",
      title: p.name,
      subtitle: `${p.ref} · ${p.status} · ${p.location}`,
      snippet: p.summary,
      origin: "internal",
      href: `/projects`,
      score: score([p.name, p.summary, p.location].join(" "), tokens),
    });
  }
  for (const r of reports) {
    push({
      id: r.id,
      type: "report",
      title: r.title,
      subtitle: `${r.ref} · ${r.source} · ${r.outcome}`,
      snippet: r.summary,
      origin: "internal",
      href: `/knowledge?doc=${r.id}`,
      score: score([r.title, r.summary, r.findings.join(" ")].join(" "), tokens),
    });
  }
  for (const d of knowledgeDocs) {
    push({
      id: d.id,
      type: "document",
      title: d.title,
      subtitle: `${d.kind} · ${d.source}`,
      snippet: d.excerpt,
      origin: d.origin,
      href: `/knowledge?doc=${d.id}`,
      score: score([d.title, d.excerpt, d.kind].join(" "), tokens) * 0.9,
    });
  }
  for (const p of people) {
    push({
      id: p.id,
      type: "person",
      title: p.name,
      subtitle: `${p.title} · ${p.psl}`,
      snippet: `Expertise: ${p.expertise.join(", ")}`,
      origin: "internal",
      href: `/knowledge?person=${p.id}`,
      score: score(p.expertise.join(" "), tokens) * 0.8,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 40);

  const needCount = top.filter((h) => h.type === "need").length;
  const evalCount = top.filter((h) => h.type === "evaluation").length;
  const companyCount = top.filter((h) => h.type === "company").length;

  const summary = top.length
    ? `Contoso has prior work related to "${query}". Digital Scout found ${needCount} technology need${needCount === 1 ? "" : "s"}, ${companyCount} compan${companyCount === 1 ? "y" : "ies"} and ${evalCount} evaluation${evalCount === 1 ? "" : "s"} in the internal knowledge index. The strongest match is ${top[0]!.title}. Review the internal evidence below before starting new work.`
    : `No indexed Contoso knowledge matched "${query}". Digital Scout can start an external discovery run through the Company Research Agent.`;

  return {
    query,
    summary,
    citations: top.slice(0, 4).map((h) => ({ label: h.title, href: h.href })),
    hits: top,
  };
}

/* ---------------------------------------------- recommendation engine */

export interface CompanyMatch {
  company: Company;
  matchScore: number;
  reasons: string[];
  covered: string[];
  gaps: string[];
  priorInteraction: string;
  risks: string[];
  evidence: { label: string; href: string }[];
}

const MATCH_OVERRIDES: Record<string, Record<string, number>> = {
  "n-h2s-coating": {
    "c-acme-materials": 0.89,
    "c-hardide": 0.74,
    "c-nanoshield": 0.52,
    "c-oerlikon": 0.47,
  },
  "n-ht-sensor": {
    "c-novosense": 0.92,
    "c-sensatek": 0.88,
    "c-terraheat": 0.74,
    "c-permatrace": 0.51,
    "c-voltcore": 0.44,
  },
  "n-produced-water": { "c-aquarecover": 0.86, "c-osmoflux": 0.63, "c-brineloop": 0.41 },
  "n-methane": { "c-methaview": 0.94, "c-orbitalscan": 0.58 },
  "n-h2-pipeline-coating": {
    "c-hydrashield": 0.81,
    "c-acme-materials": 0.69,
    "c-hardide": 0.66,
    "c-veritasndt": 0.44,
  },
  "n-autonomous-inspection": { "c-rovion": 0.83, "c-skyward": 0.71 },
  "n-energy-storage": { "c-voltcore": 0.79, "c-thermacell": 0.62 },
  "n-subsea-power": { "c-subseavolt": 0.9, "c-arcflow": 0.55 },
  "n-carbon-capture": { "c-carbonmesh": 0.77 },
  "n-drilling-automation": { "c-drillmind": 0.72, "c-strataloop": 0.68 },
  "n-cement-additives": { "c-mineralbind": 0.84 },
  "n-well-integrity": { "c-veritasndt": 0.7, "c-permatrace": 0.64 },
  "n-rapid-core": { "c-coreiq": 0.66 },
};

/** Mock of /api/recommendations, backed by the Evaluation + Company agents. */
export async function getRecommendations(needId: string): Promise<CompanyMatch[]> {
  await latency(200);
  const need = needs.find((n) => n.id === needId);
  if (!need) return [];
  const overrides = MATCH_OVERRIDES[needId] ?? {};

  return need.companyIds
    .map((cid) => {
      const company = companies.find((c) => c.id === cid)!;
      const base = overrides[cid] ?? 0.5;
      const evals = evaluations.filter((e) => e.companyId === cid && e.needId === needId);
      const criticalReqs = need.requirements.filter((r) => r.critical);
      const coveredCount = Math.round(base * criticalReqs.length);
      const covered = criticalReqs.slice(0, coveredCount).map((r) => r.label);
      const gaps = criticalReqs.slice(coveredCount).map((r) => r.label);

      const reasons: string[] = [];
      if (company.maturity === "Commercial" || company.maturity === "Scaled")
        reasons.push(`${company.maturity} technology maturity reduces qualification risk`);
      reasons.push(`${company.technologyAreas[0]} directly addresses the primary requirement`);
      if (evals.length)
        reasons.push(`Existing Contoso evaluation (${evals[0]!.ref}) with recorded results`);
      if (company.external) reasons.push("Newly discovered externally — no Contoso history yet");

      const risks: string[] = [];
      const lowest = [...(evals[0]?.criteria ?? [])].sort((a, b) => a.score - b.score)[0];
      if (lowest) risks.push(`${lowest.label}: ${lowest.comment}`);
      if (gaps.length) risks.push(`${gaps.length} critical requirement(s) unproven`);
      if (!evals.length) risks.push("No Contoso evaluation on record");

      return {
        company,
        matchScore: Math.round(base * 100),
        reasons,
        covered,
        gaps,
        priorInteraction:
          company.relationship === "None"
            ? "No prior Contoso interaction"
            : `${company.relationship}${company.lastEvaluatedAt ? ` · last evaluated ${daysSince(company.lastEvaluatedAt)} days ago` : ""}`,
        risks,
        evidence: [
          ...evals.map((e) => ({ label: `${e.ref} — ${e.title}`, href: `/evaluations/${e.id}` })),
          ...reports
            .filter((r) => r.companyId === cid)
            .map((r) => ({ label: `${r.ref} — ${r.title}`, href: `/knowledge?doc=${r.id}` })),
        ],
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/* -------------------------------------------------- notifications etc */

export async function listNotifications() {
  await latency(60);
  return notifications;
}

export async function listFollows() {
  await latency(60);
  return follows;
}

export function knowledgeResurfaced() {
  return {
    headline: "Contoso evaluated 4 companies addressing similar requirements in 2023–2026.",
    detail:
      "Your sour-service coating need overlaps with the hydrogen coating programme in Testing & Subsea. Two suppliers appear in both, and coupon data already exists at 180 °C.",
    needId: "n-h2s-coating",
  };
}

/** Traceability lineage for /api/needs/{id}/journey. */
export interface JourneyStage {
  key: string;
  label: string;
  state: "complete" | "active" | "pending";
  items: { title: string; meta: string; href?: string }[];
}

export function getJourney(needId: string): JourneyStage[] {
  const need = needs.find((n) => n.id === needId);
  if (!need) return [];
  const needEvals = evaluations.filter((e) => need.evaluationIds.includes(e.id));
  const needProjects = projects.filter((p) => need.projectIds.includes(p.id));
  const needReports = reports.filter((r) => r.needId === need.id);
  const order: Record<string, number> = {
    Draft: 0,
    Scouting: 1,
    "Companies Identified": 2,
    Evaluation: 3,
    "Pilot / Test": 4,
    Project: 5,
    Closed: 6,
    Archived: 6,
  };
  const idx = order[need.status] ?? 0;
  const state = (stage: number): JourneyStage["state"] =>
    idx > stage ? "complete" : idx === stage ? "active" : "pending";

  return [
    {
      key: "need",
      label: "Technology Need",
      state: "complete",
      items: [{ title: need.title, meta: `${need.ref} · created ${daysSince(need.createdAt)} days ago`, href: `/needs/${need.id}` }],
    },
    {
      key: "companies",
      label: "Candidate Companies",
      state: need.companyIds.length ? (idx >= 3 ? "complete" : "active") : "pending",
      items: need.companyIds.map((cid) => {
        const c = companies.find((x) => x.id === cid)!;
        return { title: c.name, meta: `${c.relationship} · ${c.maturity}`, href: `/companies/${c.id}` };
      }),
    },
    {
      key: "evaluation",
      label: "Evaluation",
      state: needEvals.length ? (idx >= 4 ? "complete" : "active") : state(3),
      items: needEvals.map((e) => ({
        title: e.title,
        meta: `${e.ref} · ${e.status} · ${e.recommendation.decision}`,
        href: `/evaluations/${e.id}`,
      })),
    },
    {
      key: "project",
      label: "Project / Field Test",
      state: needProjects.length ? (idx >= 5 ? "complete" : "active") : "pending",
      items: needProjects.map((p) => ({
        title: p.name,
        meta: `${p.ref} · ${p.status} · ${p.budget} · ${p.location}`,
        href: `/projects`,
      })),
    },
    {
      key: "report",
      label: "Test Report",
      state: needReports.length ? "complete" : "pending",
      items: needReports.map((r) => ({
        title: r.title,
        meta: `${r.ref} · ${r.outcome} · ${r.source}`,
        href: `/knowledge?doc=${r.id}`,
      })),
    },
    {
      key: "outcome",
      label: "Outcome",
      state: need.status === "Project" || need.status === "Closed" ? "complete" : "pending",
      items:
        need.status === "Project"
          ? [{ title: "Technology approved for service-line integration", meta: "Recorded by the PSL leader" }]
          : need.status === "Closed"
            ? [{ title: "Closed with recorded rationale", meta: need.aiSummary.slice(0, 120) + "…" }]
            : [{ title: "Outcome pending", meta: "No adoption decision recorded yet" }],
    },
  ];
}
