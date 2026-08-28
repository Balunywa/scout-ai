import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  Building2,
  Check,
  ClipboardCheck,
  FileText,
  MessageSquarePlus,
  Pencil,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge, OriginBadge, Tag, WhyThis } from "@/components/scout/primitives";
import { createNeed, syncCompany, syncNeed, syncReport } from "@/lib/api/client";

export const Route = createFileRoute("/ask")({
  validateSearch: (s: Record<string, unknown>): { q: string } => ({
    q: typeof s["q"] === "string" ? s["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Ask Digital Scout — Contoso" },
      {
        name: "description",
        content:
          "Conversational technology-need intake. Digital Scout searches Contoso's prior scouting work, asks clarifying questions and drafts a structured technology need.",
      },
      { property: "og:title", content: "Ask Digital Scout — Contoso" },
      {
        property: "og:description",
        content: "Turn a technology problem into a structured, traceable technology need.",
      },
    ],
  }),
  component: AskPage,
});

/* ------------------------------------------------------------------ */

type Card =
  | { kind: "need"; id: string }
  | { kind: "company"; id: string }
  | { kind: "report"; id: string };

interface Message {
  id: string;
  role: "user" | "agent";
  agent?: string;
  text: string;
  cards?: Card[];
  gaps?: string[];
  suggestions?: string[];
}

interface Draft {
  problemStatement: string;
  psl: string;
  category: string;
  requirements: string[];
  operatingEnvironment: string;
  constraints: string;
  desiredOutcome: string;
  timeline: string;
  businessImpact: string;
  existingApproaches: string;
  trl: string;
  keywords: string[];
}

const EMPTY_DRAFT: Draft = {
  problemStatement: "",
  psl: "",
  category: "",
  requirements: [],
  operatingEnvironment: "",
  constraints: "",
  desiredOutcome: "",
  timeline: "",
  businessImpact: "",
  existingApproaches: "",
  trl: "",
  keywords: [],
};

const CONVERSATIONS = [
  { id: "conv-1", title: "H₂S coating above 180 °C", meta: "Today · draft in progress" },
  { id: "conv-2", title: "Alternatives to lithium batteries downhole", meta: "Yesterday" },
  { id: "conv-3", title: "Produced water membranes at 200k TDS", meta: "3 days ago" },
  { id: "conv-4", title: "Methane detection vendor comparison", meta: "Last week" },
  { id: "conv-5", title: "Autonomous wellsite inspection landscape", meta: "2 weeks ago" },
];

/** Scripted Need Definition Agent turns. */
const TURNS: {
  agent: string;
  text: string;
  cards?: Card[];
  gaps?: string[];
  draft: Partial<Draft>;
}[] = [
  {
    agent: "Contoso Knowledge Agent",
    text: "I found 7 related technology needs and 12 previous company evaluations touching sour-service coatings above 180 °C. Before creating another request, let's determine whether any of those already address this problem.\n\nThe closest match is NEED-2025-118, owned by Sarah Whitfield, which has four completed evaluations and a coupon test campaign at 180 °C. What pressure and H₂S partial pressure does your application see?",
    cards: [
      { kind: "need", id: "n-h2s-coating" },
      { kind: "company", id: "c-acme-materials" },
      { kind: "company", id: "c-hardide" },
      { kind: "report", id: "rep-coating-coupon" },
    ],
    draft: {
      problemStatement:
        "Downhole tool coating required for H₂S service above 180 °C, where current systems lose adhesion and allow substrate attack.",
      psl: "Drilling & Evaluation",
      category: "Materials & Coatings",
      keywords: ["H2S", "sour service", "coating", "high temperature"],
    },
  },
  {
    agent: "Need Definition Agent",
    text: "Understood — 20,000 psi with 40 psi H₂S partial pressure puts you outside every coupon dataset Contoso holds. Our 2026 campaign stopped at 180 °C and 15 psi H₂S.\n\nTwo more questions: what is the required exposure duration, and are there geometry constraints such as internal bores that rule out line-of-sight deposition?",
    gaps: [
      "No Contoso data at 200 °C with 40 psi H₂S partial pressure",
      "Metallon amorphous coating fails the internal-bore requirement (line-of-sight process)",
    ],
    draft: {
      operatingEnvironment:
        "180 – 210 °C continuous with 230 °C excursion; up to 20,000 psi; 40 psi H₂S partial pressure; brine to 250,000 mg/L Cl⁻",
      requirements: [
        "Continuous operating temperature ≥ 200 °C",
        "NACE TM0177 Method A pass at 40 psi H₂S",
      ],
    },
  },
  {
    agent: "Need Definition Agent",
    text: "That settles the process选 choice: 270 days of exposure with 12 mm internal bores rules out thermal spray and leaves CVD or HVOF with internal-bore tooling.\n\nLast two: what timeline are you working to, and what is the business impact if this stays unsolved?",
    cards: [{ kind: "company", id: "c-hardide" }],
    draft: {
      constraints:
        "Uniform coverage on 12 mm ID bores 300 mm deep; no line-of-sight-only processes; ≤ 150 µm thickness; no post-coat heat treatment above 250 °C",
      requirements: [
        "Continuous operating temperature ≥ 200 °C",
        "NACE TM0177 Method A pass at 40 psi H₂S",
        "270-day continuous exposure with no adhesion loss",
        "Uniform coverage on 12 mm ID bores",
      ],
      existingApproaches:
        "Electroless nickel-phosphorus (fails above 180 °C), hard chrome, Inconel 625 weld overlay (cost and dimensional impact)",
    },
  },
  {
    agent: "Scout Agent",
    text: "Digital Scout has enough information to create this Technology Need.\n\nI have also run an external discovery pass. Two suppliers outside Contoso's evaluated set publish sour-service data in your envelope, and one existing supplier — Acme Advanced Materials — has offered to cost-share an autoclave campaign that would close the exact data gap you have described. On creation I will route this to Marcus Adeyemi, the scout covering materials and coatings, and link it to NEED-2025-118 so the coupon data travels with it.",
    cards: [
      { kind: "company", id: "c-acme-materials" },
      { kind: "company", id: "c-hydrashield" },
      { kind: "need", id: "n-h2-pipeline-coating" },
    ],
    draft: {
      desiredOutcome:
        "A qualified coating system with a named supplier and repeatable application process, validated for 270 days in the defined sour envelope.",
      timeline: "Supplier selected by Q2 2027, field trial the same year.",
      businessImpact:
        "≈ $4.2M/yr in premature tool refurbishment plus customer-visible NPT on sour completions.",
      trl: "TRL 6 — field-representative validation required",
      keywords: ["H2S", "sour service", "coating", "high temperature", "sulphide stress cracking", "downhole tools"],
    },
  },
];

function AskPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [turn, setTurn] = useState(0);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !q) return;
    started.current = true;
    send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: value }]);
    setThinking(true);
    const step = TURNS[Math.min(turn, TURNS.length - 1)]!;
    window.setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          agent: step.agent,
          text: step.text,
          ...(step.cards ? { cards: step.cards } : {}),
          ...(step.gaps ? { gaps: step.gaps } : {}),
        },
      ]);
      setDraft((d) => ({ ...d, ...step.draft }));
      setTurn((t) => t + 1);
    }, 900);
  }

  const complete = turn >= TURNS.length;

  async function create() {
    setCreating(true);
    const need = await createNeed({
      title: "High Temperature H₂S Resistant Coating for Downhole Tools",
      problemStatement: draft.problemStatement,
      psl: "Drilling & Evaluation",
      category: "Materials & Coatings",
      desiredOutcome: draft.desiredOutcome,
      timeline: draft.timeline,
      businessImpact: draft.businessImpact,
      existingApproaches: draft.existingApproaches,
      trlExpectation: draft.trl,
      keywords: draft.keywords,
      constraints: draft.constraints ? draft.constraints.split(";").map((s) => s.trim()) : [],
      operatingEnvironment: { Summary: draft.operatingEnvironment },
      requirements: draft.requirements.map((r, i) => ({
        id: `r${i + 1}`,
        label: r,
        value: "Extracted from conversation",
        critical: i < 3,
      })),
      relatedNeedIds: ["n-h2s-coating", "n-h2-pipeline-coating"],
      aiSummary:
        "Created from an Ask Digital Scout conversation. Linked to NEED-2025-118 so existing coupon data and supplier evaluations travel with this need.",
    });
    toast.success("Technology Need created and routed to Marcus Adeyemi", {
      description: `${need.ref} · you are now following this need`,
    });
    void navigate({ to: "/needs/$needId", params: { needId: need.id } });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      {/* Conversation history */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-surface xl:flex">
        <div className="px-4 py-3.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => {
              setMessages([]);
              setDraft(EMPTY_DRAFT);
              setTurn(0);
              started.current = false;
              void navigate({ to: "/ask", search: { q: "" } });
            }}
          >
            <MessageSquarePlus className="size-4" /> New conversation
          </Button>
        </div>
        <p className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recent
        </p>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
          {CONVERSATIONS.map((c, i) => (
            <button
              key={c.id}
              className={`w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted ${i === 0 ? "bg-muted" : ""}`}
            >
              <p className="truncate text-[13px] font-medium text-foreground">{c.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{c.meta}</p>
            </button>
          ))}
        </nav>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6 lg:px-10">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 ? (
              <div className="pt-10 text-center">
                <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-ai/10">
                  <Sparkles className="size-5 text-ai" />
                </span>
                <h1 className="mt-4 text-[20px] font-semibold tracking-tight">Ask Digital Scout</h1>
                <p className="mx-auto mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
                  Describe the technology problem you are trying to solve. Digital Scout searches what
                  Contoso already knows before anything new is created.
                </p>
                <div className="mx-auto mt-5 grid max-w-xl gap-2 text-left">
                  {[
                    "I need a coating for a downhole tool operating in an H₂S environment above 180 °C.",
                    "Has Contoso evaluated alternatives to lithium batteries for downhole sensors?",
                    "Find companies working on produced-water treatment.",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[13px] text-foreground transition-colors hover:border-ai/40 hover:bg-ai/6"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end gap-3">
                  <div className="max-w-[80%] rounded-lg rounded-tr-sm bg-accent px-3.5 py-2.5 text-[13px] leading-relaxed text-accent-foreground">
                    {m.text}
                  </div>
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="size-3.5" />
                  </span>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-ai/12">
                    <Sparkles className="size-3.5 text-ai" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ai">
                      {m.agent}
                    </p>
                    <div className="whitespace-pre-line text-[13.5px] leading-relaxed text-foreground">
                      {m.text}
                    </div>

                    {m.gaps?.length ? (
                      <div className="mt-3 rounded-md border border-warning/35 bg-warning/10 px-3.5 py-2.5">
                        <p className="text-[12px] font-semibold text-warning-foreground">
                          Gaps between your requirement and previous Contoso work
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {m.gaps.map((g) => (
                            <li key={g} className="text-[12.5px] leading-relaxed text-foreground">
                              · {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {m.cards?.length ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {m.cards.map((c) => (
                          <InlineCard key={`${c.kind}-${c.id}`} card={c} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}

            {thinking ? (
              <div className="flex items-center gap-3 text-[12.5px] text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-md bg-ai/12">
                  <Sparkles className="size-3.5 animate-pulse text-ai" />
                </span>
                Searching Contoso knowledge and prior evaluations…
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border bg-surface px-5 py-3.5 lg:px-10">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Reply to Digital Scout…"
              className="max-h-40 min-h-[44px] resize-none py-2.5 text-[13.5px]"
            />
            <Button size="icon" className="size-11 shrink-0" onClick={() => send(input)}>
              <ArrowUp className="size-4" />
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-[11px] text-muted-foreground">
            Digital Scout cites Contoso sources where possible. Review AI-extracted fields before
            creating a Technology Need.
          </p>
        </div>
      </section>

      {/* Context panel */}
      <aside className="hidden w-[380px] shrink-0 flex-col border-l border-border bg-surface lg:flex">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Technology Need Draft</p>
            <p className="text-[11px] text-muted-foreground">Extracted live by the Need Definition Agent</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={() => setEditing((v) => !v)}>
            <Pencil className="size-3.5" /> {editing ? "Done" : "Edit"}
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          <DraftField
            label="Problem statement"
            value={draft.problemStatement}
            editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, problemStatement: v }))}
            multiline
          />
          <div className="grid grid-cols-2 gap-3">
            <DraftField label="PSL" value={draft.psl} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, psl: v }))} />
            <DraftField
              label="Technology category"
              value={draft.category}
              editing={editing}
              onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Technical requirements
            </p>
            {draft.requirements.length ? (
              <ul className="mt-1 space-y-1">
                {draft.requirements.map((r) => (
                  <li key={r} className="flex gap-1.5 text-[12.5px] leading-relaxed text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12.5px] italic text-muted-foreground">Not yet extracted</p>
            )}
          </div>
          <DraftField
            label="Operating environment"
            value={draft.operatingEnvironment}
            editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, operatingEnvironment: v }))}
            multiline
          />
          <DraftField
            label="Constraints"
            value={draft.constraints}
            editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, constraints: v }))}
            multiline
          />
          <DraftField
            label="Desired outcome"
            value={draft.desiredOutcome}
            editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, desiredOutcome: v }))}
            multiline
          />
          <div className="grid grid-cols-2 gap-3">
            <DraftField label="Timeline" value={draft.timeline} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, timeline: v }))} />
            <DraftField label="Technology readiness" value={draft.trl} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, trl: v }))} />
          </div>
          <DraftField
            label="Business impact"
            value={draft.businessImpact}
            editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, businessImpact: v }))}
            multiline
          />
          <DraftField
            label="Existing approaches"
            value={draft.existingApproaches}
            editing={editing}
            onChange={(v) => setDraft((d) => ({ ...d, existingApproaches: v }))}
            multiline
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Keywords</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {draft.keywords.length ? (
                draft.keywords.map((k) => <Tag key={k}>{k}</Tag>)
              ) : (
                <p className="text-[12.5px] italic text-muted-foreground">Not yet extracted</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          {complete ? (
            <div className="space-y-3">
              <div className="ai-surface rounded-md px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ai">
                  <Sparkles className="size-3.5" /> Digital Scout has enough information to create this
                  Technology Need.
                </p>
                <div className="mt-1.5">
                  <WhyThis
                    confidence="High"
                    signals={[
                      { label: "Extraction coverage", detail: "11 of 12 structured fields extracted from the conversation." },
                      { label: "Duplicate check", detail: "No exact duplicate found; NEED-2025-118 will be linked as related, not merged." },
                      { label: "Routing", detail: "Materials & Coatings scouting is owned by Marcus Adeyemi." },
                    ]}
                    sources={[
                      { label: "NEED-2025-118 — Sour service coating", href: "/needs/n-h2s-coating" },
                      { label: "LAB-2026-034 — Coupon test results", href: "/knowledge?doc=rep-coating-coupon" },
                    ]}
                  />
                </div>
              </div>
              <Button className="w-full" disabled={creating} onClick={() => void create()}>
                {creating ? "Creating…" : "Create Technology Need"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setTurn(TURNS.length - 1)}>
                Continue Refining
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                <span>Draft completeness</span>
                <span className="font-semibold text-foreground">{Math.round((turn / TURNS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-ai transition-all duration-500"
                  style={{ width: `${Math.round((turn / TURNS.length) * 100)}%` }}
                />
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Keep answering Digital Scout's questions. You can create the need manually at any point.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/needs">
                  Use manual entry instead
                </Link>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DraftField({
  label,
  value,
  editing,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {editing ? (
        multiline ? (
          <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 min-h-[70px] text-[12.5px]" />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-8 text-[12.5px]" />
        )
      ) : value ? (
        <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">{value}</p>
      ) : (
        <p className="mt-1 text-[12.5px] italic text-muted-foreground">Not yet extracted</p>
      )}
    </div>
  );
}

function InlineCard({ card }: { card: Card }) {
  if (card.kind === "need") {
    const n = syncNeed(card.id);
    if (!n) return null;
    return (
      <Link
        to="/needs/$needId"
        params={{ needId: n.id }}
        className="panel block p-3 transition-shadow hover:shadow-[var(--shadow-raised)]"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="size-3" /> Related need
        </div>
        <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{n.title}</p>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          {n.ref} · {n.status} · {n.evaluationIds.length} evaluations
        </p>
        <div className="mt-2">
          <OriginBadge origin="internal" />
        </div>
      </Link>
    );
  }
  if (card.kind === "company") {
    const c = syncCompany(card.id);
    if (!c) return null;
    return (
      <Link
        to="/companies/$companyId"
        params={{ companyId: c.id }}
        className="panel block p-3 transition-shadow hover:shadow-[var(--shadow-raised)]"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Building2 className="size-3" /> {c.external ? "Externally discovered" : "Evaluated company"}
        </div>
        <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{c.name}</p>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{c.description}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <OriginBadge origin={c.external ? "external" : "internal"} />
          {c.evaluationIds.length ? <AiBadge>{c.evaluationIds.length} evaluations</AiBadge> : null}
        </div>
      </Link>
    );
  }
  const r = syncReport(card.id);
  if (!r) return null;
  return (
    <a href={`/knowledge?doc=${r.id}`} className="panel block p-3 transition-shadow hover:shadow-[var(--shadow-raised)]">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <FileText className="size-3" /> Test report
      </div>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{r.title}</p>
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{r.summary}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <OriginBadge origin="internal" />
        <Tag>{r.outcome}</Tag>
      </div>
    </a>
  );
}

export const _unusedIcons = { ClipboardCheck };
