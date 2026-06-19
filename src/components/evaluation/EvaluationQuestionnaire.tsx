"use client";

/**
 * Phase 80 — Per-condition questionnaire.
 *
 * Centered modal-style overlay (max-w 960px, max-h 80vh, internal
 * scroll) shown after each task block. Captures the locked Phase 80
 * 6 NASA-RTLX items + 6 interpretability Likert statements defined in
 * `protocol.ts` (D-07). Submission is blocked until every required
 * item has a value.
 *
 * Layout (per the UI contract):
 *   1. NASA-RTLX section first — 6 stacked question cards, each with
 *      statement, discrete 1-20 slider, and left/right endpoint
 *      labels.
 *   2. Interpretability section second — 6 stacked rows, each with
 *      5 equal-width option pills labeled 1-5 plus verbal anchors at
 *      the ends.
 *   3. Optional open comment textarea last.
 *
 * On submit the component mirrors each response to the acknowledged
 * `/api/study/log` write path so the responses show up in DuckDB
 * immediately. The condition id is derived from the active block and
 * the active assignment, never displayed to the participant.
 */

import { useMemo, useState } from "react";
import { ChevronRight, ClipboardList, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  selectActiveBlock,
  selectActiveCondition,
  useEvaluationStudyStore,
} from "@/store/useEvaluationStudyStore";
import {
  NASA_RTLX_ITEMS,
  INTERPRETABILITY_ITEMS,
  TOTAL_QUESTIONNAIRE_ITEMS,
  type NasaRtlxDimensionId,
  type InterpretabilityItemId,
} from "@/lib/study/protocol";

const NASA_MIN = 1;
const NASA_MAX = 20;
const LIKERT_MAX = 5;

const NASA_ENDPOINTS: Record<NasaRtlxDimensionId, { low: string; high: string }> = {
  "mental-demand": { low: "Very low", high: "Very high" },
  "physical-demand": { low: "Very low", high: "Very high" },
  "temporal-demand": { low: "Very low", high: "Very high" },
  performance: { low: "Perfect", high: "Failure" },
  effort: { low: "Very low", high: "Very high" },
  frustration: { low: "Very low", high: "Very high" },
};

const LIKERT_ENDPOINTS: Record<InterpretabilityItemId, { low: string; high: string }> = {
  "time-comprehension": { low: "Strongly disagree", high: "Strongly agree" },
  "density-comprehension": { low: "Strongly disagree", high: "Strongly agree" },
  "burst-comprehension": { low: "Strongly disagree", high: "Strongly agree" },
  "condition-distinctness": { low: "Strongly disagree", high: "Strongly agree" },
  "comparison-confidence": { low: "Strongly disagree", high: "Strongly agree" },
  "representation-trust": { low: "Strongly disagree", high: "Strongly agree" },
};

export function EvaluationQuestionnaire() {
  const currentStep = useEvaluationStudyStore((state) => state.currentStep);
  const activeBlock = useEvaluationStudyStore(selectActiveBlock);
  const activeCondition = useEvaluationStudyStore(selectActiveCondition);
  const questionnaireProgress = useEvaluationStudyStore((state) => state.questionnaireProgress);
  const setNasaRtlxItem = useEvaluationStudyStore((state) => state.setNasaRtlxItem);
  const setInterpretabilityItem = useEvaluationStudyStore((state) => state.setInterpretabilityItem);
  const completeQuestionnaire = useEvaluationStudyStore((state) => state.completeQuestionnaire);
  const advanceStep = useEvaluationStudyStore((state) => state.advanceStep);
  const submitStudyIntent = useEvaluationStudyStore((state) => state.submitStudyIntent);
  const sessionId = useEvaluationStudyStore((state) => state.sessionId);
  const participantId = useEvaluationStudyStore((state) => state.participantId);

  const [comment, setComment] = useState<string>("");
  const [resetKey, setResetKey] = useState<string>("");
  const [prevResetKey, setPrevResetKey] = useState<string>("");

  const isQuestionnaireStep = currentStep === "questionnaire-a" || currentStep === "questionnaire-b";
  const block = activeBlock;
  const responses = block ? questionnaireProgress[block] : undefined;

  // Reset the comment field when entering a new questionnaire. Uses
  // the render-time "previous value" pattern to avoid linting around
  // setState in effects.
  const nextResetKey = `${block ?? "none"}|${currentStep}`;
  if (nextResetKey !== resetKey) {
    setResetKey(nextResetKey);
  }
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setComment("");
  }

  const nasaRtlxValues = useMemo<Record<string, number | null>>(() => {
    if (!responses) return {};
    return responses.nasaRtlx;
  }, [responses]);

  const interpretabilityValues = useMemo<Record<string, number | null>>(() => {
    if (!responses) return {};
    return responses.interpretability;
  }, [responses]);

  const requiredCount = TOTAL_QUESTIONNAIRE_ITEMS;
  const completedCount =
    NASA_RTLX_ITEMS.filter((item) => typeof nasaRtlxValues[item.id] === "number").length +
    INTERPRETABILITY_ITEMS.filter((item) => typeof interpretabilityValues[item.id] === "number").length;
  const isComplete = completedCount === requiredCount;

  if (!isQuestionnaireStep || !block) return null;

  const handleSubmit = async () => {
    if (!isComplete || !block || !activeCondition || !sessionId || !participantId) return;
    const now = Date.now();
    for (const item of NASA_RTLX_ITEMS) {
      const value = nasaRtlxValues[item.id];
      if (typeof value !== "number") continue;
      const intentId = `q-${sessionId}-${block}-nasa-${item.id}`;
      void submitStudyIntent(intentId, {
        kind: "questionnaire-response",
        sessionId,
        participantId,
        block,
        condition: activeCondition,
        scale: "nasa-rtlx",
        itemId: item.id,
        value,
        completedAt: now,
      });
    }
    for (const item of INTERPRETABILITY_ITEMS) {
      const value = interpretabilityValues[item.id];
      if (typeof value !== "number") continue;
      const intentId = `q-${sessionId}-${block}-interp-${item.id}`;
      void submitStudyIntent(intentId, {
        kind: "questionnaire-response",
        sessionId,
        participantId,
        block,
        condition: activeCondition,
        scale: "interpretability",
        itemId: item.id,
        value,
        completedAt: now,
      });
    }
    completeQuestionnaire(block);
    advanceStep();
  };

  const handleClear = () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Clear this condition survey and re-enter all answers?");
    if (!confirmed) return;
    if (!block) return;
    for (const item of NASA_RTLX_ITEMS) setNasaRtlxItem(block, item.id, 0);
    for (const item of INTERPRETABILITY_ITEMS) setInterpretabilityItem(block, item.id, 0);
    setComment("");
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="condition questionnaire"
      data-testid="evaluation-questionnaire"
    >
      <div className="pointer-events-auto flex h-[min(80vh,720px)] w-full max-w-[960px] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              Questionnaire
            </span>
            <h2 className="text-base font-semibold text-slate-50">
              Condition survey for this block
            </h2>
          </div>
          <div className="text-right">
            <span className="block font-mono text-[12px] font-semibold text-slate-200">
              {completedCount} / {requiredCount}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Items answered
            </span>
          </div>
        </header>

        <ScrollArea className="flex-1 px-6 py-5">
          <section aria-labelledby="nasa-rtlx-heading" className="space-y-3">
            <h3
              id="nasa-rtlx-heading"
              className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              NASA-RTLX (1-20)
            </h3>
            <div className="space-y-2">
              {NASA_RTLX_ITEMS.map((item) => {
                const value = nasaRtlxValues[item.id];
                const endpoints = NASA_ENDPOINTS[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                        <p className="text-[12px] text-slate-400">{item.prompt}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-slate-100">
                        {typeof value === "number" ? value : "—"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {endpoints.low}
                      </span>
                      <Slider
                        value={[typeof value === "number" ? value : NASA_MIN]}
                        min={NASA_MIN}
                        max={NASA_MAX}
                        step={1}
                        onValueChange={(next) => {
                          const candidate = Array.isArray(next) ? next[0] : next;
                          if (typeof candidate === "number" && block) {
                            setNasaRtlxItem(block, item.id, candidate);
                          }
                        }}
                        aria-label={`${item.label} 1-20`}
                      />
                      <span className="w-20 shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {endpoints.high}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="interp-heading"
            className="mt-8 space-y-3 border-t border-slate-800 pt-5"
          >
            <h3
              id="interp-heading"
              className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              Interpretability (1-5)
            </h3>
            <div className="space-y-2">
              {INTERPRETABILITY_ITEMS.map((item) => {
                const value = interpretabilityValues[item.id];
                const endpoints = LIKERT_ENDPOINTS[item.id];
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-100">{item.statement}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="w-28 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {endpoints.low}
                      </span>
                      <div className="flex flex-1 items-center justify-between gap-1">
                        {Array.from({ length: LIKERT_MAX }, (_, index) => {
                          const option = index + 1;
                          const isActive = value === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                if (block) setInterpretabilityItem(block, item.id, option);
                              }}
                              className={cn(
                                "h-9 min-w-10 flex-1 rounded-md border text-[12px] font-semibold transition-colors",
                                isActive
                                  ? "border-violet-500/70 bg-violet-500/15 text-violet-100"
                                  : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
                              )}
                              aria-pressed={isActive}
                              aria-label={`${item.id} rating ${option}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-28 shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {endpoints.high}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            aria-labelledby="comment-heading"
            className="mt-8 space-y-2 border-t border-slate-800 pt-5"
          >
            <h3
              id="comment-heading"
              className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              Optional comment
            </h3>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Any other observations from this condition?"
              rows={3}
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
          </section>
        </ScrollArea>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-3.5 text-slate-500" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isComplete ? "All items answered" : `${requiredCount - completedCount} remaining`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="h-9 px-3 text-[12px] font-semibold"
            >
              <RotateCcw className="size-3" />
              Reset answers
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={!isComplete}
              className="h-9 px-3 text-[12px] font-semibold"
            >
              <ChevronRight className="size-3" />
              Submit condition survey
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
