import { Sparkles, Building2, Globe2, ShieldCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { daysSince } from "@/lib/data/seed";
import type { NeedStatus } from "@/lib/data/types";

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tone: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground border-border",
    Scouting: "bg-info/10 text-info border-info/25",
    "Companies Identified": "bg-info/10 text-info border-info/25",
    Evaluation: "bg-warning/15 text-warning-foreground border-warning/35",
    "Pilot / Test": "bg-ai/10 text-ai border-ai/25",
    Project: "bg-success/12 text-success border-success/30",
    Closed: "bg-muted text-muted-foreground border-border",
    Archived: "bg-muted text-muted-foreground border-border",
    "In Progress": "bg-warning/15 text-warning-foreground border-warning/35",
    "Awaiting Feedback": "bg-info/10 text-info border-info/25",
    Completed: "bg-success/12 text-success border-success/30",
    Funded: "bg-info/10 text-info border-info/25",
    "In Field": "bg-ai/10 text-ai border-ai/25",
    Complete: "bg-success/12 text-success border-success/30",
    "On Hold": "bg-muted text-muted-foreground border-border-strong",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-tight",
        tone[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {status}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AiBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "warn";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
        tone === "warn"
          ? "border-warning/40 bg-warning/15 text-warning-foreground"
          : "border-ai/25 bg-ai/10 text-ai",
        className,
      )}
    >
      <Sparkles className="size-3" />
      {children}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: "internal" | "external" }) {
  return origin === "internal" ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/8 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
      <ShieldCheck className="size-3" /> Halliburton knowledge
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md border border-border-strong bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <Globe2 className="size-3" /> External source
    </span>
  );
}

export function WhyThis({
  title = "Why am I seeing this?",
  signals,
  sources,
  confidence,
}: {
  title?: string;
  signals: { label: string; detail: string }[];
  sources?: { label: string; href: string }[];
  confidence?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-ai underline-offset-2 hover:bg-ai/10 hover:underline">
        <Info className="size-3" />
        {title}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0 text-sm">
        <div className="border-b border-border bg-ai/6 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ai">
            <Sparkles className="size-3.5" /> Digital Scout reasoning
          </p>
          {confidence ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Confidence: {confidence}</p>
          ) : null}
        </div>
        <div className="space-y-2.5 px-4 py-3">
          {signals.map((s) => (
            <div key={s.label}>
              <p className="text-xs font-semibold text-foreground">{s.label}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
        {sources?.length ? (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Knowledge sources
            </p>
            <ul className="space-y-1">
              {sources.map((s) => (
                <li key={s.href + s.label}>
                  <a href={s.href} className="text-xs text-ai hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[22px] font-semibold leading-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatTile({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[26px] font-semibold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-[13px] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export function CompanyGlyph({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[12px] font-semibold text-muted-foreground",
        className,
      )}
    >
      {initials || <Building2 className="size-4" />}
    </span>
  );
}

export const ageLabel = (iso: string) => {
  const d = daysSince(iso);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 60) return `${d} days ago`;
  const m = Math.round(d / 30);
  return `${m} months ago`;
};

export const statusOrder: NeedStatus[] = [
  "Draft",
  "Scouting",
  "Companies Identified",
  "Evaluation",
  "Pilot / Test",
  "Project",
  "Closed",
  "Archived",
];
