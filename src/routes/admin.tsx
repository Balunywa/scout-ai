import { createFileRoute } from "@tanstack/react-router";
import { Cloud, Database, ShieldCheck, Users } from "lucide-react";

import { PageHeader, SectionHeader, StatusPill, Tag } from "@/components/scout/primitives";
import { allPeople } from "@/lib/api/client";
import { USING_MOCK_ADAPTER } from "@/lib/api/client";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Digital Scout" },
      {
        name: "description",
        content:
          "Governance for Digital Scout: user roles and Entra ID groups, taxonomy management, connected data sources and AI agent configuration.",
      },
      { property: "og:title", content: "Administration — Digital Scout" },
      {
        property: "og:description",
        content: "Roles, taxonomy, data sources and agent configuration for the Digital Scout platform.",
      },
    ],
  }),
  component: AdminPage,
});

const SOURCES = [
  { name: "SharePoint — Technology Scouting", kind: "Documents", status: "Connected", detail: "12,480 documents indexed · last sync 14 min ago" },
  { name: "Azure Blob Storage — Lab Reports", kind: "Reports", status: "Connected", detail: "3,201 reports · last sync 2 h ago" },
  { name: "Azure AI Search", kind: "Index", status: "Connected", detail: "Hybrid semantic + vector index · 41,905 chunks" },
  { name: "Azure AI Foundry — Agent Fleet", kind: "AI", status: "Connected", detail: "6 agents · orchestrator, need definition, company research, evaluation, monitoring, summarisation" },
  { name: "Microsoft Entra ID", kind: "Identity", status: "Connected", detail: "SSO and group-based role mapping" },
  { name: "Teams Notifications", kind: "Messaging", status: "Pending", detail: "Awaiting tenant approval for the Digital Scout app" },
];

const AGENTS = [
  { name: "Orchestrator Agent", model: "GPT-5.4", purpose: "Routes user intent to the right specialist agent and composes answers.", runs: "4,120 / month" },
  { name: "Need Definition Agent", model: "GPT-5.4", purpose: "Converts conversation into structured technology-need fields.", runs: "860 / month" },
  { name: "Company Research Agent", model: "GPT-5.4 + web", purpose: "Discovers and profiles external suppliers against requirements.", runs: "1,540 / month" },
  { name: "Evaluation Agent", model: "GPT-5.4-mini", purpose: "Drafts criteria scoring support from prior evidence.", runs: "410 / month" },
  { name: "Monitoring Agent", model: "GPT-5.4-nano", purpose: "Flags stale needs and new external signals.", runs: "9,300 / month" },
  { name: "Embedding Model", model: "text-embedding-3-large", purpose: "Vectorises needs, evaluations, reports and documents.", runs: "Continuous" },
];

function AdminPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Governance"
        title="Administration"
        description="Roles, taxonomy, connected data sources and AI configuration for the Digital Scout platform."
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Users and roles" description="Mapped from Microsoft Entra ID groups." />
          <div className="panel divide-y divide-border">
            {allPeople.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                  {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-foreground">{p.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {p.title} · {p.psl} · {p.location}
                  </p>
                </div>
                <Tag>{p.role}</Tag>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section>
            <SectionHeader title="Connected data sources" description="Azure-native integrations." />
            <div className="panel divide-y divide-border">
              {SOURCES.map((s) => (
                <div key={s.name} className="flex items-start gap-3 px-4 py-3">
                  {s.kind === "AI" ? (
                    <Cloud className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  ) : s.kind === "Identity" ? (
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-foreground">{s.name}</p>
                    <p className="text-[11.5px] leading-relaxed text-muted-foreground">{s.detail}</p>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="Taxonomy" description="Controlled vocabularies used across needs and companies." />
            <div className="panel space-y-3 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Product Service Lines
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["Drilling & Evaluation", "Completion & Production", "Cementing", "Artificial Lift", "Testing & Subsea", "Wireline & Perforating", "Landmark / Digital", "Corporate Technology"].map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Technology categories
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["Chemicals", "Materials & Coatings", "Sensors", "Electronics", "Water Treatment", "Power Systems", "AI / ML", "Automation", "Engineering Technologies", "Scientific Technologies"].map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="mt-7">
        <SectionHeader
          title="AI agent configuration"
          description="Azure AI Foundry agent fleet backing Digital Scout."
        />
        <div className="panel overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Agent</th>
                <th className="px-4 py-2.5 font-semibold">Model</th>
                <th className="px-4 py-2.5 font-semibold">Purpose</th>
                <th className="px-4 py-2.5 font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {AGENTS.map((a) => (
                <tr key={a.name}>
                  <td className="px-4 py-3 text-[12.5px] font-medium text-foreground">{a.name}</td>
                  <td className="px-4 py-3"><Tag>{a.model}</Tag></td>
                  <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{a.purpose}</td>
                  <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{a.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Users className="size-3.5" />
          Data adapter: {USING_MOCK_ADAPTER ? "demo dataset (no live Azure services connected)" : "live API"}
        </p>
      </section>
    </div>
  );
}
