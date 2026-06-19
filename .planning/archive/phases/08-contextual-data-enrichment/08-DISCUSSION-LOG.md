## Phase 8 Discussion Log

## Context Categories

| Option | Description | Selected |
|--------|-------------|----------|
| Socioeconomic | Add neighborhood or district-level socioeconomic signals | ✓ |
| Holidays/events | Add calendar and city event context | ✓ |
| Traffic pressure | Add congestion or travel pressure signals | ✓ |
| Miscellaneous context | Add whatever data is easiest to find | |

**Working direction:** Use context that helps explain crime patterns without bloating the demo.

---

## Presentation Style

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle overlay | Show context as a lightweight layer or annotation | ✓ |
| Heavy dashboard | Build a separate context dashboard section | |
| Hidden metadata only | Store context but do not surface it visually | |

**Working direction:** Surface context in a lightweight, readable way that stays secondary to the crime analysis.

---

## Scope Guardrails

| Option | Description | Selected |
|--------|-------------|----------|
| Demo-local only | Keep all new context isolated to `/dashboard-demo` | ✓ |
| Stable route changes | Modify `/stats` and `/stkde` directly | |
| Generic BI expansion | Turn the demo into a broad data warehouse UI | |

**Working direction:** The phase enriches the demo, not the stable routes or the project scope.

---

*Phase: 08-contextual-data-enrichment*
