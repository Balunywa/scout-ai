import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader, SectionHeader, StatusPill, Tag, ageLabel } from "@/components/scout/primitives";
import { listEvaluations, syncCompany, syncNeed } from "@/lib/api/client";
import { personName } from "@/lib/data/seed";

export const Route = createFileRoute("/evaluations/")({
  head: () => ({
    meta: [
      { title: "Evaluations — Digital Scout" },
      {
        name: "description",
        content:
          "Weighted, criteria-based technology evaluations across Halliburton PSLs, each traceable back to its originating technology need.",
      },
      { property: "og:title", content: "Evaluations — Digital Scout" },
      {
        property: "og:description",
        content: "Structured technology evaluations with AI-assisted scoring support.",
      },
    ],
  }),
  component: EvaluationsIndex,
});

function EvaluationsIndex() {
  const { data = [] } = useQuery({ queryKey: ["evaluations"], queryFn: () => listEvaluations() });
  const groups = [
    { key: "In Progress", label: "In progress" },
    { key: "Awaiting Feedback", label: "Awaiting feedback" },
    { key: "Completed", label: "Completed" },
  ];

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Assessment"
        title="Evaluations"
        description="Consistent, weighted assessments so decisions are comparable across PSLs and reusable years later."
      />

      <div className="mt-5 space-y-7">
        {groups.map((g) => {
          const rows = data.filter((e) => e.status === g.key);
          if (!rows.length) return null;
          return (
            <section key={g.key}>
              <SectionHeader title={g.label} description={`${rows.length} evaluations`} />
              <div className="grid gap-2.5 md:grid-cols-2">
                {rows.map((e) => {
                  const company = syncCompany(e.companyId);
                  const need = syncNeed(e.needId);
                  const total = e.criteria.reduce((a, c) => a + c.score * c.weight, 0) / 100;
                  return (
                    <Link
                      key={e.id}
                      to="/evaluations/$evaluationId"
                      params={{ evaluationId: e.id }}
                      className="panel block p-4 transition-shadow hover:shadow-[var(--shadow-raised)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold leading-snug text-foreground">{e.title}</p>
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {e.ref} · {company?.name} · lead {personName(e.leadEvaluatorId)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[20px] font-semibold leading-none text-foreground">
                            {total.toFixed(1)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">weighted</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                        {e.recommendation.decision}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                        <StatusPill status={e.status} />
                        <Tag>{e.recommendation.confidence} confidence</Tag>
                        {need ? <Tag>{need.ref}</Tag> : null}
                        <span className="ml-auto text-[11.5px] text-muted-foreground">
                          {ageLabel(e.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
