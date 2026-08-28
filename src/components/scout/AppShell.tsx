import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  Building2,
  ClipboardCheck,
  Compass,
  FlaskConical,
  Home,
  Layers,
  Library,
  MessagesSquare,
  Search,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  allCompanies,
  allEvaluations,
  allNeeds,
  allProjects,
  allReports,
  currentUser,
} from "@/lib/api/client";

const nav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/ask", label: "Ask Digital Scout", icon: MessagesSquare },
  { to: "/needs", label: "Technology Needs", icon: Target },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { to: "/projects", label: "Projects", icon: FlaskConical },
  { to: "/knowledge", label: "Knowledge", icon: Library },
  { to: "/following", label: "Following", icon: Bookmark },
  { to: "/scout", label: "Scout Workspace", icon: Compass },
  { to: "/admin", label: "Admin", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const index = useMemo(
    () => ({
      needs: allNeeds.slice(0, 40),
      companies: allCompanies.slice(0, 40),
      evaluations: allEvaluations.slice(0, 20),
      projects: allProjects,
      reports: allReports,
    }),
    [],
  );

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary">
            <Layers className="size-4 text-sidebar-primary-foreground" />
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-semibold tracking-tight">Digital Scout</p>
            <p className="text-[11px] text-sidebar-foreground/60">Halliburton Technology</p>
          </div>
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 px-3 pb-4">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-sidebar-primary" />
                ) : null}
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
            Signed in via Entra ID
          </p>
          <p className="mt-1 text-[13px] font-medium">{currentUser.name}</p>
          <p className="text-[11px] text-sidebar-foreground/60">
            {currentUser.role} · {currentUser.psl}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex size-7 items-center justify-center rounded bg-primary">
              <Layers className="size-3.5 text-primary-foreground" />
            </span>
            <span className="text-[13px] font-semibold">Digital Scout</span>
          </Link>

          <button
            onClick={() => setOpen(true)}
            className="group flex h-9 max-w-[640px] flex-1 items-center gap-2 rounded-md border border-border bg-muted/60 px-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:bg-muted"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">
              Search needs, companies, evaluations, projects, reports…
            </span>
            <kbd className="ml-auto hidden rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground sm:block">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/following"
              className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
            </Link>
            <Button asChild size="sm" className="h-9 gap-1.5">
              <Link to="/ask" search={{ q: "" }}>
                <Sparkles className="size-4" />
                Ask Digital Scout
              </Link>
            </Button>
            <span className="ml-1 hidden size-8 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-accent-foreground sm:flex">
              SW
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search needs, companies, evaluations, projects, reports…" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No matching Halliburton knowledge.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => go("/ask")}>Ask Digital Scout</CommandItem>
            <CommandItem onSelect={() => go("/knowledge")}>Knowledge search</CommandItem>
            <CommandItem onSelect={() => go("/scout")}>Scout Workspace</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Technology needs">
            {index.needs.map((n) => (
              <CommandItem key={n.id} value={`${n.title} ${n.ref}`} onSelect={() => go(`/needs/${n.id}`)}>
                <Target className="size-3.5 text-muted-foreground" />
                <span className="truncate">{n.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{n.ref}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Companies">
            {index.companies.map((c) => (
              <CommandItem key={c.id} value={c.name} onSelect={() => go(`/companies/${c.id}`)}>
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{c.domain}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Evaluations">
            {index.evaluations.map((e) => (
              <CommandItem key={e.id} value={e.title} onSelect={() => go(`/evaluations/${e.id}`)}>
                <ClipboardCheck className="size-3.5 text-muted-foreground" />
                <span className="truncate">{e.title}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{e.ref}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
