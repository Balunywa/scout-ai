import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileText,
  FlaskConical,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AiBadge,
  CompanyGlyph,
  Field,
  OriginBadge,
  SectionHeader,
  StatusPill,
  Tag,
  WhyThis,
  ageLabel,
} from "@/components/scout/primitives";
import {
  allActivity,
  getJourney,
  getRecommendations,
  isStale,
  syncCompany,
  syncEvaluation,
  syncNeed,
  syncReport,
} from "@/lib/api/client";
import { personName } from "@/lib/data/seed";

export const Route = createFileRoute("/needs/$needId")({
  loader: ({ params }) => {
    const need = syncNeed(params.needId);
    if (!need) throw notFound();
    return { title: need.title, ref: need.ref, summary: need.problemStatement };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Technology Need"} — Digital Scout` },
      { name: "description", content: (loaderData?.summary ?? "").slice(0, 155) },
      { property: "og:title", content: `${loaderData?.ref ?? ""} ${loaderData?.title ?? ""}`.trim() },
      { property: "og:description", content: (loaderData?.summary ?? "").slice(0, 155) },
    ],
  }),
  component: NeedDetail,
});

function NeedDetail() {
  const { needId } = Route.useParams();
  const need = syncNeed(needId)!;
  const { data: matches = [] } = useQuery({
    queryKey: ["recommendations", needId],
    queryFn: () => getRecommendations(needId),
  });
  const journey = getJourney(needId);
  const timeline = allActivity.filter(
    (a) =>
      a.entityId === needId ||
      need.evaluationIds.includes(a.entityId ?? "") ||
      need.companyIds.includes(a.entityId ?? "") ||
      need.projectIds.includes(a.entityId ?? ""),
  );

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/needs" className="hover:text-foreground">
          Technology Needs
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{need.ref}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={need.status} />
            <Tag>{need.category}</Tag>
            <Tag>{need.psl}</Tag>
            <Tag>{need.strategicPriority} priority</Tag>
            {isStale(need) ? <AiBadge tone="warn">No activity in {ageLabel(need.lastActivityAt)}</AiBadge> : null}
          </div>
          <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight text-foreground">
            {need.title}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{need.problemStatement}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast.success(`Following ${need.ref}`, { description: "You'll be notified of new matches, evaluations and reports." })}
          >
            <Bell className="size-4" /> Follow
          </Button>
          <Button asChild className="gap-1.5">
            <Link to="/ask" search={{ q: `Tell me about ${need.ref}: ${need.title}` }}>
              <Sparkles className="size-4" /> Ask about this need
            </Link>
          </Button>
        </div>
      </header>

      {/* AI summary */}
      <section className="panel ai-surface mt-5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ai">Digital Scout summary</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{need.aiSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {need.aiSignals.map((s) => (
                <div key={s.label} className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-[12px] font-semibold text-foreground">{s.label}</p>
                  <p className="mt-0.5 max-w-xs text-[11.5px] leading-relaxed text-muted-foreground">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          {/* Requirements */}
          <section>
            <SectionHeader title="Requirements and environment" />
            <div className="panel p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Desired outcome">{need.desiredOutcome}</Field>
                <Field label="Business impact">{need.businessImpact}</Field>
                <Field label="Timeline">{need.timeline}</Field>
                <Field label="Technology readiness">{need.trlExpectation}</Field>
                <Field label="Existing approaches">{need.existingApproaches}</Field>
                <Field label="Constraints">
                  <ul className="space-y-0.5">
                    {need.constraints.map((c) => (
                      <li key={c}>· {c}</li>
                    ))}
                  </ul>
                </Field>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Operating environment
                </p>
                <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {Object.entries(need.operatingEnvironment).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-dashed border-border pb-1">
                      <dt className="text-[12.5px] text-muted-foreground">{k}</dt>
                      <dd className="text-right text-[12.5px] font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Technical requirements
                </p>
                <ul className="mt-2 space-y-1.5">
                  {need.requirements.map((r) => (
                    <li key={r.id} className="flex items-start gap-2">
                      {r.critical ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      ) : (
                        <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-[12.5px] leading-relaxed text-foreground">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground"> — {r.value}</span>
                        {r.critical ? <span className="ml-1.5 text-[11px] font-semibold text-primary">Critical</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Matched companies */}
          <section>
            <SectionHeader
              title="AI-matched companies"
              description="Ranked by the Company Matching Agent against critical requirements, prior Contoso evidence and supplier maturity."
            />
            <div className="space-y-2.5">
              {matches.map((m) => (
                <article key={m.company.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <CompanyGlyph name={m.company.name} />
                      <div className="min-w-0">
                        <Link
                          to="/companies/$companyId"
                          params={{ companyId: m.company.id }}
                          className="text-[14px] font-semibold text-foreground hover:text-primary"
                        >
                          {m.company.name}
                        </Link>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {m.company.headquarters} · {m.company.maturity} · {m.company.employees} employees
                        </p>
                        <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
                          {m.company.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[22px] font-semibold leading-none text-primary">{m.matchScore}%</p>
                      <p className="text-[11px] text-muted-foreground">match</p>
                      <div className="mt-1.5">
                        <OriginBadge origin={m.company.external ? "external" : "internal"} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-success">
                        Requirements covered
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {m.covered.length ? (
                          m.covered.map((c) => (
                            <li key={c} className="flex gap-1.5 text-[12px] text-foreground">
                              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-success" /> {c}
                            </li>
                          ))
                        ) : (
                          <li className="text-[12px] italic text-muted-foreground">None confirmed</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-foreground">
                        Gaps
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {m.gaps.length ? (
                          m.gaps.map((g) => (
                            <li key={g} className="flex gap-1.5 text-[12px] text-foreground">
                              <XCircle className="mt-0.5 size-3 shrink-0 text-warning-foreground" /> {g}
                            </li>
                          ))
                        ) : (
                          <li className="text-[12px] italic text-muted-foreground">No open gaps</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Prior interaction
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-foreground">{m.priorInteraction}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {m.risks.map((r) => (
                          <li key={r} className="text-[11.5px] leading-relaxed text-muted-foreground">
                            Risk: {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <WhyThis
                      confidence={m.matchScore > 75 ? "High" : m.matchScore > 55 ? "Medium" : "Low"}
                      signals={m.reasons.map((r) => ({ label: "Match signal", detail: r }))}
                      sources={m.evidence}
                    />
                    <Button asChild size="sm" variant="outline" className="h-8">
                      <Link to="/companies/$companyId" params={{ companyId: m.company.id }}>
                        Company profile
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        toast.success(`Evaluation started for ${m.company.name}`, {
                          description: "Draft evaluation created with criteria pre-filled from this need.",
                        })
                      }
                    >
                      Start evaluation
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Evaluations */}
          <section>
            <SectionHeader title="Evaluations" description="Structured assessments linked to this need." />
            <div className="grid gap-2.5 md:grid-cols-2">
              {need.evaluationIds.map((id) => {
                const e = syncEvaluation(id);
                if (!e) return null;
                const total = e.criteria.reduce((a, c) => a + c.score * c.weight, 0) / 100;
                return (
                  <Link
                    key={id}
                    to="/evaluations/$evaluationId"
                    params={{ evaluationId: id }}
                    className="panel block p-4 transition-shadow hover:shadow-[var(--shadow-raised)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">{e.title}</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {e.ref} · {personName(e.leadEvaluatorId)} · {ageLabel(e.updatedAt)}
                        </p>
                      </div>
                      <span className="text-[18px] font-semibold text-foreground">{total.toFixed(1)}</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={e.status} />
                      <Tag>{e.recommendation.decision}</Tag>
                    </div>
                  </Link>
                );
              })}
              {need.evaluationIds.length === 0 ? (
                <p className="panel p-4 text-[13px] text-muted-foreground">
                  No evaluations yet. Start one from a matched company above.
                </p>
              ) : null}
            </div>
          </section>

          {/* Reports */}
          {need.reportIds.length ? (
            <section>
              <SectionHeader title="Test reports and field data" />
              <div className="space-y-2.5">
                {need.reportIds.map((id) => {
                  const r = syncReport(id);
                  if (!r) return null;
                  return (
                    <article key={id} className="panel p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                            <FileText className="size-3.5 text-muted-foreground" /> {r.title}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {r.ref} · {r.source} · uploaded by {r.uploadedBy} · {ageLabel(r.uploadedAt)}
                          </p>
                        </div>
                        <StatusPill status={r.outcome} />
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{r.summary}</p>
                      <ul className="mt-2 space-y-0.5">
                        {r.findings.map((f) => (
                          <li key={f} className="text-[12.5px] leading-relaxed text-foreground">
                            · {f}
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        {/* Rail */}
        <aside className="space-y-6">
          <section>
            <SectionHeader title="Traceability" description="Need → Company → Evaluation → Project → Report." />
            <div className="panel p-4">
              <ol className="space-y-4">
                {journey.map((stage, i) => (
                  <li key={stage.key} className="relative pl-6">
                    {i < journey.length - 1 ? (
                      <span className="absolute left-[7px] top-4 h-full w-px bg-border" />
                    ) : null}
                    <span
                      className={`absolute left-0 top-1 flex size-3.5 items-center justify-center rounded-full border-2 ${
                        stage.state === "complete"
                          ? "border-success bg-success"
                          : stage.state === "active"
                            ? "border-primary bg-surface"
                            : "border-border bg-surface"
                      }`}
                    />
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {stage.label}
                    </p>
                    <div className="mt-1 space-y-1.5">
                      {stage.items.length ? (
                        stage.items.map((it) => (
                          <div key={it.title}>
                            {it.href ? (
                              <a href={it.href} className="text-[12.5px] font-medium text-foreground hover:text-primary">
                                {it.title}
                              </a>
                            ) : (
                              <p className="text-[12.5px] font-medium text-foreground">{it.title}</p>
                            )}
                            <p className="text-[11.5px] text-muted-foreground">{it.meta}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[12px] italic text-muted-foreground">Not reached yet</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section>
            <SectionHeader title="People" />
            <div className="panel space-y-2 p-4 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium text-foreground">{personName(need.ownerId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scout</span>
                <span className="font-medium text-foreground">{personName(need.scoutId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Followers</span>
                <span className="font-medium text-foreground">{need.followers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium text-foreground">{ageLabel(need.createdAt)}</span>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader title="Related needs" />
            <div className="panel divide-y divide-border">
              {need.relatedNeedIds.length ? (
                need.relatedNeedIds.map((id) => {
                  const r = syncNeed(id);
                  if (!r) return null;
                  return (
                    <Link
                      key={id}
                      to="/needs/$needId"
                      params={{ needId: id }}
                      className="flex gap-2.5 px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium leading-snug text-foreground">{r.title}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {r.ref} · {r.status}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="px-4 py-3 text-[12.5px] text-muted-foreground">No related needs identified.</p>
              )}
            </div>
          </section>

          {need.projectIds.length ? (
            <section>
              <SectionHeader title="Projects" />
              <div className="panel divide-y divide-border">
                {need.projectIds.map((id) => (
                  <Link key={id} to="/projects" className="flex gap-2.5 px-4 py-3 hover:bg-muted/60">
                    <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-[12.5px] text-foreground">{id}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionHeader title="Activity" />
            <div className="panel divide-y divide-border">
              {timeline.slice(0, 8).map((a) => (
                <div key={a.id} className="px-4 py-2.5">
                  <p className="text-[12.5px] leading-snug text-foreground">{a.summary}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {a.actor} · {ageLabel(a.at)}
                  </p>
                </div>
              ))}
              {timeline.length === 0 ? (
                <p className="px-4 py-3 text-[12.5px] text-muted-foreground">No recorded activity.</p>
              ) : null}
            </div>
          </section>

          <section>
            <SectionHeader title="Candidate companies" />
            <div className="panel divide-y divide-border">
              {need.companyIds.map((id) => {
                const c = syncCompany(id);
                if (!c) return null;
                return (
                  <Link
                    key={id}
                    to="/companies/$companyId"
                    params={{ companyId: id }}
                    className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/60"
                  >
                    <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{c.name}</span>
                    <OriginBadge origin={c.external ? "external" : "internal"} />
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
