import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search as SearchIcon, Sparkles } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  OriginBadge,
  PageHeader,
  SectionHeader,
  Tag,
  ageLabel,
} from "@/components/scout/primitives";
import { allKnowledgeDocs, search } from "@/lib/api/client";

export const Route = createFileRoute("/knowledge")({
  validateSearch: (s: Record<string, unknown>): { q?: string; doc?: string } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    doc: typeof s["doc"] === "string" ? s["doc"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Knowledge Search — Digital Scout" },
      {
        name: "description",
        content:
          "Semantic search across Halliburton scouting knowledge: needs, companies, evaluations, field reports, scout notes and SharePoint documents.",
      },
      { property: "og:title", content: "Knowledge Search — Digital Scout" },
      {
        property: "og:description",
        content: "Search everything Halliburton already knows before scouting something new.",
      },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const { q: initial } = Route.useSearch();
  const [query, setQuery] = useState(initial ?? "");
  const [submitted, setSubmitted] = useState(initial ?? "");

  const { data, isFetching } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => search(submitted),
    enabled: submitted.length > 1,
  });

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 lg:px-8">
      <PageHeader
        eyebrow="Institutional memory"
        title="Knowledge search"
        description="One index across needs, companies, evaluations, projects, reports and documents — internal knowledge first, external discovery second."
      />

      <form
        className="panel mt-5 flex items-center gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. sour service coating above 180 °C, methane detection, produced water membranes…"
            className="h-10 pl-8 text-[13.5px]"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {isFetching ? (
        <p className="mt-5 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Sparkles className="size-4 animate-pulse text-ai" /> Searching Halliburton knowledge…
        </p>
      ) : null}

      {data ? (
        <>
          <section className="panel ai-surface mt-5 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ai">
              <Sparkles className="size-3.5" /> Digital Scout answer
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground">{data.summary}</p>
            {data.citations.length ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {data.citations.map((c) => (
                  <a
                    key={c.href}
                    href={c.href}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 text-[11.5px] text-foreground hover:border-ai/40 hover:text-ai"
                  >
                    {c.label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            <SectionHeader title="Results" description={`${data.hits.length} matches ranked semantically`} />
            <div className="panel divide-y divide-border">
              {data.hits.map((h) => (
                <a key={`${h.type}-${h.id}`} href={h.href} className="block px-4 py-3.5 hover:bg-muted/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-foreground">{h.title}</span>
                    <Tag>{h.type}</Tag>
                    <OriginBadge origin={h.origin} />
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{h.subtitle}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{h.snippet}</p>
                </a>
              ))}
              {data.hits.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No internal matches. Digital Scout can run an external discovery pass instead.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      <section className="mt-8">
        <SectionHeader
          title="Scout notes and documents"
          description="Unstructured knowledge indexed from SharePoint, Teams and scout notebooks."
        />
        <div className="panel divide-y divide-border">
          {allKnowledgeDocs.map((d) => (
            <article key={d.id} className="px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="size-3.5 text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground">{d.title}</span>
                <Tag>{d.kind}</Tag>
                <OriginBadge origin={d.origin} />
              </div>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {d.author} · {d.source} · {ageLabel(d.at)}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{d.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
