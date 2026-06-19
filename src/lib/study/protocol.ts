/**
 * Phase 80 Study Protocol — Canonical source of truth.
 *
 * IMPORTANT: This file overrides the task/questionnaire counts in
 * `EVALUATION_PROTOCOL.md` and `EVALUATION_FORMS.md` per Phase 80 context
 * (D-07, D-10, D-12). The locked Phase 80 decisions are:
 *
 *   - 4 tasks (T1, T2, T3, T4) in fixed within-condition order T4 -> T1 -> T2 -> T3
 *   - 6 NASA-RTLX dimensions (Mental Demand, Physical Demand, Temporal Demand,
 *     Performance, Effort, Frustration) on a 1-20 scale
 *   - 6 interpretability Likert statements on a 1-5 scale
 *   - 8-step researcher flow:
 *     Welcome -> Training -> Tasks-A -> Questionnaire-A -> Tasks-B ->
 *     Questionnaire-B -> Interview -> Done
 *
 * All evaluation surfaces, DuckDB schemas, and the evaluation store MUST
 * derive from these constants. Do not hard-code questionnaire counts or task
 * orders anywhere else in the codebase.
 *
 * Versioned via `STUDY_PROTOCOL_VERSION` so future thesis-driven updates can
 * detect schema drift in persisted study state.
 */

export const STUDY_PROTOCOL_VERSION = 'phase-80-evaluation-readiness-v1';

export type StudyTaskId = 'T1' | 'T2' | 'T3' | 'T4';

/**
 * Fixed within-condition task order. T4 is the spatial baseline and runs
 * first so participant task-history always opens with the simplest control
 * task, then progresses into the burst/comparison tasks that depend on the
 * visualization (D-10, RQ2, RQ3).
 */
export const STUDY_TASK_ORDER: readonly StudyTaskId[] = ['T4', 'T1', 'T2', 'T3'] as const;

export interface StudyTaskDefinition {
  id: StudyTaskId;
  shortLabel: string;
  prompt: string;
  /** Which thesis research question this task primarily addresses. */
  researchQuestion: 'RQ2' | 'RQ3' | 'RQ4';
  /** Which slice is the participant asked to interact with for this task. */
  expectedVisualUse: 'map' | 'cube' | 'timeline' | 'cube+timeline' | 'all';
}

export const STUDY_TASKS: Readonly<Record<StudyTaskId, StudyTaskDefinition>> = {
  T4: {
    id: 'T4',
    shortLabel: 'Most Active Region',
    prompt:
      'Using the visualization, identify the spatial region with the highest crime activity for the current viewport. Describe where it is.',
    researchQuestion: 'RQ2',
    expectedVisualUse: 'map',
  },
  T1: {
    id: 'T1',
    shortLabel: 'Peak Activity',
    prompt:
      'Identify the time window with the highest activity in the space-time cube. Describe when it occurred and how confident you are.',
    researchQuestion: 'RQ2',
    expectedVisualUse: 'cube+timeline',
  },
  T2: {
    id: 'T2',
    shortLabel: 'Burst Detection',
    prompt:
      'Locate one bursty time interval using the burst detection panel. Briefly describe what makes it bursty.',
    researchQuestion: 'RQ2',
    expectedVisualUse: 'cube+timeline',
  },
  T3: {
    id: 'T3',
    shortLabel: 'Compare Time Periods',
    prompt:
      'Compare two time periods side by side using the comparison controls. Summarize how they differ.',
    researchQuestion: 'RQ3',
    expectedVisualUse: 'cube+timeline',
  },
} as const;

export type StudyStepId =
  | 'welcome'
  | 'training'
  | 'tasks-a'
  | 'questionnaire-a'
  | 'tasks-b'
  | 'questionnaire-b'
  | 'interview'
  | 'done';

export interface StudyStepDefinition {
  id: StudyStepId;
  label: string;
  description: string;
  /** Which block label is in effect while this step is active. Null for non-task steps. */
  activeBlock: 'A' | 'B' | null;
}

export const STUDY_STEPS: readonly StudyStepDefinition[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    description: 'Researcher introduces the study, captures participant ID, and confirms condition order assignment.',
    activeBlock: null,
  },
  {
    id: 'training',
    label: 'Training',
    description: 'Researcher runs the standardized onboarding tour (cube rotation, timeline brushing, slice labels, density coloring, unlabeled time-scale toggle).',
    activeBlock: null,
  },
  {
    id: 'tasks-a',
    label: 'Tasks-A',
    description: 'Participant completes the 4 tasks in fixed order under the first condition.',
    activeBlock: 'A',
  },
  {
    id: 'questionnaire-a',
    label: 'Questionnaire-A',
    description: 'Participant completes the per-condition NASA-RTLX + interpretability Likert questionnaire for condition A.',
    activeBlock: 'A',
  },
  {
    id: 'tasks-b',
    label: 'Tasks-B',
    description: 'Participant completes the 4 tasks in fixed order under the second condition.',
    activeBlock: 'B',
  },
  {
    id: 'questionnaire-b',
    label: 'Questionnaire-B',
    description: 'Participant completes the per-condition NASA-RTLX + interpretability Likert questionnaire for condition B.',
    activeBlock: 'B',
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Researcher conducts the post-session interview (open-ended questions, paper backup for forms).',
    activeBlock: null,
  },
  {
    id: 'done',
    label: 'Done',
    description: 'Session complete; participant is released and writes are finalized.',
    activeBlock: null,
  },
] as const;

export const STUDY_STEP_IDS: readonly StudyStepId[] = STUDY_STEPS.map((step) => step.id);

export type NasaRtlxDimensionId =
  | 'mental-demand'
  | 'physical-demand'
  | 'temporal-demand'
  | 'performance'
  | 'effort'
  | 'frustration';

export interface NasaRtlxItemDefinition {
  id: NasaRtlxDimensionId;
  label: string;
  prompt: string;
  scale: '1-20';
}

/**
 * Locked 6 NASA-RTLX dimensions. This list overrides the 5-item list in
 * EVALUATION_PROTOCOL.md per Phase 80 context (D-07).
 */
export const NASA_RTLX_ITEMS: readonly NasaRtlxItemDefinition[] = [
  {
    id: 'mental-demand',
    label: 'Mental Demand',
    prompt: 'How mentally demanding was the task?',
    scale: '1-20',
  },
  {
    id: 'physical-demand',
    label: 'Physical Demand',
    prompt: 'How physically demanding was the task?',
    scale: '1-20',
  },
  {
    id: 'temporal-demand',
    label: 'Temporal Demand',
    prompt: 'How hurried or rushed was the pace of the task?',
    scale: '1-20',
  },
  {
    id: 'performance',
    label: 'Performance',
    prompt: 'How successful were you in accomplishing what you were asked to do?',
    scale: '1-20',
  },
  {
    id: 'effort',
    label: 'Effort',
    prompt: 'How hard did you have to work to accomplish your level of performance?',
    scale: '1-20',
  },
  {
    id: 'frustration',
    label: 'Frustration',
    prompt: 'How insecure, discouraged, irritated, stressed, or annoyed were you?',
    scale: '1-20',
  },
] as const;

export type InterpretabilityItemId =
  | 'time-comprehension'
  | 'density-comprehension'
  | 'burst-comprehension'
  | 'condition-distinctness'
  | 'comparison-confidence'
  | 'representation-trust';

export interface InterpretabilityItemDefinition {
  id: InterpretabilityItemId;
  statement: string;
  scale: '1-5';
}

/**
 * Locked 6 interpretability Likert statements. This list overrides the
 * 5-statement list in EVALUATION_FORMS.md per Phase 80 context (D-07).
 */
export const INTERPRETABILITY_ITEMS: readonly InterpretabilityItemDefinition[] = [
  {
    id: 'time-comprehension',
    statement: 'I understood how time was represented in the visualization.',
    scale: '1-5',
  },
  {
    id: 'density-comprehension',
    statement: 'I could tell where the highest-density areas were in the cube.',
    scale: '1-5',
  },
  {
    id: 'burst-comprehension',
    statement: 'I could identify bursty time intervals in the visualization.',
    scale: '1-5',
  },
  {
    id: 'condition-distinctness',
    statement: 'The two conditions (labeled A and B in this study) felt different to me.',
    scale: '1-5',
  },
  {
    id: 'comparison-confidence',
    statement: 'I felt confident comparing two time periods side by side.',
    scale: '1-5',
  },
  {
    id: 'representation-trust',
    statement: 'I trusted that the visualization accurately represented the underlying data.',
    scale: '1-5',
  },
] as const;

export const NASA_RTLX_ITEM_COUNT = NASA_RTLX_ITEMS.length;
export const INTERPRETABILITY_ITEM_COUNT = INTERPRETABILITY_ITEMS.length;
export const TOTAL_QUESTIONNAIRE_ITEMS = NASA_RTLX_ITEM_COUNT + INTERPRETABILITY_ITEM_COUNT;
export const TASK_COUNT = STUDY_TASK_ORDER.length;
export const STEP_COUNT = STUDY_STEPS.length;

/**
 * Find the first index of `stepId` in the fixed step sequence. Useful for
 * the store to compute the next step without re-implementing the order.
 */
export const stepIndex = (stepId: StudyStepId): number => STUDY_STEP_IDS.indexOf(stepId);

/**
 * Return the next step id, or `null` when the current step is the last one
 * (`'done'`). Pure helper so the store can stay agnostic to the sequence.
 */
export const nextStep = (stepId: StudyStepId): StudyStepId | null => {
  const index = stepIndex(stepId);
  if (index < 0 || index >= STUDY_STEP_IDS.length - 1) return null;
  return STUDY_STEP_IDS[index + 1] ?? null;
};

export const isValidStepId = (value: unknown): value is StudyStepId =>
  typeof value === 'string' && STUDY_STEP_IDS.includes(value as StudyStepId);

export const isValidTaskId = (value: unknown): value is StudyTaskId =>
  typeof value === 'string' && STUDY_TASK_ORDER.includes(value as StudyTaskId);
