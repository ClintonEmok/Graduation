# Requirements: v1.1 Manual Timeslicing

**Milestone:** v1.1  
**Defined:** 2026-02-16  
**Core Value:** Users can manually segment the timeline into meaningful time regions by visually identifying density patterns and precisely adjusting region boundaries through direct manipulation.

## v1.1 Requirements

### Timeline Density Visualization

- [x] **DENS-01**: Timeline renders event density as clear visual regions (bars, gradient, or heat)
- [x] **DENS-02**: High-density areas are visually distinct from low-density areas
- [x] **DENS-03**: Density visualization updates when filters change
- [x] **DENS-04**: Density scale is consistent and readable

### Manual Slice Creation

- [ ] **SLICE-01**: User can create a time slice by clicking on timeline
- [ ] **SLICE-02**: User can create a time slice by dragging to define range
- [ ] **SLICE-03**: New slices have default duration (e.g., 1 hour) or match drag extent
- [ ] **SLICE-04**: Visual feedback during creation (preview region)
- [ ] **SLICE-05**: Slice appears immediately upon creation

### Slice Boundary Adjustment

- [ ] **ADJUST-01**: Each slice has draggable start handle
- [ ] **ADJUST-02**: Each slice has draggable end handle
- [ ] **ADJUST-03**: Handles are visually distinct and easy to target
- [ ] **ADJUST-04**: Dragging updates slice boundary in real-time
- [ ] **ADJUST-05**: Minimum slice duration enforced (e.g., 5 minutes)
- [ ] **ADJUST-06**: Snap-to-neighboring-slice option

### Multi-Slice Management

- [ ] **MULTI-01**: Multiple slices can exist simultaneously
- [ ] **MULTI-02**: Overlapping slices are visually indicated
- [ ] **MULTI-03**: Adjacent slices can be merged
- [ ] **MULTI-04**: User can select active slice (for editing)
- [ ] **MULTI-05**: User can delete individual slices
- [ ] **MULTI-06**: User can clear all slices

### Slice Metadata

- [ ] **META-01**: Each slice has editable name
- [ ] **META-02**: Each slice has selectable color
- [ ] **META-03**: Each slice has optional notes field
- [ ] **META-04**: Metadata is editable via inline panel or modal
- [ ] **META-05**: Metadata persists during session

### Timeline Integration

- [ ] **INTEG-01**: Slices render above or below density visualization
- [ ] **INTEG-02**: Slices don't obstruct timeline navigation (brush, zoom)
- [ ] **INTEG-03**: Selected slice is visually highlighted
- [ ] **INTEG-04**: Hover shows slice metadata tooltip

### Performance

- [ ] **PERF-01**: Creating slice < 100ms
- [ ] **PERF-02**: Adjusting boundary < 50ms (real-time)
- [ ] **PERF-03**: 50+ slices without UI lag

## Out of Scope (v1.1)

| Feature | Reason |
|---------|--------|
| 2D/3D slice visualization | Timeline-only focus for v1.1 |
| Slice statistics/analytics | Keep scope minimal |
| Semi-automated suggestions | v1.2 feature |
| Fully automated generation | v1.3 feature |
| Cross-view synchronization | v1.2+ feature |
| Slice persistence (save/load) | Session-only for v1.1 |
| Export functionality | Analytics milestone |

## Future Milestone Mapping

| Requirement | v1.1 | v1.2 | v1.3 |
|-------------|------|------|------|
| Manual creation | ✅ | ✅ | ✅ |
| Visual density | ✅ | ✅ | ✅ |
| Boundary adjust | ✅ | ✅ | ✅ |
| Semi-automated | ❌ | ✅ | ✅ |
| Auto-suggestions | ❌ | ✅ | ✅ |
| Fully automated | ❌ | ❌ | ✅ |
| 2D/3D sync | ❌ | ✅ | ✅ |
| Persistence | ❌ | ✅ | ✅ |

---

*Requirements for v1.1 Manual Timeslicing milestone*
