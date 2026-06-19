# Evaluation Protocol: Adaptive Space-Time Cube

**Study:** Adaptive Temporal Scaling in Space–Time Cubes for Bursty Spatio-Temporal Data
**Researcher:** Clinton Emok — TU Eindhoven
**Target N:** 5 participants (technically literate novices)
**Estimated duration per session:** 45–60 min

---

## 1. Research Objectives

| ID | Objective | Evaluation Focus |
|----|-----------|-----------------|
| RO1 | Burst Pattern Interpretation | Can users identify and compare bursty temporal patterns better with adaptive scaling? |
| RO2 | Scaled Time Understanding | Can users interpret the scaled temporal representation and relate it back to original time windows? |
| RO3 | Usability & Experience | What is the perceived cognitive load, clarity, and usability of the prototype across conditions? |

This protocol follows the thesis Chapter 7 pilot framing. The user study evaluates `RQ2-RQ4`. `RQ1` (design of the density-aware scaling mechanism) is addressed by the methodology and prototype chapters rather than by this pilot study.

## 2. Experimental Design

**Within-subjects** — each participant experiences both conditions:

| Condition | Label | Description |
|-----------|-------|-------------|
| A | **Uniform** (baseline) | Linear time axis, equal slice height |
| B | **Adaptive** (treatment) | Density-driven non-uniform scaling |

**Order counterbalancing** to mitigate learning effects:

| Participant | Condition Order |
|-------------|----------------|
| P01 | A → B |
| P02 | B → A |
| P03 | A → B |
| P04 | B → A |
| P05 | A → B |

## 3. Participant Recruitment

### Criteria
- Currently enrolled at TU Eindhoven
- Comfortable with digital tools (browsers, maps)
- No prior experience with Space-Time Cube visualizations
- Normal or corrected-to-normal vision

### Screening checklist
- [ ] Student status verified
- [ ] No prior STC exposure
- [ ] Comfortable reading English task instructions
- [ ] Signed informed consent (see Appendix A)

## 4. Apparatus

- **Hardware:** MacBook Pro 16" (or equivalent), external mouse, quiet room
- **Browser:** Chrome/Firefox latest
- **Software:** Local Next.js dev server at `http://localhost:3000/evaluation`
- **Dataset:** Chicago Crime (subset: 1 year, ~300K records)
- **Recording:** Screen capture (QuickTime) + study session logging through the evaluation interface
- **Condition toggle:** Uniform/adaptive condition switch exposed in the evaluation interface
- **Data collection:** Study session logs + in-app questionnaires, with paper questionnaires as backup

### Key interface components for the evaluation

| Component | Function |
|-----------|----------|
| 3D hotspot stack | Main STC view with vertical time axis |
| 2D map | Coordinated spatial view |
| `DemoDualTimeline` | Overview + detail brushing |
| Evaluation header | Session start/stop, participant ID, researcher condition awareness |
| Task card | Current task prompt + confidence capture |
| Post-condition forms | NASA-RTLX + interpretability responses |

## 5. Task Design

The pilot uses one warm-up task plus four core tasks, following the thesis Chapter 7 reduction from the earlier 8-task inventory. The core tasks are kept short, concrete, and ordered from simple to complex within each condition.

### Warm-up (W)
*"Use the practice dataset to learn how to rotate, zoom, pan, read the time axis, and try the time-scale toggle."*
- **Objective:** Familiarize the participant with the interface and controls
- **Metrics:** Not scored
- **Condition relevance:** Training only

### Task T4 — Identify Most Active Region
*"During the given time window, which neighbourhood or region has the highest concentration of incidents?"*
- **Objective:** Spatial baseline / control task
- **Metrics:** Accuracy, completion time, confidence
- **Condition relevance:** Both; little difference expected

### Task T1 — Identify Peak Activity Period
*"Which one-hour time window has the highest number of incidents?"*
- **Objective:** Peak-period identification under bursty temporal structure
- **Metrics:** Accuracy, completion time, confidence
- **Condition relevance:** Both; adaptive expected to help

### Task T2 — Burst Detection
*"Is there a burst in this sequence, and if so, in which bin does it begin?"*
- **Objective:** Detect burst presence and onset
- **Metrics:** Accuracy, completion time, confidence
- **Condition relevance:** Both; adaptive expected to help

### Task T3 — Compare Time Periods
*"Which of the two specified intervals has higher activity?"*
- **Objective:** Compare interval activity while preserving understanding of original time windows
- **Metrics:** Accuracy, completion time, confidence
- **Condition relevance:** Both; supports `RQ2` and `RQ3`

## 6. Procedure

### Phase 1 — Welcome & Consent (5 min)
- Greet participant, explain study purpose (high-level)
- Review and sign informed consent
- Collect demographics (age, program, prior viz experience)

### Phase 2 — Training (10 min)
- Guided walkthrough of the interface using a practice dataset
- Explain: 3D cube axis, 2D map, timeline brushing, and the time-scale toggle
- Ensure participant can rotate the cube, brush the timeline, and switch conditions
- Answer any questions

### Phase 3 — Task Block (25 min)
For each condition (A then B, or B then A per counterbalancing):
- 4 minutes exploration time
- Administer the four core tasks in fixed order: `T4 -> T1 -> T2 -> T3`
- Record completion, accuracy, observations

### Phase 4 — Post-Condition Questionnaire (5 min per condition)
After each condition, administer:

**NASA-RTLX (Raw Task Load Index)**
| Dimension | Scale (1–20) |
|-----------|--------------|
| Mental Demand | 1 (Low) – 20 (High) |
| Temporal Demand | 1 (Low) – 20 (High) |
| Performance | 1 (Perfect) – 20 (Failure) |
| Effort | 1 (Low) – 20 (High) |
| Frustration | 1 (Low) – 20 (High) |

**Perceived Interpretability (5-point Likert)**
- "I could clearly see where and when crime activity was concentrated."
- "I could distinguish the order of events in dense time periods."
- "I trusted what the visualization showed me about temporal patterns."
- "The time axis was easy to read and interpret."
- "I could accurately compare durations across different time periods."

### Phase 5 — Comparative Interview (10 min)
- Which condition did you prefer? Why?
- Did the adaptive view ever feel misleading or confusing?
- Were there times when the uniform view was clearer?
- What would you change about the prototype?
- Open-ended: any other observations?

## 7. Data Collection Plan

### Quantitative
| Measure | Source | Task |
|---------|--------|------|
| Task completion time | Screen recording / logs | All |
| Task accuracy (binary with predefined ground truth/tolerance) | Scoring rubric | All core tasks |
| Confidence (1–5) | Post-task prompt | All core tasks |
| NASA-RTLX (5 dimensions × 1–20) | Questionnaire | Post-condition |
| Likert ratings (5 items × 1–5) | Questionnaire | Post-condition |
| SUS | Questionnaire | End of study |
| Condition preference | Final interview | Phase 5 |

### Qualitative
| Measure | Source |
|---------|--------|
| Think-aloud comments | Screen recording audio |
| Task strategy descriptions | Observation notes |
| Comparative interview responses | Audio transcription |
| Critical incidents (confusion, errors) | Observation notes |

### Behavioral logs
- Session ID / participant ID
- Condition changes (uniform/adaptive)
- Warp factor changes when researcher-adjustable
- Trial start/end timestamps

## 8. Scoring Rubrics

### Task Accuracy
- Score each core task as correct/incorrect against pre-determined ground truth.
- Use a defined tolerance where exact spatial or temporal matches are not appropriate.

### Task-Specific Rubrics

**T4 — Most Active Region**
- Correct if the selected region matches the precomputed highest-activity region for the specified time window.

**T1 — Peak Activity Period**
- Correct if the selected one-hour window matches the precomputed peak period within the allowed temporal tolerance.

**T2 — Burst Detection**
- Correct if the participant correctly identifies burst presence/absence and, when present, the onset bin.

**T3 — Compare Time Periods**
- Correct if the participant selects the interval with the higher true event count.

## 9. Analysis Plan

### Primary comparison
- **Paired descriptive comparison** of task accuracy, completion time, and confidence by participant across conditions
- Report medians, ranges, and per-participant paired differences

### Effect size
- Report raw paired differences per participant; treat these as pilot signals rather than confirmatory evidence

### Qualitative synthesis
- Thematic analysis of interview responses
- Identify recurring usability themes
- Document critical incidents

### Cognitive load
- Compare NASA-RTLX dimensions between conditions

## 10. Schedule

| Participant | Date | Time | Location |
|-------------|------|------|----------|
| P01 | | | |
| P02 | | | |
| P03 | | | |
| P04 | | | |
| P05 | | | |

## 11. Materials Checklist

- [ ] Informed consent forms (printed, 2 copies each)
- [ ] Demographics questionnaire
- [ ] Task instruction sheets (per condition)
- [ ] NASA-RTLX forms (2 per participant — one per condition)
- [ ] Perceived Interpretability Likert forms (2 per participant)
- [ ] Post-study interview guide
- [ ] Laptop with prototype running (check: logging enabled, data loaded)
- [ ] Screen recording software (QuickTime)
- [ ] External mouse
- [ ] Quiet room reserved

## Appendix A — Informed Consent Template

> **Study:** Adaptive Temporal Scaling in Space-Time Cubes
> **Researcher:** Clinton Emok, TU Eindhoven
>
> I confirm that:
> - I have read and understood the information about this study
> - I understand that my participation is voluntary and I can withdraw at any time
> - I consent to screen recording and audio recording during the session
> - I understand that all data will be anonymized
>
> Name: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
> Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
> Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## Appendix B — Demographics Form

1. Age: \_\_\_\_\_
2. Program/Department: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
3. How would you rate your experience with data visualization?
   - None / Beginner / Intermediate / Advanced / Expert
4. Have you used 3D software (games, CAD, GIS) before? Y / N
5. Are you familiar with the concept of a space-time cube? Y / N

## Appendix C — Interview Guide (Phase 5)

1. Which of the two views (uniform or adaptive) did you prefer overall? Why?
2. Was there anything confusing about the adaptive time axis?
3. Were there tasks that felt easier in one view vs the other?
4. Did you feel you could trust what the adaptive view showed you?
5. Did the adaptive view ever feel like it was distorting the data in a misleading way?
6. What would you improve or change about the tool?
7. Any other thoughts or observations?

## Appendix D — Task Order Cards

Print one card per task with the instruction text so participants can refer back.
