import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('/dashboard-demo shell', () => {
  test('renders the demo shell through DashboardDemoShell', () => {
    const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    const shellSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoShell.tsx', import.meta.url), 'utf8');
    const railTabsSource = readFileSync(new URL('../../components/dashboard-demo/DashboardDemoRailTabs.tsx', import.meta.url), 'utf8');
    const demoStatsSource = readFileSync(new URL('../../components/dashboard-demo/DemoStatsPanel.tsx', import.meta.url), 'utf8');
    const demoStkdePanelSource = readFileSync(new URL('../../components/dashboard-demo/DemoStkdePanel.tsx', import.meta.url), 'utf8');
    const demoAnalysisStoreSource = readFileSync(new URL('../../store/useDashboardDemoAnalysisStore.ts', import.meta.url), 'utf8');
    const demoNeighborhoodStatsSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/useDemoNeighborhoodStats.ts', import.meta.url),
      'utf8'
    );
    const demoStkdeHookSource = readFileSync(new URL('../../components/dashboard-demo/lib/useDemoStkde.ts', import.meta.url), 'utf8');
    const demoTimelinePanelSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoTimelinePanel.tsx', import.meta.url),
      'utf8'
    );
    const demoMapVisualizationSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoMapVisualization.tsx', import.meta.url),
      'utf8'
    );
    const demoStatsMapOverlaySource = readFileSync(
      new URL('../../components/dashboard-demo/DemoStatsMapOverlay.tsx', import.meta.url),
      'utf8'
    );
    const demoSlicePanelSource = readFileSync(
      new URL('../../components/dashboard-demo/DemoSlicePanel.tsx', import.meta.url),
      'utf8'
    );
    const demoBurstGenerationSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/demo-burst-generation.ts', import.meta.url),
      'utf8'
    );
    const demoWarpMapSource = readFileSync(
      new URL('../../components/dashboard-demo/lib/demo-warp-map.ts', import.meta.url),
      'utf8'
    );
    const timeslicingModeStoreSource = readFileSync(new URL('../../store/useTimeslicingModeStore.ts', import.meta.url), 'utf8');
    const demoTimeslicingModeStoreSource = readFileSync(
      new URL('../../store/useDashboardDemoTimeslicingModeStore.ts', import.meta.url),
      'utf8'
    );
    const timesliceToolbarSource = readFileSync(
      new URL('../../components/timeslicing/TimesliceToolbar.tsx', import.meta.url),
      'utf8'
    );
    const mapVisualizationSource = readFileSync(new URL('../../components/map/MapVisualization.tsx', import.meta.url), 'utf8');
    const demoDualTimelineSource = readFileSync(
      new URL('../../components/timeline/DemoDualTimeline.tsx', import.meta.url),
      'utf8'
    );
    const workflowSkeletonSource = readFileSync(
      new URL('../../components/dashboard-demo/WorkflowSkeleton.tsx', import.meta.url),
      'utf8'
    );

    expect(pageSource).toMatch(/DashboardDemoShell/);
    expect(shellSource).toMatch(/WorkflowSkeleton/);
    expect(shellSource).toMatch(/Phase 13 guided analysis workflow/);
    expect(shellSource).toMatch(/Orient → Find → Compare → Inspect → Explain → Apply/);
    expect(shellSource).toMatch(/useDashboardDemoSelectionStory/);
    expect(workflowSkeletonSource).toMatch(/Selection-first drafts/);
    expect(workflowSkeletonSource).toMatch(/Generate selection-first drafts/);
    expect(workflowSkeletonSource).toMatch(/Brushed selection is canonical/);
    expect(workflowSkeletonSource).toMatch(/Daily is the default granularity/);
    expect(workflowSkeletonSource).toMatch(/Weekly/);
    expect(workflowSkeletonSource).toMatch(/Monthly/);
    expect(workflowSkeletonSource).toMatch(/All crime types/);
    expect(workflowSkeletonSource).toMatch(/Muted neutral partition/);
    expect(workflowSkeletonSource).toMatch(/toast\.(success|error)/);
    expect(workflowSkeletonSource).toMatch(/generateBurstDraftBinsFromWindows/);
    expect(workflowSkeletonSource).toMatch(/Apply draft slices/);
    expect(workflowSkeletonSource).toMatch(/applyGeneratedBins/);
    expect(workflowSkeletonSource).toMatch(/Clear draft/);
    expect(workflowSkeletonSource).toMatch(/pendingGeneratedBins/);
    expect(workflowSkeletonSource).toMatch(/Granularity/);
    expect(workflowSkeletonSource).toMatch(/Crime types/);
    expect(shellSource).toMatch(/DemoMapVisualization/);
    expect(shellSource).toMatch(/CubeVisualization/);
    expect(shellSource).toMatch(/DemoTimelinePanel/);
    expect(shellSource).toMatch(/DashboardDemoRailTabs/);
    expect(shellSource).toMatch(/loadSummaryData/);
    expect(shellSource).toMatch(/useViewportStore/);
    expect(shellSource).toMatch(/setViewport/);
    expect(shellSource).toMatch(/z-40/);
    expect(shellSource).toMatch(/Show map viewport/);
    expect(shellSource).toMatch(/Show cube viewport/);
    expect(demoMapVisualizationSource).toMatch(/Show STKDE overlay|Hide STKDE overlay/);
    expect(demoMapVisualizationSource).toMatch(/DemoStatsMapOverlay/);
    expect(demoMapVisualizationSource).toMatch(/stkdeVisibleOverride/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoAnalysisStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoFilterStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoAdaptiveStore/);
    expect(demoMapVisualizationSource).toMatch(/useDashboardDemoMapLayerStore/);
    expect(shellSource).not.toMatch(/Map-first shared viewport|2D map|3D cube|generationStatus|lastGeneratedMetadata|\bTimelinePanel\b/);
    expect(railTabsSource).toMatch(/TabsTrigger value="stats"/);
    expect(railTabsSource).toMatch(/TabsTrigger value="stkde"/);
    expect(railTabsSource).toMatch(/TabsTrigger value="slices"/);
    expect(railTabsSource).toMatch(/TabsTrigger value="explain"/);
    expect(railTabsSource).toMatch(/DemoStatsPanel/);
    expect(railTabsSource).toMatch(/DemoStkdePanel/);
    expect(railTabsSource).toMatch(/DemoExplainPanel/);
    expect(demoAnalysisStoreSource).toMatch(/useDashboardDemoAnalysisStore/);
    expect(demoAnalysisStoreSource).toMatch(/selectedDistricts/);
    expect(demoAnalysisStoreSource).toMatch(/stkdeParams/);
    expect(demoNeighborhoodStatsSource).toMatch(/useDashboardDemoAnalysisStore/);
    expect(demoNeighborhoodStatsSource).toMatch(/aggregateStats/);
    expect(demoNeighborhoodStatsSource).toMatch(/transformStatsSummary/);
    expect(demoStkdeHookSource).toMatch(/callerIntent: 'dashboard-demo'/);
    expect(demoStkdeHookSource).toMatch(/buildStkdeViewModel/);
    expect(demoStkdeHookSource).toMatch(/DEFAULT_STKDE_BBOX/);
    expect(demoStatsSource).toMatch(/Stats Summary/);
    expect(demoStatsSource).toMatch(/selectedDistrictLabels/);
    expect(demoStatsSource).toMatch(/Spatial distribution/);
    expect(demoStatsSource).toMatch(/TabsList/);
    expect(demoStatsSource).toMatch(/TabsTrigger value="hourly"/);
    expect(demoStatsSource).toMatch(/TabsTrigger value="daily"/);
    expect(demoStatsSource).toMatch(/TabsTrigger value="monthly"/);
    expect(demoStatsSource).toMatch(/TabsContent value="hourly"/);
    expect(demoStatsSource).toMatch(/TabsContent value="daily"/);
    expect(demoStatsSource).toMatch(/TabsContent value="monthly"/);
    expect(demoStatsSource).toMatch(/Hourly pulse/);
    expect(demoStatsSource).toMatch(/Daily trend/);
    expect(demoStatsSource).toMatch(/Monthly trend/);
    expect(demoStatsSource).toMatch(/PulseChart/);
    expect(demoStatsMapOverlaySource).toMatch(/heatmap/);
    expect(demoStatsMapOverlaySource).toMatch(/demo-stats-districts/);
    expect(demoStatsMapOverlaySource).toMatch(/chicago-police-districts\.geojson/);
    expect(demoStatsMapOverlaySource).toMatch(/dist_num/);
    expect(demoStatsMapOverlaySource).toMatch(/dist_label/);
    expect(demoStatsMapOverlaySource).toMatch(/selectedDistricts/);
    expect(mapVisualizationSource).toMatch(/statsOverlay/);
    expect(demoStkdePanelSource).toMatch(/STKDE Rail/);
    expect(demoStkdePanelSource).toMatch(/Presets/);
    expect(demoStkdePanelSource).toMatch(/Focus|Balanced|Wide/);
    expect(demoStkdePanelSource).toMatch(/Parameters are preset-only in the demo rail/);
    expect(demoStkdePanelSource).toMatch(/District hotspots/);
    expect(demoStkdePanelSource).toMatch(/District context/);
    expect(demoStkdePanelSource).toMatch(/No hotspots found for the current district context/);
    expect(demoStkdePanelSource).not.toMatch(/Spatial BW|Temporal BW|Grid cell|Top K|Min support|Time window|type="number"|Intensity/);
    expect(demoTimelinePanelSource).toMatch(/DemoDualTimeline/);
    expect(demoTimelinePanelSource).toMatch(/useDashboardDemoWarpStore/);
    expect(demoTimelinePanelSource).toMatch(/useDashboardDemoTimeStore/);
    expect(demoTimelinePanelSource).toMatch(/Warp factor/);
    expect(demoTimelinePanelSource).toMatch(/Warp source/);
    expect(demoTimelinePanelSource).toMatch(/Window: \{summary\.selectedWindowLabel\}/);
    expect(demoTimelinePanelSource).toMatch(/Linked: \{summary\.linkedHighlightLabel\}/);
    expect(demoTimelinePanelSource).toMatch(/Slice-authored|Density/);
    expect(demoTimelinePanelSource).not.toMatch(/isPlaying|togglePlay|setSpeed|FastForward|Pause|Play|requestAnimationFrame/);
    expect(demoTimelinePanelSource).toMatch(/Overview is sampled across the full dataset|brush selects the active detail window/);
    expect(demoTimelinePanelSource).not.toMatch(/useSliceStore|useTimeslicingModeStore|Slice companion|Side panel/);
    expect(railTabsSource).toMatch(/Tabs/);
    expect(railTabsSource).toMatch(/DemoSlicePanel/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoSliceStore/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoWarpStore/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoTimeStore/);
    expect(demoSlicePanelSource).toMatch(/useDashboardDemoTimeslicingModeStore/);
    expect(demoSlicePanelSource).toMatch(/Selection-first drafts/);
    expect(demoSlicePanelSource).toMatch(/Slice Companion/);
    expect(demoSlicePanelSource).toMatch(/Pending selection-first drafts/);
    expect(demoSlicePanelSource).toMatch(/editable before apply/);
    expect(demoSlicePanelSource).toMatch(/Details/);
    expect(demoSlicePanelSource).toMatch(/Open draft details/);
    expect(demoSlicePanelSource).toMatch(/DialogContent|DialogTitle|DialogDescription/);
    expect(demoSlicePanelSource).toMatch(/selectedSliceId/);
    expect(demoSlicePanelSource).toMatch(/selectedDraftId/);
    expect(demoSlicePanelSource).toMatch(/mergePendingGeneratedBins|splitPendingGeneratedBin|deletePendingGeneratedBin/);
    expect(demoSlicePanelSource).toMatch(/B \{formatBurstCoefficient\(|State /);
    expect(demoSlicePanelSource).toMatch(/Generate selection-first drafts/);
    expect(demoSlicePanelSource).toMatch(/toast\.(success|error)/);
    expect(demoSlicePanelSource).toMatch(/Muted neutral partition keeps the brushed selection evenly split/);
    expect(demoSlicePanelSource).toMatch(/Brushed selection is canonical/);
    expect(demoSlicePanelSource).toMatch(/datetime-local/);
    expect(demoSlicePanelSource).toMatch(/warpEnabled|Warp enabled|Warp disabled/);
    expect(demoSlicePanelSource).toMatch(/warpWeight|Warp strength/);
    expect(demoSlicePanelSource).toMatch(/Warp x|Warp off/);
    expect(demoSlicePanelSource).toMatch(/epochSecondsToNormalized/);
    expect(demoSlicePanelSource).toMatch(/setTimeScaleMode|setWarpFactor|resetWarp/);
    expect(demoBurstGenerationSource).not.toMatch(/preset-bias|fallback to preset-bias/i);
    expect(demoBurstGenerationSource).toMatch(/buildDemoBurstWindowsFromSelection/);
    expect(demoBurstGenerationSource).toMatch(/buildBurstWindowsFromSeries/);
    expect(demoBurstGenerationSource).toMatch(/monthly/);
    expect(demoWarpMapSource).toMatch(/scoreComparableWarpBins/);
    expect(demoWarpMapSource).toMatch(/buildComparableWarpMap/);
    expect(demoWarpMapSource).toMatch(/ComparableWarpBinInput/);
    expect(demoWarpMapSource).toMatch(/buildSampleWarpMapFromComparableWarp/);
    expect(demoWarpMapSource).toMatch(/minimumWidthShare/);
    expect(demoTimeslicingModeStoreSource).toMatch(/generateBurstDraftBinsFromWindows/);
    expect(timeslicingModeStoreSource).not.toMatch(/presetBiases|setPresetBias|resetPresetBias|resetAllPresetBiases/);
    expect(timeslicingModeStoreSource).not.toMatch(/generateBinsFromActivePresetBias|PRESET_GENERATION_PROFILES|resolvePresetBiasBinTarget/);
    expect(timesliceToolbarSource).not.toMatch(/Bias|Active|Reset preset|Reset all/);
    expect(demoDualTimelineSource).toMatch(/DemoDualTimeline/);
    expect(demoDualTimelineSource).toMatch(/buildDemoSliceAuthoredWarpMap/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoWarpStore/);
    expect(demoDualTimelineSource).toMatch(/warpSource/);
    expect(demoDualTimelineSource).toMatch(/computeDensityMap/);
    expect(demoDualTimelineSource).toMatch(/setPrecomputedMaps/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoSliceStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoTimeStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoFilterStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoCoordinationStore/);
    expect(demoDualTimelineSource).toMatch(/useDashboardDemoTimeslicingModeStore/);
    expect(demoDualTimelineSource).toMatch(/useDemoTimelineSummary/);
    expect(demoDualTimelineSource).toMatch(/selectedWindowLabel/);
    expect(demoDualTimelineSource).toMatch(/hasVisibleWarpSlices/);
    expect(demoDualTimelineSource).toMatch(/warpEnabled/);
    expect(demoDualTimelineSource).toMatch(/useDemoTimelineSummary/);
    expect(demoDualTimelineSource).toMatch(/brushRangeLabel/);
    expect(demoDualTimelineSource).toMatch(/isGeneratedDraft/);
    expect(demoDualTimelineSource).toMatch(/overviewInteractionScale|detailInteractionScale/);
    expect(demoDualTimelineSource).not.toMatch(/adaptiveWarpMapOverride|adaptiveWarpDomainOverride|warpOverlayBandsOverride/);
    expect(demoDualTimelineSource).not.toMatch(/timeStoreOverride|filterStoreOverride|coordinationStoreOverride|adaptiveStoreOverride|sliceDomainStoreOverride|timeslicingModeStoreOverride/);
    expect(demoDualTimelineSource).not.toMatch(/showWarpConnectors|warpConnectorStyle/);
    expect(workflowSkeletonSource).toMatch(/Orient/);
    expect(workflowSkeletonSource).toMatch(/Find/);
    expect(workflowSkeletonSource).toMatch(/Compare/);
    expect(workflowSkeletonSource).toMatch(/Inspect/);
    expect(workflowSkeletonSource).toMatch(/Explain/);
    expect(workflowSkeletonSource).toMatch(/Apply/);
    expect(workflowSkeletonSource).not.toMatch(/buildDemoBurstWindowsFromSelection|burstWindows|useDashboardDemoWarpStore|useDashboardDemoAdaptiveStore/);
  });

  test('keeps the stable dashboard route on Phase 1 composition', () => {
    const dashboardPageSource = readFileSync(new URL('../dashboard/page.tsx', import.meta.url), 'utf8');
    const statsRouteSource = readFileSync(new URL('../stats/lib/StatsRouteShell.tsx', import.meta.url), 'utf8');
    const stkdeRouteSource = readFileSync(new URL('../stkde/lib/StkdeRouteShell.tsx', import.meta.url), 'utf8');
    const timeslicingPageSource = readFileSync(new URL('../timeslicing/page.tsx', import.meta.url), 'utf8');

    expect(dashboardPageSource).toMatch(/DashboardLayout/);
    expect(dashboardPageSource).toMatch(/MapVisualization/);
    expect(dashboardPageSource).toMatch(/CubeVisualization/);
    expect(dashboardPageSource).toMatch(/TimelinePanel/);
    expect(dashboardPageSource).not.toMatch(/DashboardDemoShell|DemoTimelinePanel|DemoDualTimeline|Map-first shared viewport|WorkflowSkeleton/);
    expect(dashboardPageSource).not.toMatch(/useDashboardDemoWarpStore|buildDemoSliceAuthoredWarpMap/);
    expect(statsRouteSource).not.toMatch(/useDashboardDemoAnalysisStore/);
    expect(stkdeRouteSource).not.toMatch(/useDashboardDemoAnalysisStore/);
    expect(timeslicingPageSource).not.toMatch(/DashboardDemoShell|DemoTimelinePanel|DemoDualTimeline|useDashboardDemoWarpStore|buildDemoSliceAuthoredWarpMap/);
  });

  test('keeps applied-state text inside the STKDE panel instead of the viewport shell', () => {
    const stkdePanelSource = readFileSync(new URL('../../components/stkde/DashboardStkdePanel.tsx', import.meta.url), 'utf8');

    expect(stkdePanelSource).toMatch(/Applied state carried forward|No applied state yet/);
    expect(stkdePanelSource).not.toMatch(/Ready for applied state handoff/);
  });

  test('keeps the timeslicing workflow shell separate from the demo chrome', () => {
    const timeslicingPageSource = readFileSync(new URL('../timeslicing/page.tsx', import.meta.url), 'utf8');
    const workflowShellSource = readFileSync(
      new URL('../timeslicing/components/TimeslicingWorkflowShell.tsx', import.meta.url),
      'utf8'
    );

    expect(workflowShellSource).toMatch(/Workflow shell/);
    expect(workflowShellSource).toMatch(/Generate → Review → Apply/);
    expect(timeslicingPageSource).not.toMatch(/DashboardDemoShell|Map-first shared viewport|WorkflowSkeleton/);
    expect(timeslicingPageSource).not.toMatch(/Generate burst drafts|generateBurstDraftBinsFromWindows|Burst draft/);
  });
});
