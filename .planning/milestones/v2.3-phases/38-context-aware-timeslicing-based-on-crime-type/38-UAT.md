---
status: testing
phase: 38-context-aware-timeslicing-based-on-crime-type
source: 38-01-SUMMARY.md, 38-02-SUMMARY.md, 38-03-SUMMARY.md
started: 2026-03-01T00:00:00Z
updated: 2026-03-01T00:00:00Z
---

## Current Test

number: 1
name: Crime Type Filter and Scope Toggle
expected: |
  Go to /timeslicing. Open suggestion toolbar. Select a crime type filter (e.g., "Theft"). Toggle between "Analyze Visible" and "Analyze All" modes. Both should respond and the selected mode should persist in generation.
awaiting: user response

## Tests

### 1. Crime Type Filter and Scope Toggle
expected: Go to /timeslicing. Open suggestion toolbar. Select a crime type filter (e.g., "Theft"). Toggle between "Analyze Visible" and "Analyze All" modes. Both should respond and the selected mode should persist in generation.
result: [pending]

### 2. Smart Profile Detection Badge
expected: With a specific crime type filter active (e.g., filter to "Burglary"), generate suggestions. A smart profile badge (e.g., "Burglary Focus") should appear indicating the auto-detected context.
result: [pending]

### 3. Custom Profile Save and Load
expected: Open ProfileManager in suggestion panel. Create a custom profile with a name (e.g., "My Theft Profile") with specific crime type filters. Save it. Reload page. The profile should persist and can be loaded to restore filters.
result: [pending]

### 4. Custom Profile Delete
expected: In ProfileManager, delete an existing custom profile. It should be removed from the list and no longer available after reload.
result: [pending]

### 5. Context Badge on Suggestion Cards
expected: Generate suggestions. Each suggestion card should display a context badge showing which crime types and scope (visible/all) were used to generate it.
result: [pending]

### 6. Context Metadata in History
expected: Accept a suggestion. Open the history section. The accepted entry should show context metadata (crime types, time range, profile name if used) so you know what generated it.
result: [pending]

### 7. Debounced Auto-Regeneration
expected: Change crime type filter. Wait 750ms+. Suggestions should auto-regenerate with the new context. Rapid filter changes should not trigger multiple generations (debounce + in-flight guard working).
result: [pending]

### 8. Visible vs All Mode Changes Generation Range
expected: With "Analyze Visible" mode, suggestions should be scoped to the current viewport. Switch to "Analyze All" and suggestions should cover the full selected time range. The difference should be observable in suggestion counts or patterns.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
