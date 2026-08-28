import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, Radar, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AiBadge,
  CompanyGlyph,
  OriginBadge,
  PageHeader,
  SectionHeader,
  StatusPill,
  Tag,
  WhyThis,
  ageLabel,
} from "@/components/scout/primitives";
import { allCompanies, allNeeds, isStale } from "@/lib/api/client";
import { personName } from "@/lib/data/seed";

export const Route = createFileRoute("/scout")({
  head: () => ({
    meta: [
      { title: "Scout Workspace — Digital Scout" },
      {
        name: "description",
        content:
          "Technology scout cockpit: assigned needs, discovery queue of externally surfaced companies, and portfolio signals across Halliburton PSLs.",
      },
      { property: "og:title", content: "Scout Workspace — Digital Scout" },
      {
        property: "og:description",
        content: "Manage the scouting pipeline from assigned needs to externally discovered suppliers.",
      },
    ],
  }),
  component: ScoutWorkspace,
});

function ScoutWorkspace() {
  const assigned = allNeeds.filter((n) => n.scoutId === "u-marcus" || n.scoutId === "u-elena");
  const discovery = allCompanies.filter((c) => c.external);
  const stale = allNeeds.filter(isStale);

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Scout cockpit"
        title="Scout Workspace"
        description="The scouting pipeline in one view: what is assigned, what the discovery agents surfaced overnight, and what has gone quiet."
        actions={
          <Button
            className="gap-1.5"
            onClick={() => toast.success("Discovery sweep queued", { description: "External agents will report within the hour." })}
          >
            <Radar className="size-4" /> Run discovery sweep
          </Button>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Assigned needs", String(assigned.length), Compass],
          ["Discovery queue", String(discovery.length), Radar],
          ["Needs going stale", String(stale.length), TrendingUp],
          ["Agent runs this week", "38", Sparkles],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Compass;
          return (
            <div key={label as string} className="panel p-4">
              <I className="size-4 text-muted-foreground" />
              <p className="mt-2 text-[24px] font-semibold leading-none text-foreground">{value as string}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{label as string}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <SectionHeader
            title="Assigned needs"
            description="Needs where you are the accountable technology scout."
          />
          <div className="panel divide-y divide-border">
            {assigned.map((n) => (
              <Link
                key={n.id}
                to="/needs/$needId"
                params={{ needId: n.id }}
                className="block px-4 py-3.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {n.ref} · {n.psl} · owner {personName(n.ownerId)} · {ageLabel(n.lastActivityAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isStale(n) ? <AiBadge tone="warn">Stale</AiBadge> : null}
                    <StatusPill status={n.status} />
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Tag>{n.category}</Tag>
                  <Tag>{n.companyIds.length} candidates</Tag>
                  <Tag>{n.evaluationIds.length} evaluations</Tag>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside>
          <SectionHeader
            title="Discovery queue"
            description="Companies surfaced externally and awaiting scout triage."
          />
          <div className="space-y-2.5">
            {discovery.map((c) => (
              <article key={c.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <CompanyGlyph name={c.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/companies/$companyId"
                      params={{ companyId: c.id }}
                      className="text-[13px] font-semibold text-foreground hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {c.headquarters} · {c.maturity}
                    </p>
                  </div>
                  <OriginBadge origin="external" />
                </div>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <WhyThis
                    confidence="Medium"
                    signals={[
                      { label: "Discovery source", detail: "External Company Research Agent — public literature and patent filings." },
                      { label: "Relevance", detail: c.aiSummary.slice(0, 150) },
                    ]}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => toast.success(`${c.name} promoted to Under Review`)}
                  >
                    Triage
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
