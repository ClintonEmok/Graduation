import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  ChartColumn,
  Database,
  Layers3,
  Map,
  MapPinned,
  Radar,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TimerReset,
  Workflow,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
  title: "Docs | Quiet Tiger",
  description: "Feature atlas for the adaptive space-time cube prototype.",
};

const routeDocs = [
  {
    href: "/dashboard",
    title: "Dashboard",
    summary: "Main synchronized workspace with map, cube, and dual timeline.",
    tags: ["core", "linked views", "analysis"],
  },
  {
    href: "/dashboard-demo",
    title: "Dashboard demo",
    summary: "Presentation shell for workflow handoff and prototype storytelling.",
    tags: ["demo", "handoff", "workflow"],
  },
  {
    href: "/timeline-test",
    title: "Timeline test",
    summary: "2D timeline sandbox for brush behavior, ticks, and temporal QA.",
    tags: ["timeline", "qa", "brush"],
  },
  {
    href: "/timeline-test-3d",
    title: "Timeline test 3D",
    summary: "3D companion for spatial-temporal alignment experiments.",
    tags: ["3d", "spatial", "exploration"],
  },
  {
    href: "/timeslicing",
    title: "Timeslicing",
    summary: "Manual controls for time resolution and slice inspection.",
    tags: ["adaptive", "controls", "time"],
  },
  {
    href: "/timeslicing-algos",
    title: "Timeslicing algorithms",
    summary: "Algorithm lab for alternative binning and slice generation rules.",
    tags: ["algorithms", "research", "bins"],
  },
  {
    href: "/demo/non-uniform-time-slicing",
    title: "Non-uniform demo",
    summary: "Focused showcase for the granularity-aware brushed partition helper.",
    tags: ["demo", "slicing", "granularity"],
  },
  {
    href: "/stkde",
    title: "STKDE",
    summary: "Hotspot analysis surface for burst detection and kernel density output.",
    tags: ["hotspots", "analytics", "worker"],
  },
  {
    href: "/stats",
    title: "Stats",
    summary: "Summary dashboard for totals, breakdowns, and trend inspection.",
    tags: ["metrics", "overview", "reports"],
  },
  {
    href: "/cube-sandbox",
    title: "Cube sandbox",
    summary: "Focused playground for cube interactions and spatial debugging.",
    tags: ["3d", "sandbox", "debug"],
  },
];

const featureGroups = [
  {
    id: "linked-views",
    icon: Map,
    title: "Linked spatial views",
    summary: "Map, cube, and timeline stay synchronized around a shared selection model.",
    routes: ["/dashboard", "/cube-sandbox", "/timeline-test"],
    bullets: [
      "Brush time once and reflect the same interval in every surface.",
      "Inspect spatial clusters, temporal spikes, and point-level detail without losing context.",
      "Use coordination state to keep selection, detail panels, and overlays aligned.",
    ],
  },
  {
    id: "adaptive-time",
    icon: TimerReset,
    title: "Adaptive time scaling",
    summary: "Bursty intervals expand when detail matters and compress when density falls away.",
    routes: ["/timeslicing", "/timeslicing-algos", "/demo/non-uniform-time-slicing", "/timeline-test"],
    bullets: [
      "Change bin size without breaking the story of the data.",
      "Compare manual slice controls against algorithmic proposals.",
      "Keep the timeline legible while still exposing dense periods.",
    ],
  },
  {
    id: "hotspot-analysis",
    icon: Radar,
    title: "Hotspot analysis",
    summary: "STKDE output surfaces concentrated events and bursty spatial-temporal regions.",
    routes: ["/stkde", "/stats"],
    bullets: [
      "Render kernel density results as a separate analytical layer.",
      "Surface areas that deserve deeper inspection before the user commits to a filter.",
      "Keep heavy calculations off the main thread where possible.",
    ],
  },
  {
    id: "study-ops",
    icon: Workflow,
    title: "Study and workflow ops",
    summary: "The prototype includes guided controls, onboarding, and logging for user studies.",
    routes: ["/dashboard-demo", "/dashboard"],
    bullets: [
      "Run the dashboard as a controlled demo flow when a polished handoff matters.",
      "Use study controls and onboarding to keep behavior reproducible.",
      "Capture interactions without turning the prototype into a consumer app.",
    ],
  },
  {
    id: "data-performance",
    icon: Database,
    title: "Data and performance",
    summary: "Local DuckDB and Arrow keep the workflow offline and scalable enough for large datasets.",
    routes: ["/dashboard", "/stats", "/stkde"],
    bullets: [
      "Stream and query locally instead of depending on a remote database.",
      "Push expensive analytics into workers and keep the UI responsive.",
      "Use sampled or buffered results when the full dataset would be too heavy to render directly.",
    ],
  },
  {
    id: "controls-settings",
    icon: SlidersHorizontal,
    title: "Controls and settings",
    summary: "Feature flags, theme options, and filters help tune the prototype without code changes.",
    routes: ["/dashboard", "/timeslicing", "/stats"],
    bullets: [
      "Adjust visual and experimental options from the settings surface.",
      "Keep filters, presets, and timeline controls discoverable.",
      "Prefer explicit controls for internal users over hidden gestures.",
    ],
  },
];

const stackCards = [
  {
    icon: ShieldCheck,
    title: "Prototype scope",
    description: "Desktop-first internal research tool, not a consumer product.",
    items: ["Keep interactions dense and legible.", "Avoid unrelated product scaffolding.", "Favor clarity over breadth."],
  },
  {
    icon: Layers3,
    title: "Visualization stack",
    description: "Next.js, React Three Fiber, MapLibre, and visx form the visual layer.",
    items: ["Three coordinated surfaces.", "SVG and WebGL each do the work they are best at.", "Brush and selection state stay shared."],
  },
  {
    icon: ChartColumn,
    title: "Analytics layer",
    description: "DuckDB, Arrow, and worker-based computation support large crime datasets.",
    items: ["Local analytics stay offline.", "Expensive work leaves the main thread.", "Routes can fall back to mock data when needed."],
  },
  {
    icon: Sparkles,
    title: "Interaction polish",
    description: "shadcn/ui components provide the shell, state affordances, and accessibility baseline.",
    items: ["Tabs, cards, badges, and accordions compose the docs.", "Semantic surfaces keep the UI coherent.", "The docs route should feel like part of the app, not an afterthought."],
  },
];

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.22em] text-[#a1a1aa]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#f5f5f7]">{value}</p>
      <p className="mt-1 text-sm text-[#b6b6be]">{detail}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-[#f5f5f7] [font-family:SF_Pro_Display,SF_Pro_Text,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_35%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-8 sm:px-10 lg:px-14">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Docs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit rounded-full border-white/10 bg-white/10 px-3 py-1 text-[#f5f5f7]">
              Prototype docs
            </Badge>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.05em] text-[#f5f5f7] sm:text-6xl lg:text-7xl">
                Feature atlas for the adaptive space-time cube
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#b6b6be] sm:text-lg">
                This route documents every surface in the prototype: the synchronized map, the 3D cube, the dual timeline,
                timeslicing controls, hotspot analysis, and the operational tooling wrapped around them.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full px-5" size="lg">
                <Link href="/dashboard">
                  <BookOpenText data-icon="inline-start" />
                  Open dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-5" size="lg">
                <Link href="/timeline-test">
                  <MapPinned data-icon="inline-start" />
                  Inspect timeline
                </Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-full px-5" size="lg">
                <Link href="/stats">
                  <ArrowRight data-icon="inline-end" />
                  View stats
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-[#f5f5f7]">At a glance</CardTitle>
              <CardDescription className="text-[#b6b6be]">
                What this docs route covers today.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Routes" value="9" detail="All prototype entry points." />
              <StatCard label="Views" value="3" detail="Map, cube, and timeline." />
              <StatCard label="Compute" value="2" detail="DuckDB + worker offload." />
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-[#d4d4d8]">
                shadcn/ui shell
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-[#d4d4d8]">
                Desktop-first
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-[#d4d4d8]">
                Offline analytics
              </Badge>
            </CardFooter>
          </Card>
        </div>

        <Separator className="my-10 bg-white/10" />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 sm:grid-cols-4">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#050507]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="routes" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#050507]">
              Routes
            </TabsTrigger>
            <TabsTrigger value="features" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#050507]">
              Features
            </TabsTrigger>
            <TabsTrigger value="stack" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#050507]">
              Stack
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-[#f5f5f7]">Core value</CardTitle>
                  <CardDescription className="text-[#b6b6be]">
                    Keep dense and sparse crime patterns readable by coordinating every view around adaptive time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-[#f5f5f7]">Spatial context</p>
                    <p className="mt-2 text-sm leading-6 text-[#b6b6be]">
                      The 2D map and 3D cube keep location, density, and selection state visible together.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-[#f5f5f7]">Temporal context</p>
                    <p className="mt-2 text-sm leading-6 text-[#b6b6be]">
                      The dual timeline and timeslicing tools let the user move between overview and detail without losing rhythm.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-[#f5f5f7]">Design rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-[#b6b6be]">
                  <p>Use shadcn components as the shell for structure, state, and accessibility.</p>
                  <p>Keep heavy analytics in workers or backend routes.</p>
                  <p>Prefer stable, explicit controls over hidden gestures.</p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-[#f5f5f7]">Main surfaces</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[#b6b6be]">
                  <p>Dashboard, map, cube, timeline.</p>
                  <p>Timeslicing and algorithm exploration.</p>
                  <p>STKDE, stats, and study controls.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="routes" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {routeDocs.map((route) => (
                <Card key={route.href} className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-[#f5f5f7]">{route.title}</CardTitle>
                        <CardDescription className="mt-1 text-[#b6b6be]">{route.summary}</CardDescription>
                      </div>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-[#d4d4d8]">
                        {route.href}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {route.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full bg-white/10 text-[#f5f5f7]">
                        {tag}
                      </Badge>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline" className="w-full rounded-full">
                      <Link href={route.href}>
                        Open route
                        <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-[#f5f5f7]">Feature atlas</CardTitle>
                <CardDescription className="text-[#b6b6be]">
                  Expand each section to see how the prototype behaves and where it lives.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" defaultValue={["linked-views", "adaptive-time"]} className="w-full">
                  {featureGroups.map((group) => {
                    const Icon = group.icon;
                    return (
                      <AccordionItem key={group.id} value={group.id}>
                        <AccordionTrigger className="text-left no-underline hover:no-underline">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5f5f7]">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-[#f5f5f7]">{group.title}</span>
                              <span className="block text-sm font-normal text-[#b6b6be]">{group.summary}</span>
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pl-12">
                            <div className="flex flex-wrap gap-2">
                              {group.routes.map((route) => (
                                <Badge key={route} variant="outline" className="rounded-full border-white/10 bg-white/5 text-[#d4d4d8]">
                                  {route}
                                </Badge>
                              ))}
                            </div>
                            <ul className="grid gap-2 text-sm leading-6 text-[#b6b6be] sm:grid-cols-2">
                              {group.bullets.map((bullet) => (
                                <li key={bullet} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stack" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {stackCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5f5f7]">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <CardTitle className="text-[#f5f5f7]">{card.title}</CardTitle>
                          <CardDescription className="text-[#b6b6be]">{card.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm leading-6 text-[#b6b6be]">
                      {card.items.map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          {item}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-[#f5f5f7]">Need the live workspace?</p>
            <p className="text-sm text-[#b6b6be]">Jump back into the dashboard or continue testing the timeline.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard">
                <Route data-icon="inline-start" />
                Dashboard
              </Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/timeslicing">
                <TimerReset data-icon="inline-start" />
                Timeslicing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
