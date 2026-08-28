import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  CompanyGlyph,
  OriginBadge,
  PageHeader,
  StatusPill,
  Tag,
  ageLabel,
} from "@/components/scout/primitives";
import { listCompanies } from "@/lib/api/client";

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: "Company Catalog — Digital Scout" },
      {
        name: "description",
        content:
          "Halliburton's catalog of scouted and evaluated technology suppliers, with maturity, relationship status, engineer feedback and linked evaluations.",
      },
      { property: "og:title", content: "Company Catalog — Digital Scout" },
      {
        property: "og:description",
        content: "Browse every technology supplier Halliburton has scouted or evaluated.",
      },
    ],
  }),
  component: CompaniesIndex,
});

const DOMAINS = [
  "Chemicals",
  "Materials & Coatings",
  "Sensors",
  "Electronics",
  "Water Treatment",
  "Power Systems",
  "AI / ML",
  "Automation",
  "Engineering Technologies",
  "Scientific Technologies",
];

function CompaniesIndex() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const [origin, setOrigin] = useState("");
  const { data = [] } = useQuery({ queryKey: ["companies"], queryFn: () => listCompanies() });

  const filtered = useMemo(
    () =>
      data.filter((c) => {
        if (domain && c.domain !== domain) return false;
        if (origin === "internal" && c.external) return false;
        if (origin === "external" && !c.external) return false;
        if (q) {
          const hay = `${c.name} ${c.description} ${c.technologyAreas.join(" ")} ${c.country}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [data, q, domain, origin],
  );

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Catalog"
        title="Companies"
        description="Suppliers, startups and research groups scouted for Halliburton technology needs — evaluated, piloted or newly discovered."
      />

      <div className="panel mt-5 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search companies, technologies or countries…"
            className="h-9 pl-8 text-[13px]"
          />
        </div>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px]"
        >
          <option value="">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px]"
        >
          <option value="">Internal and external</option>
          <option value="internal">Halliburton knowledge</option>
          <option value="external">Externally discovered</option>
        </select>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {filtered.length} of {data.length} companies
        </span>
      </div>

      <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/companies/$companyId"
            params={{ companyId: c.id }}
            className="panel flex flex-col p-4 transition-shadow hover:shadow-[var(--shadow-raised)]"
          >
            <div className="flex items-start gap-3">
              <CompanyGlyph name={c.name} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold leading-snug text-foreground">{c.name}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {c.headquarters} · founded {c.founded} · {c.employees}
                </p>
              </div>
              <OriginBadge origin={c.external ? "external" : "internal"} />
            </div>
            <p className="mt-2.5 line-clamp-3 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {c.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <StatusPill status={c.status} />
              <Tag>{c.maturity}</Tag>
              <Tag>{c.relationship}</Tag>
            </div>
            <p className="mt-2.5 border-t border-border pt-2.5 text-[11.5px] text-muted-foreground">
              {c.evaluationIds.length} evaluations · {c.needIds.length} needs ·{" "}
              {c.lastEvaluatedAt ? `last evaluated ${ageLabel(c.lastEvaluatedAt)}` : "never evaluated"}
            </p>
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="panel mt-3 px-4 py-10 text-center text-[13px] text-muted-foreground">
          No companies match these filters.
        </p>
      ) : null}
    </div>
  );
}
