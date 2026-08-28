import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, MapPin } from "lucide-react";

import { PageHeader, SectionHeader, StatusPill, Tag, ageLabel } from "@/components/scout/primitives";
import { allReports, listProjects, syncCompany, syncNeed } from "@/lib/api/client";
import { personName } from "@/lib/data/seed";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects & Field Results — Digital Scout" },
      {
        name: "description",
        content:
          "Funded pilots and field deployments arising from Halliburton technology scouting, with the test reports that close the traceability loop.",
      },
      { property: "og:title", content: "Projects & Field Results — Digital Scout" },
      {
        property: "og:description",
        content: "Where scouted technology becomes field-proven Halliburton capability.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data = [] } = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Outcomes"
        title="Projects and field results"
        description="The final links in the chain: Need → Company → Evaluation → Project → Report."
      />

      <div className="mt-5 space-y-3">
        {data.map((p) => {
          const need = syncNeed(p.needId);
          const company = syncCompany(p.companyId);
          const reports = allReports.filter((r) => p.reportIds.includes(r.id));
          return (
            <article key={p.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-foreground">{p.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground">
                    <span>{p.ref}</span>
                    <span>·</span>
                    <MapPin className="size-3" />
                    <span>{p.location}</span>
                    <span>·</span>
                    <span>{p.psl}</span>
                    <span>·</span>
                    <span>lead {personName(p.leadId)}</span>
                    <span>·</span>
                    <span>started {ageLabel(p.startedAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Tag>{p.budget}</Tag>
                  <StatusPill status={p.status} />
                </div>
              </div>

              <p className="mt-2 max-w-4xl text-[12.5px] leading-relaxed text-muted-foreground">{p.summary}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[12px]">
                {need ? (
                  <Link
                    to="/needs/$needId"
                    params={{ needId: need.id }}
                    className="rounded-md border border-border px-2.5 py-1 text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {need.ref} · {need.title}
                  </Link>
                ) : null}
                {company ? (
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: company.id }}
                    className="rounded-md border border-border px-2.5 py-1 text-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {company.name}
                  </Link>
                ) : null}
              </div>

              {reports.length ? (
                <div className="mt-3 space-y-2">
                  {reports.map((r) => (
                    <div key={r.id} className="rounded-md border border-border bg-muted/40 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                          <FileText className="size-3.5 text-muted-foreground" /> {r.title}
                        </p>
                        <StatusPill status={r.outcome} />
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{r.summary}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {r.findings.map((f) => (
                          <li key={f} className="text-[12px] leading-relaxed text-foreground">
                            · {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="mt-8">
        <SectionHeader title="All test reports" description="Indexed from lab systems, SharePoint and Azure Blob Storage." />
        <div className="panel divide-y divide-border">
          {allReports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-foreground">{r.title}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {r.ref} · {r.source} · {r.uploadedBy} · {ageLabel(r.uploadedAt)}
                </p>
              </div>
              <StatusPill status={r.outcome} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
