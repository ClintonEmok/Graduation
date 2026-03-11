# Plan: Context-Aware Time Slicing Improvements

**Created:** 2026-03-09  
**Status:** Draft  
**Related Audit:** CODE-AUDIT-2026-03-09

---

## Problem Statement

The current context-aware time slicing implementation has fundamental limitations:

1. **Static Smart Profiles** - Only 3 hardcoded profiles (burglary, violent-crime, all-crimes) with no data-driven adaptation
2. **Weak Context Usage** - Context is extracted but not meaningfully used in generation algorithms
3. **No User Learning** - No feedback loop to learn from acceptance patterns
4. **Limited Context Modes** - Only 'visible' and 'all' modes supported

This plan addresses these issues through a phased implementation.

---

## Goals

- [ ] Make smart profiles data-driven, not hardcoded
- [ ] Enable crime-type specific algorithms with different parameters
- [ ] Add more context modes (focus-region, similar-timespan, seasonal)
- [ ] Add user feedback loop for learning acceptance patterns
- [ ] (Optional) Integrate local LLM for intelligent profile generation

---

## Architecture Overview

### Current (Problematic)

```
useContextExtractor → FilterContext (static)
        ↓
useSmartProfiles → 3 hardcoded profiles (no data analysis)
        ↓
useSuggestionGenerator → generateWarpProfiles() (generic)
        ↓
full-auto-orchestrator → rank packages (generic scoring)
```

### Target (Improved)

```
useContextExtractor → EnrichedContext (crime types, districts, time, 
        ↓                    dayOfWeek, timeOfDay, seasonal, urbanDensity)
        ↓
detectDynamicProfile() → Analyze actual data distribution
        ↓                    (hourly, dayOfWeek, seasonal patterns)
useSmartProfiles → Data-driven SmartProfile with algorithm config
        ↓
CRIME_ALGORITHMS[crimeType] → Crime-type specific parameters
        ↓
generateWarpProfiles() → Context-aware generation
        ↓
full-auto-orchestrator → Scoring with user feedback weights
        ↓
(Optional) LLM enhancement → Natural language explanations
```

---

## Implementation Phases

### Phase CTX-01: Enriched Context Extraction

**Goal:** Extend FilterContext to include more contextual factors

**Files to Modify:**
- `src/hooks/useContextExtractor.ts`

**New Context Interface:**

```typescript
export interface EnrichedContext {
  // Existing
  crimeTypes: string[];
  districts: string[];
  timeRange: { start: number; end: number };
  isFullDataset: boolean;
  
  // NEW
  dayOfWeek: number[];        // Distribution Mon(0) - Sun(6)
  timeOfDay: number[];       // Distribution hour 0-23
  seasonal: 'spring' | 'summer' | 'fall' | 'winter';
  yearDistribution: number[]; // Year-over-year changes
  crimeTypeDistribution: Record<string, number>;
}

export type ContextMode = 'visible' | 'all' | 'focus-region' | 'similar-timespan' | 'seasonal';
```

**Tasks:**
- [ ] Add `useContextEnricher()` hook that computes additional context from crime data
- [ ] Add new context modes: 'focus-region', 'similar-timespan', 'seasonal'
- [ ] Update `getCurrentContext()` to accept mode parameter
- [ ] Add caching for expensive context computations

---

### Phase CTX-02: Dynamic Smart Profiles

**Goal:** Replace static profiles with data-driven detection

**Files to Create:**
- `src/lib/dynamic-profile-detection.ts`

**Files to Modify:**
- `src/hooks/useSmartProfiles.ts` - Replace with dynamic version

**New Profile Detection Logic:**

```typescript
// Analyze actual data patterns
interface DataPatterns {
  hourlyPeak: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed';
  dayOfWeekPeak: 'weekday' | 'weekend' | 'mixed';
  seasonalPattern: 'summer' | 'winter' | 'spring' | 'fall' | 'year-round';
  densityDistribution: 'uniform' | 'concentrated' | 'bursty';
}

// Map patterns to profile names
function mapPatternsToProfile(patterns: DataPatterns): SmartProfile {
  if (patterns.hourlyPeak === 'night' && patterns.seasonalPattern === 'summer') {
    return { 
      name: 'summer-night-burglary-pattern',
      algorithm: 'aggressive-warp',
      parameters: { burstSensitivity: 0.9, warpStrength: 1.8 }
    };
  }
  // ... more mappings
}
```

**Tasks:**
- [ ] Create `analyzeDataPatterns(crimes: CrimeRecord[])` function
- [ ] Create `detectDynamicProfile(context: EnrichedContext, crimes: CrimeRecord[])` function
- [ ] Replace `useSmartProfiles()` hook to use dynamic detection
- [ ] Add tests for pattern detection

---

### Phase CTX-03: Crime-Type Specific Algorithms

**Goal:** Different crime types get different algorithm parameters

**Files to Create:**
- `src/lib/crime-algorithms.ts`

**Algorithm Configuration:**

```typescript
export interface AlgorithmConfig {
  burstSensitivity: number;    // 0-1, how sensitive to density bursts
  warpStrength: number;        // 0.5-2.0, default warp multiplier
  windowHours: number;         // Analysis window size
  continuityWeight: number;    // Weight in scoring
  overlapPenalty: number;     // Penalty for overlapping intervals
}

const CRIME_ALGORITHMS: Record<string, AlgorithmConfig> = {
  burglary: { 
    burstSensitivity: 0.8, 
    warpStrength: 1.5, 
    windowHours: 6,
    continuityWeight: 0.3,
    overlapPenalty: 0.5
  },
  homicide: { 
    burstSensitivity: 0.9, 
    warpStrength: 2.0, 
    windowHours: 24,
    continuityWeight: 0.4,
    overlapPenalty: 0.3
  },
  theft: { 
    burstSensitivity: 0.6, 
    warpStrength: 1.2, 
    windowHours: 4,
    continuityWeight: 0.2,
    overlapPenalty: 0.6
  },
  default: {
    burstSensitivity: 0.5,
    warpStrength: 1.0,
    windowHours: 12,
    continuityWeight: 0.3,
    overlapPenalty: 0.5
  }
};

export function getAlgorithmConfig(crimeTypes: string[]): AlgorithmConfig {
  // Find matching config or return default
}
```

**Files to Modify:**
- `src/lib/warp-generation.ts` - Use algorithm config in generation
- `src/lib/full-auto-orchestrator.ts` - Pass config to generators

**Tasks:**
- [ ] Create `src/lib/crime-algorithms.ts` with algorithm configs
- [ ] Update `generateWarpProfiles()` to accept AlgorithmConfig
- [ ] Update `generateRankedAutoProposalSets()` to use crime-type specific scoring
- [ ] Add more crime types based on actual Chicago crime data categories

---

### Phase CTX-04: User Feedback Loop

**Goal:** Learn from which suggestions users accept

**Files to Create:**
- `src/lib/user-feedback-learner.ts`

**Files to Modify:**
- `src/store/useSuggestionStore.ts` - Add acceptance tracking
- `src/lib/full-auto-orchestrator.ts` - Use learned weights in scoring

**Acceptance Pattern Tracking:**

```typescript
export interface AcceptancePattern {
  contextId: string;          // Hash of context signature
  crimeType: string;
  profileName: string;
  emphasis: 'aggressive' | 'balanced' | 'conservative';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  acceptedAt: number;
  confidence: number;
}

interface LearnedWeights {
  profileWeights: Record<string, number>;   // Which profiles are preferred
  emphasisWeights: Record<string, number>;  // Which emphasis levels work
  crimeTypeWeights: Record<string, number>; // Crime-type specific weights
}

// Update weights based on acceptance history
function updateWeights(
  patterns: AcceptancePattern[], 
  currentWeights: LearnedWeights
): LearnedWeights {
  // Weight profiles higher if frequently accepted for similar context
  // This is a simple frequency count - could be more sophisticated
}
```

**Tasks:**
- [ ] Create acceptance pattern tracking in useSuggestionStore
- [ ] Create `src/lib/user-feedback-learner.ts` with weight update logic
- [ ] Integrate learned weights into scoring in full-auto-orchestrator
- [ ] Add persistence for acceptance patterns (session-only for now)

---

### Phase CTX-05: Local LLM Integration (Optional)

**Goal:** Use local LLM (Qwen 3.5 4B) for intelligent profile suggestions

**Prerequisites:**
- Ollama or similar running locally with Qwen model
- REST API endpoint for model queries

**Files to Create:**
- `src/lib/llm-profile-generator.ts`
- `src/lib/llm-boundary-detector.ts`

**LLM Profile Generation:**

```typescript
interface LLMProfileRequest {
  crimeSummary: {
    totalCrimes: number;
    timeRange: { start: string; end: string };
    crimeTypes: string[];
    hourlyDistribution: number[];
    dayOfWeekDistribution: number[];
    topLocations: string[];
  };
}

interface LLMProfileResponse {
  profileName: string;
  emphasis: 'aggressive' | 'balanced' | 'conservative';
  suggestedIntervals: Array<{
    startPercent: number;
    endPercent: number;
    strength: number;
  }>;
  explanation: string;
}

export async function queryLLMForProfile(request: LLMProfileRequest): Promise<LLMProfileResponse> {
  const prompt = `
Analyze this crime dataset and suggest a warp profile:
${JSON.stringify(request.crimeSummary, null, 2)}

Respond as JSON with fields: profileName, emphasis, suggestedIntervals[], explanation
  `;
  
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:4b',
      prompt,
      stream: false
    })
  });
  
  return JSON.parse(response.data.response);
}
```

**Files to Modify:**
- `src/hooks/useSuggestionGenerator.ts` - Add LLM enhancement option
- `src/lib/full-auto-orchestrator.ts` - Optionally use LLM suggestions

**Tasks:**
- [ ] Create LLM integration module with proper error handling
- [ ] Add "LLM Enhanced" toggle in generation UI
- [ ] Implement fallback to non-LLM generation if LLM unavailable
- [ ] Add caching for LLM responses based on context signature

---

## Dependencies

```
Phase CTX-01 (Enriched Context)
    ↓
Phase CTX-02 (Dynamic Profiles) ← requires CTX-01
    ↓
Phase CTX-03 (Crime Algorithms) ← requires CTX-02
    ↓
Phase CTX-04 (User Feedback)    ← requires CTX-03
    ↓
Phase CTX-05 (LLM Integration)  ← optional, independent
```

---

## Success Criteria

| Phase | Criterion |
|-------|-----------|
| CTX-01 | Context includes dayOfWeek, timeOfDay, seasonal patterns |
| CTX-02 | Smart profiles adapt to actual data distribution, not hardcoded |
| CTX-03 | Different crime types produce measurably different warp profiles |
| CTX-04 | System learns from acceptance history, improves suggestion relevance |
| CTX-05 | LLM can generate profiles that score comparably to algorithmic ones |

---

## Testing Plan

### Unit Tests
- Pattern detection in dynamic profiles
- Algorithm config selection
- Weight update logic

### Integration Tests
- Context enrichment pipeline
- End-to new profiles

###-end suggestion generation with Manual Testing
- Compare old vs new profiles for same data
- Measure acceptance rate improvement
- Test LLM integration if implemented

---

## Open Questions

1. **How many pattern categories?** - Current plan uses 4 (hourly, dayOfWeek, seasonal, density). Should we add more?

2. **LLM integration strategy:**
   - Option A: LLM as primary generator (replace algorithmic)
   - Option B: LLM as enhancer (rank/validate algorithmic suggestions)
   - Option C: LLM for explanations only

3. **Feedback loop persistence:**
   - session-only for now (as requested)
   - Could add localStorage later for cross-session persistence

4. **Scoring weight tuning:**
   - How much should learned weights influence vs base weights?
   - What's the decay function for old acceptance patterns?

---

## Related Files

### Will Modify
- `src/hooks/useContextExtractor.ts`
- `src/hooks/useSmartProfiles.ts`
- `src/hooks/useSuggestionGenerator.ts`
- `src/lib/warp-generation.ts`
- `src/lib/full-auto-orchestrator.ts`
- `src/store/useSuggestionStore.ts`

### Will Create
- `src/lib/dynamic-profile-detection.ts` (CTX-02)
- `src/lib/crime-algorithms.ts` (CTX-03)
- `src/lib/user-feedback-learner.ts` (CTX-04)
- `src/lib/llm-profile-generator.ts` (CTX-05, optional)
- `src/lib/llm-boundary-detector.ts` (CTX-05, optional)

---

*Plan owner: To be assigned*
*Review before implementation: Required*
