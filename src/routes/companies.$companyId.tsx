import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, Globe, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  CompanyGlyph,
  Field,
  OriginBadge,
  SectionHeader,
  StatusPill,
  Tag,
  WhyThis,
  ageLabel,
} from "@/components/scout/primitives";
import { syncCompany, syncEvaluation, syncNeed, allReports } from "@/lib/api/client";
import { personName } from "@/lib/data/seed";

export const Route = createFileRoute("/companies/$companyId")({
  loader: ({ params }) => {
    const c = syncCompany(params.companyId);
    if (!c) throw notFound();
    return { name: c.name, description: c.description };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Company"} — Digital Scout` },
      { name: "description", content: (loaderData?.description ?? "").slice(0, 155) },
      { property: "og:title", content: `${loaderData?.name ?? "Company"} — Digital Scout` },
      { property: "og:description", content: (loaderData?.description ?? "").slice(0, 155) },
    ],
  }),
  component: CompanyDetail,
});

function CompanyDetail() {
  const { companyId } = Route.useParams();
  const c = syncCompany(companyId)!;
  const reports = allReports.filter((r) => r.companyId === companyId);
  const avg =
    c.feedback.length > 0
      ? c.feedback.reduce((a, f) => a + f.rating, 0) / c.feedback.length
      : 0;

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/companies" className="hover:text-foreground">
          Companies
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{c.name}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <CompanyGlyph name={c.name} className="size-12 text-[15px]" />
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={c.status} />
              <Tag>{c.domain}</Tag>
              <Tag>{c.maturity}</Tag>
              <OriginBadge origin={c.external ? "external" : "internal"} />
            </div>
            <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight text-foreground">
              {c.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted-foreground">
              <Globe className="size-3.5" /> {c.website} · {c.headquarters} · founded {c.founded} ·{" "}
              {c.employees} employees
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{c.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast.success(`Following ${c.name}`)}
          >
            Follow
          </Button>
          <Button
            className="gap-1.5"
            onClick={() =>
              toast.success("Evaluation draft created", {
                description: `Criteria pre-filled from linked needs for ${c.name}.`,
              })
            }
          >
            Start evaluation
          </Button>
        </div>
      </header>

      <section className="panel ai-surface mt-5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ai">
              Digital Scout company profile
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{c.aiSummary}</p>
            <div className="mt-2.5">
              <WhyThis
                confidence="Medium"
                signals={[
                  {
                    label: "Sources synthesised",
                    detail:
                      "Public technical literature, supplier datasheets, Contoso evaluation records and engineer feedback.",
                  },
                  {
                    label: "Relationship",
                    detail: `${c.relationship}${c.lastEvaluatedAt ? ` · last evaluated ${ageLabel(c.lastEvaluatedAt)}` : ""}`,
                  },
                ]}
                sources={c.evaluationIds.map((id) => ({
                  label: syncEvaluation(id)?.ref ?? id,
                  href: `/evaluations/${id}`,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          <section>
            <SectionHeader title="Technology areas" />
            <div className="panel p-4">
              <div className="flex flex-wrap gap-1.5">
                {c.technologyAreas.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
              <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <Field label="Relationship">{c.relationship}</Field>
                <Field label="Maturity">{c.maturity}</Field>
                <Field label="Country">{c.country}</Field>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader
              title="Evaluations"
              description="Every structured assessment Contoso has run on this company."
            />
            <div className="space-y-2.5">
              {c.evaluationIds.length ? (
                c.evaluationIds.map((id) => {
                  const e = syncEvaluation(id);
                  if (!e) return null;
                  const total = e.criteria.reduce((a, x) => a + x.score * x.weight, 0) / 100;
                  return (
                    <Link
                      key={id}
                      to="/evaluations/$evaluationId"
                      params={{ evaluationId: id }}
                      className="panel block p-4 transition-shadow hover:shadow-[var(--shadow-raised)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-foreground">{e.title}</p>
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {e.ref} · lead {personName(e.leadEvaluatorId)} · updated {ageLabel(e.updatedAt)}
                          </p>
                          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                            Recommendation: <span className="text-foreground">{e.recommendation.decision}</span>{" "}
                            ({e.recommendation.confidence} confidence)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[20px] font-semibold text-foreground">{total.toFixed(1)}</p>
                          <StatusPill status={e.status} />
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="panel p-4 text-[13px] text-muted-foreground">
                  No Contoso evaluation on record for this company yet.
                </p>
              )}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Engineer feedback"
              description="Field and lab experience captured across PSLs — the reuse layer that stops rediscovery."
              action={
                c.feedback.length ? (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-foreground">
                    <Star className="size-3.5 fill-warning text-warning" /> {avg.toFixed(1)} / 5
                  </span>
                ) : null
              }
            />
            <div className="space-y-2.5">
              {c.feedback.length ? (
                c.feedback.map((f) => (
                  <article key={f.id} className="panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-foreground">
                        {f.author} <span className="font-normal text-muted-foreground">· {f.psl}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${i < f.rating ? "fill-warning text-warning" : "text-border"}`}
                          />
                        ))}
                        <span className="ml-1.5 text-[11.5px] text-muted-foreground">{ageLabel(f.at)}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground">{f.comment}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                      <ExternalLink className="size-3" /> {f.sourceLabel}
                    </p>
                  </article>
                ))
              ) : (
                <p className="panel p-4 text-[13px] text-muted-foreground">
                  No engineer feedback recorded yet.
                </p>
              )}
            </div>
          </section>

          {reports.length ? (
            <section>
              <SectionHeader title="Test reports" />
              <div className="space-y-2.5">
                {reports.map((r) => (
                  <article key={r.id} className="panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{r.title}</p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {r.ref} · {r.source} · {ageLabel(r.uploadedAt)}
                        </p>
                      </div>
                      <StatusPill status={r.outcome} />
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{r.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section>
            <SectionHeader title="Linked technology needs" />
            <div className="panel divide-y divide-border">
              {c.needIds.length ? (
                c.needIds.map((id) => {
                  const n = syncNeed(id);
                  if (!n) return null;
                  return (
                    <Link
                      key={id}
                      to="/needs/$needId"
                      params={{ needId: id }}
                      className="block px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <p className="text-[12.5px] font-medium leading-snug text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {n.ref} · {n.status} · {n.psl}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <p className="px-4 py-3 text-[12.5px] text-muted-foreground">Not yet linked to a need.</p>
              )}
            </div>
          </section>

          <section>
            <SectionHeader title="Record" />
            <div className="panel space-y-2 p-4 text-[12.5px]">
              {[
                ["Status", c.status],
                ["Relationship", c.relationship],
                ["Maturity", c.maturity],
                ["Evaluations", String(c.evaluationIds.length)],
                ["Projects", String(c.projectIds.length)],
                ["Last evaluated", c.lastEvaluatedAt ? ageLabel(c.lastEvaluatedAt) : "Never"],
                ["Discovery", c.external ? "External discovery agent" : "Contoso knowledge"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium text-foreground">{v}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
