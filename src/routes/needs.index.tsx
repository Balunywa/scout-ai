import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AiBadge,
  PageHeader,
  StatusPill,
  Tag,
  ageLabel,
  statusOrder,
} from "@/components/scout/primitives";
import { isStale, listNeeds } from "@/lib/api/client";
import { personName } from "@/lib/data/seed";
import type { NeedStatus } from "@/lib/data/types";

export const Route = createFileRoute("/needs/")({
  head: () => ({
    meta: [
      { title: "Technology Needs — Digital Scout" },
      {
        name: "description",
        content:
          "Every Contoso technology need in one traceable register: status, owning PSL, assigned scout, linked evaluations and AI staleness signals.",
      },
      { property: "og:title", content: "Technology Needs — Digital Scout" },
      {
        property: "og:description",
        content: "Search and filter the Contoso technology need register.",
      },
    ],
  }),
  component: NeedsIndex,
});

const PSLS = [
  "Drilling & Evaluation",
  "Completion & Production",
  "Cementing",
  "Artificial Lift",
  "Testing & Subsea",
  "Wireline & Perforating",
  "Landmark / Digital",
  "Corporate Technology",
];

function NeedsIndex() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<NeedStatus | "">("");
  const [psl, setPsl] = useState("");

  const { data = [] } = useQuery({ queryKey: ["needs"], queryFn: () => listNeeds() });

  const filtered = useMemo(
    () =>
      data.filter((n) => {
        if (status && n.status !== status) return false;
        if (psl && n.psl !== psl) return false;
        if (q) {
          const hay = `${n.title} ${n.ref} ${n.problemStatement} ${n.keywords.join(" ")}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [data, q, status, psl],
  );

  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Register"
        title="Technology Needs"
        description="Every scouting request, from first problem statement through to field project — with full lineage."
        actions={
          <>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/needs">
                <Plus className="size-4" /> New need
              </Link>
            </Button>
            <Button asChild className="gap-1.5">
              <Link to="/ask" search={{ q: "" }}>
                <Sparkles className="size-4" /> Define with Digital Scout
              </Link>
            </Button>
          </>
        }
      />

      <div className="panel mt-5 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search needs by title, reference, problem or keyword…"
            className="h-9 pl-8 text-[13px]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as NeedStatus | "")}
          className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground"
        >
          <option value="">All statuses</option>
          {statusOrder.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={psl}
          onChange={(e) => setPsl(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground"
        >
          <option value="">All PSLs</option>
          {PSLS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {filtered.length} of {data.length} needs
        </span>
      </div>

      <div className="panel mt-3 overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">Need</th>
              <th className="px-4 py-2.5 font-semibold">PSL</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Scout</th>
              <th className="px-4 py-2.5 font-semibold">Linked</th>
              <th className="px-4 py-2.5 font-semibold">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((n) => (
              <tr key={n.id} className="transition-colors hover:bg-muted/40">
                <td className="max-w-[420px] px-4 py-3">
                  <Link
                    to="/needs/$needId"
                    params={{ needId: n.id }}
                    className="text-[13.5px] font-semibold text-foreground hover:text-primary"
                  >
                    {n.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] text-muted-foreground">{n.ref}</span>
                    <Tag>{n.category}</Tag>
                    {n.strategicPriority === "Strategic" ? <Tag>Strategic</Tag> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{n.psl}</td>
                <td className="px-4 py-3">
                  <StatusPill status={n.status} />
                </td>
                <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{personName(n.scoutId)}</td>
                <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                  {n.companyIds.length} co · {n.evaluationIds.length} eval · {n.projectIds.length} proj
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] text-muted-foreground">{ageLabel(n.lastActivityAt)}</span>
                    {isStale(n) ? <AiBadge tone="warn">Stale</AiBadge> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            No needs match these filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}
