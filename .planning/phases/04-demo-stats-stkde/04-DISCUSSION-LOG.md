## Demo Stats + STKDE

| Option | Description | Selected |
|--------|-------------|----------|
| Interaction/state wiring | Focus the phase on demo-local state and cross-surface behavior | ✓ |
| Route clone | Recreate the standalone `/stats` and `/stkde` routes inside the demo | |

**User direction:** this phase is mostly interaction and state wiring because the separate stats and STKDE routes already exist as a learning foundation.

---

## Surface Role

| Option | Description | Selected |
|--------|-------------|----------|
| Compact stats surface | Keep stats small and summary-oriented inside the demo shell | ✓ |
| Full stats page | Make stats feel like a second dashboard surface | |

| Option | Description | Selected |
|--------|-------------|----------|
| Primary STKDE rail | Keep hotspot analysis prominent and always easy to reach | ✓ |
| Secondary STKDE card | Reduce STKDE to a minor supporting widget | |

**Working direction:** stats should be compact, STKDE should stay prominent, and both should share the demo's local selection/time state.

---

## Scope Guardrails

- The stable `/stats` and `/stkde` routes remain reference implementations, not targets for heavy redesign.
- Demo behavior should be isolated from the stable route behavior.
- This phase should improve how the demo feels as one analytical surface before workflow isolation starts.
