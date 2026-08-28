import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AiBadge,
  SectionHeader,
  StatusPill,
  Tag,
  WhyThis,
  ageLabel,
} from "@/components/scout/primitives";
import { syncCompany, syncEvaluation, syncNeed } from "@/lib/api/client";
import { personName } from "@/lib/data/seed";

export const Route = createFileRoute("/evaluations/$evaluationId")({
  loader: ({ params }) => {
    const e = syncEvaluation(params.evaluationId);
    if (!e) throw notFound();
    return { title: e.title, ref: e.ref, decision: e.recommendation.decision };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.ref ?? "Evaluation"} — Digital Scout` },
      {
        name: "description",
        content: `${loaderData?.title ?? "Technology evaluation"} — recommendation: ${loaderData?.decision ?? ""}`.slice(0, 155),
      },
      { property: "og:title", content: `${loaderData?.ref ?? ""} — Digital Scout` },
      { property: "og:description", content: (loaderData?.title ?? "").slice(0, 155) },
    ],
  }),
  component: EvaluationDetail,
});

function EvaluationDetail() {
  const { evaluationId } = Route.useParams();
  const e = syncEvaluation(evaluationId)!;
  const company = syncCompany(e.companyId);
  const need = syncNeed(e.needId);
  const total = e.criteria.reduce((a, c) => a + c.score * c.weight, 0) / 100;

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Link to="/evaluations" className="hover:text-foreground">
          Evaluations
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{e.ref}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={e.status} />
            <Tag>{e.ref}</Tag>
            {company ? <Tag>{company.name}</Tag> : null}
          </div>
          <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight text-foreground">
            {e.title}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Lead evaluator {personName(e.leadEvaluatorId)} · contributors{" "}
            {e.contributors.map((c) => personName(c)).join(", ") || "none"} · started {ageLabel(e.startedAt)} ·
            updated {ageLabel(e.updatedAt)}
          </p>
        </div>
        <div className="panel px-5 py-3 text-center">
          <p className="text-[28px] font-semibold leading-none text-foreground">{total.toFixed(1)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Weighted score</p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          <section>
            <SectionHeader
              title="Scoring matrix"
              description="Weighted criteria with evaluator comments and AI-drafted evidence support."
            />
            <div className="panel overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Criterion</th>
                    <th className="w-20 px-4 py-2.5 font-semibold">Weight</th>
                    <th className="w-24 px-4 py-2.5 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {e.criteria.map((c) => (
                    <tr key={c.key} className="align-top">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-foreground">{c.label}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{c.comment}</p>
                        {c.aiAssist ? (
                          <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-ai/8 px-2.5 py-1.5 text-[12px] leading-relaxed text-foreground">
                            <Sparkles className="mt-0.5 size-3 shrink-0 text-ai" />
                            <span>
                              <span className="font-semibold text-ai">AI assist: </span>
                              {c.aiAssist}
                            </span>
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{c.weight}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-foreground">{c.score}</span>
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(c.score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <SectionHeader title="Recommendation" />
            <div className="panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-semibold text-foreground">{e.recommendation.decision}</p>
                <AiBadge tone={e.recommendation.confidence === "High" ? "ai" : "warn"}>
                  {e.recommendation.confidence} confidence
                </AiBadge>
              </div>
              <ul className="mt-2.5 space-y-1">
                {e.recommendation.reasons.map((r) => (
                  <li key={r} className="text-[12.5px] leading-relaxed text-foreground">
                    · {r}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <WhyThis
                  confidence={e.recommendation.confidence}
                  signals={e.criteria
                    .slice(0, 3)
                    .map((c) => ({ label: c.label, detail: `${c.score}/5 at ${c.weight}% weight — ${c.comment}` }))}
                  sources={e.documents.map((d) => ({ label: `${d.name} (${d.source})`, href: "/knowledge" }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => toast.success("Evaluation exported to PDF")}
                >
                  Export
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => toast.success("Feedback request sent to contributing SMEs")}
                >
                  Request SME feedback
                </Button>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader title="Supporting documents" description="Indexed from SharePoint and Azure Blob Storage." />
            <div className="panel divide-y divide-border">
              {e.documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-foreground">{d.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {d.kind} · {d.source} · {ageLabel(d.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <SectionHeader title="Traceability" />
            <div className="panel divide-y divide-border">
              {need ? (
                <Link to="/needs/$needId" params={{ needId: need.id }} className="block px-4 py-3 hover:bg-muted/60">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Technology need</p>
                  <p className="mt-0.5 text-[12.5px] font-medium text-foreground">{need.title}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {need.ref} · {need.status}
                  </p>
                </Link>
              ) : null}
              {company ? (
                <Link
                  to="/companies/$companyId"
                  params={{ companyId: company.id }}
                  className="block px-4 py-3 hover:bg-muted/60"
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Company</p>
                  <p className="mt-0.5 text-[12.5px] font-medium text-foreground">{company.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {company.maturity} · {company.relationship}
                  </p>
                </Link>
              ) : null}
            </div>
          </section>

          <section>
            <SectionHeader title="Criteria weighting" />
            <div className="panel space-y-2 p-4">
              {e.criteria.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium text-foreground">{c.weight}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-ai" style={{ width: `${c.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
