"use client";

/**
 * Phase 80 — Evaluation training gate.
 *
 * Renders the standardized training intro card above a dimmed but
 * visible demo shell during the `training` step of the evaluation flow.
 * The card has a 5-item checklist (rotate 3D cube, brush timeline, read
 * slice labels, interpret density color, try the unlabeled time-scale
 * toggle) per the Phase 80 UI contract.
 *
 * Flow:
 *   1. Researcher reads the checklist, then clicks "Start training tour".
 *      This dispatches the `gsd:start-evaluation-training-tour` window
 *      event which the global `OnboardingTour` listens for.
 *   2. The driver.js tour runs over the 5 evaluation steps with dark
 *      popovers. Once the researcher closes the tour, the
 *      "Begin tasks" CTA becomes enabled.
 *   3. Researcher clicks "Begin tasks" — this marks training complete
 *      in the evaluation store and advances to the next step
 *      (`tasks-a` for the current block).
 *
 * The gate is its own component so the tour mechanics stay isolated
 * from the demo shell. The shell renders this card on top of the
 * scrim during the `training` step only; the dashboard-demo shell keeps
 * rendering behind it so the participant can see the workspace while
 * reading the checklist.
 */

import { CheckCircle2, Circle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEvaluationStudyStore } from "@/store/useEvaluationStudyStore";

const TRAINING_STAGE_EVENT = "gsd:start-evaluation-training-tour";

const TRAINING_CHECKLIST: readonly { id: string; title: string; description: string }[] = [
  {
    id: "rotate-cube",
    title: "Rotate the 3D cube",
    description: "Switch to the 3D view in the upper right and drag inside the cube to orbit it.",
  },
  {
    id: "brush-timeline",
    title: "Brush the timeline",
    description: "Drag across the timeline at the bottom to filter the map and cube to a time range.",
  },
  {
    id: "slice-labels",
    title: "Read slice labels",
    description: "Open the Slices tab in the right rail to see each generated time slice and its summary.",
  },
  {
    id: "density-color",
    title: "Interpret density color",
    description: "Brighter colors in the cube mean more events in that cell. Hover to read the count.",
  },
  {
    id: "time-scale-toggle",
    title: "Try the unlabeled time-scale toggle",
    description: "Flip the small unlabeled switch in the header and notice how the time axis changes.",
  },
] as const;

export function EvaluationTrainingGate() {
  const currentStep = useEvaluationStudyStore((state) => state.currentStep);
  const trainingCompleted = useEvaluationStudyStore((state) => state.trainingCompleted);
  const advanceStep = useEvaluationStudyStore((state) => state.advanceStep);
  const markTrainingComplete = useEvaluationStudyStore((state) => state.markTrainingComplete);

  // Only render during the training step. The shell passes the scrim
  // and we own the card on top of it.
  if (currentStep !== "training") return null;

  const handleStartTour = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(TRAINING_STAGE_EVENT));
  };

  const handleBeginTasks = () => {
    markTrainingComplete();
    advanceStep();
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-[2px]"
      aria-label="training intro overlay"
      data-testid="evaluation-training-gate"
    >
      <Card
        className={cn(
          "pointer-events-auto w-full max-w-[640px] border-slate-700 bg-slate-900 text-slate-100",
          "shadow-2xl",
        )}
      >
        <CardHeader>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Training
          </span>
          <CardTitle className="text-base font-semibold text-slate-50">
            Standardized onboarding tour
          </CardTitle>
          <CardDescription className="text-sm text-slate-300">
            Walk the participant through the five interactions below. Use the
            training tour button to launch the 5-step driver.js guide, then
            continue to the tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-2" aria-label="training checklist">
            {TRAINING_CHECKLIST.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <Circle className="mt-0.5 size-4 shrink-0 text-slate-600" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="text-[12px] leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleStartTour}
              className="h-9 px-4 text-[13px] font-semibold"
            >
              <Play className="size-3.5" />
              Start training tour
            </Button>
            <Button
              type="button"
              onClick={handleBeginTasks}
              disabled={!trainingCompleted}
              className="h-9 px-4 text-[13px] font-semibold"
            >
              <CheckCircle2 className="size-3.5" />
              Begin tasks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
