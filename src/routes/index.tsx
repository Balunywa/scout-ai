import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileText,
  FlaskConical,
  History,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AiBadge,
  PageHeader,
  SectionHeader,
  StatusPill,
  Tag,
  WhyThis,
  ageLabel,
} from "@/components/scout/primitives";
import {
  allActivity,
  allNeeds,
  currentUser,
  isStale,
  knowledgeResurfaced,
  syncCompany,
  syncEvaluation,
} from "@/lib/api/client";
import { daysSince, personName } from "@/lib/data/seed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Scout Dashboard — Digital Scout" },
      {
        name: "description",
        content:
          "Personalised technology scouting workspace: needs requiring attention, AI recommendations, resurfaced Halliburton knowledge and recent lifecycle activity.",
      },
      { property: "og:title", content: "My Scout Dashboard — Digital Scout" },
      {
        property: "og:description",
        content: "Start from a technology problem and let Digital Scout find what Halliburton already knows.",
      },
    ],
  }),
  component: Dashboard,
});

const SUGGESTIONS = [
  "We need a coating that can survive high-temperature H₂S environments.",
  "Has Halliburton evaluated alternatives to lithium batteries for downhole sensors?",
  "Find companies working on produced-water treatment.",
  "What technologies have we evaluated for methane detection?",
  "Show me technologies related to autonomous wellsite operations.",
];

const ACTIVITY_ICON: Record<string, typeof Target> = {
  "evaluation-completed": ClipboardCheck,
  "feedback-added": ClipboardCheck,
  "company-matched": Building2,
  "report-uploaded": FileText,
  "status-changed": Target,
  "external-signal": TrendingUp,
  "need-created": Target,
  "project-funded": FlaskConical,
};

function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const mine = allNeeds
    .filter((n) => n.ownerId === currentUser.id || n.followers.includes(currentUser.id))
    .sort((a, b) => daysSince(b.lastActivityAt) - daysSince(a.lastActivityAt))
    .slice(0, 5);

  const resurfaced = knowledgeResurfaced();

  const recommended = [
    {
      kind: "Company",
      title: "TerraHeat Instruments",
      meta: "Sensors · Iceland · 300 °C geothermal logging electronics",
      href: "/companies/c-terraheat",
      why: [
        {
          label: "Matches your expertise",
          detail: "You are followed on high-temperature materials and own two related needs.",
        },
        {
          label: "Newly discovered",
          detail: "Surfaced by the Company Research Agent from geothermal literature 2 days ago.",
        },
      ],
    },
    {
      kind: "Evaluation",
      title: "Hardide Coatings — CVD tungsten carbide for internal geometries",
      meta: "EVL-2025-311 · Completed · Hold pending hydrogen embrittlement data",
      href: "/evaluations/e-hardide-1",
      why: [
        {
          label: "Requirement overlap",
          detail: "Shares 6 of 9 requirements with the need you own, NEED-2025-118.",
        },
        { label: "Unblocked by", detail: "NEED-2026-031 is seeking the exact screening method this evaluation waits on." },
      ],
    },
    {
      kind: "Technology Need",
      title: "Hydrogen Resistant Pipeline and Wellhead Coatings",
      meta: "NEED-2026-014 · Scouting · Testing & Subsea",
      href: "/needs/n-h2-pipeline-coating",
      why: [
        { label: "Same technology category", detail: "Materials & Coatings, with two shared candidate suppliers." },
        { label: "Cross-PSL reuse", detail: "Your sour-service coupon data is directly reusable here." },
      ],
    },
  ];

  const submit = () => {
    const q = prompt.trim();
    if (!q) return;
    void navigate({ to: "/ask", search: { q } });
  };

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow={`${currentUser.psl} · ${currentUser.title}`}
        title={`Good morning, ${currentUser.name.split(" ")[0]}`}
        description="What technology problem are you trying to solve?"
      />

      {/* AI intake */}
      <section className="mt-5">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-ai/6 px-4 py-2.5">
            <Sparkles className="size-4 text-ai" />
            <p className="text-[13px] font-semibold text-ai">Digital Scout</p>
            <p className="text-[12px] text-muted-foreground">
              Orchestrator agent · connected to Halliburton knowledge and external discovery
            </p>
          </div>
          <div className="p-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="Describe a technology challenge, search for something Halliburton has evaluated, or ask Digital Scout a question…"
              className="min-h-[92px] resize-none border-0 bg-transparent p-0 text-[14px] shadow-none focus-visible:ring-0"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void navigate({ to: "/ask", search: { q: s } })}
                    className="rounded-full border border-border bg-muted/70 px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-ai/40 hover:bg-ai/8 hover:text-ai"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button onClick={submit} className="gap-1.5">
                Ask Digital Scout <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          {/* Needs requiring attention */}
          <section>
            <SectionHeader
              title="Needs requiring attention"
              description="Technology needs you own or follow, ranked by how long they have been quiet."
              action={
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link to="/needs">View all needs <ArrowRight className="size-3.5" /></Link>
                </Button>
              }
            />
            <div className="space-y-2.5">
              {mine.map((n) => {
                const stale = isStale(n);
                return (
                  <article key={n.id} className="panel px-4 py-3.5 transition-shadow hover:shadow-[var(--shadow-raised)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to="/needs/$needId"
                          params={{ needId: n.id }}
                          className="text-[14px] font-semibold text-foreground hover:text-primary"
                        >
                          {n.title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">{n.ref}</span>
                          <span>·</span>
                          <span>{n.psl}</span>
                          <span>·</span>
                          <Tag>{n.category}</Tag>
                          <span>·</span>
                          <span>Scout: {personName(n.scoutId)}</span>
                          <span>·</span>
                          <span>Owner: {personName(n.ownerId)}</span>
                        </div>
                      </div>
                      <StatusPill status={n.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                        <span>
                          Last meaningful activity:{" "}
                          <span className={stale ? "font-semibold text-warning-foreground" : "text-foreground"}>
                            {daysSince(n.lastActivityAt)} days ago
                          </span>
                        </span>
                        <span>· Age {Math.round(daysSince(n.createdAt) / 30)} months</span>
                        {stale ? (
                          <>
                            <AiBadge tone="warn">Potentially stale</AiBadge>
                            <WhyThis
                              confidence="High"
                              signals={[
                                {
                                  label: "No activity signal",
                                  detail: `Last lifecycle event was ${daysSince(n.lastActivityAt)} days ago, past the 120-day threshold for this category.`,
                                },
                                {
                                  label: "Requirement still valid",
                                  detail: n.aiSummary.slice(0, 160) + "…",
                                },
                              ]}
                              sources={[{ label: `${n.ref} activity timeline`, href: `/needs/${n.id}` }]}
                            />
                          </>
                        ) : null}
                      </div>
                      <Button asChild size="sm" variant={stale ? "default" : "outline"} className="h-8 gap-1.5">
                        <Link to="/needs/$needId" params={{ needId: n.id }}>
                          <Sparkles className="size-3.5" />
                          {stale ? "Review with Digital Scout" : "Open workspace"}
                        </Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Recommended */}
          <section>
            <SectionHeader
              title="Recommended for you"
              description="Generated from your PSL, expertise, followed topics and recent activity."
            />
            <div className="grid gap-2.5 md:grid-cols-3">
              {recommended.map((r) => (
                <article key={r.title} className="panel flex flex-col p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.kind}
                  </span>
                  <a
                    href={r.href}
                    className="mt-1.5 text-[13px] font-semibold leading-snug text-foreground hover:text-primary"
                  >
                    {r.title}
                  </a>
                  <p className="mt-1 flex-1 text-[12px] leading-relaxed text-muted-foreground">{r.meta}</p>
                  <div className="mt-3">
                    <WhyThis signals={r.why} confidence="Medium" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Knowledge resurfaced */}
          <section>
            <SectionHeader
              title="Knowledge resurfaced"
              description="Older Halliburton work that is relevant to what you are doing now."
            />
            <div className="panel ai-surface p-4">
              <div className="flex items-start gap-3">
                <History className="mt-0.5 size-4 shrink-0 text-ai" />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground">{resurfaced.headline}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{resurfaced.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="h-8">
                      <Link to="/needs/$needId" params={{ needId: resurfaced.needId }}>
                        View previous evaluations
                      </Link>
                    </Button>
                    <WhyThis
                      confidence="High"
                      signals={[
                        {
                          label: "Semantic similarity",
                          detail:
                            "Requirement vectors for NEED-2025-118 and NEED-2026-014 overlap at 0.83 cosine similarity in the Azure AI Search index.",
                        },
                        {
                          label: "Shared suppliers",
                          detail: "Acme Advanced Materials and Hardide Coatings appear as candidates on both needs.",
                        },
                      ]}
                      sources={[
                        { label: "EVL-2026-042 — Acme cermet coating", href: "/evaluations/e-acme-1" },
                        { label: "LAB-2026-034 — Coupon test results", href: "/knowledge?doc=rep-coating-coupon" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Activity rail */}
        <aside>
          <SectionHeader title="Activity" description="Across needs, companies and projects you follow." />
          <div className="panel divide-y divide-border">
            {allActivity.slice(0, 10).map((ev) => {
              const Icon = ACTIVITY_ICON[ev.type] ?? Target;
              const href =
                ev.entityType === "need"
                  ? `/needs/${ev.entityId}`
                  : ev.entityType === "evaluation"
                    ? `/evaluations/${ev.entityId}`
                    : ev.entityType === "project"
                      ? "/projects"
                      : `/knowledge?doc=${ev.entityId}`;
              return (
                <a key={ev.id} href={href} className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug text-foreground">{ev.summary}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {ev.actor} · {ageLabel(ev.at)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="panel mt-4 p-4">
            <p className="text-[13px] font-semibold text-foreground">Portfolio at a glance</p>
            <dl className="mt-2.5 space-y-1.5 text-[12px]">
              {[
                ["Technology needs", String(allNeeds.length)],
                ["Evaluated companies", "563"],
                ["Evaluations in progress", "17"],
                ["Technologies in pilot", "9"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-border pt-3 text-[12px] italic leading-relaxed text-muted-foreground">
              Halliburton should never have to rediscover what Halliburton already knows.
            </p>
          </div>
        </aside>
      </div>

      <p className="sr-only">
        {syncCompany("c-acme-materials")?.name} {syncEvaluation("e-acme-1")?.ref}
      </p>
    </div>
  );
}
