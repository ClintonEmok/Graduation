"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  adjustBoundary,
  resolveNeighborCandidates,
  resolveSnapIntervalSec,
  type AdjustmentHandle,
} from "@/app/timeline-test/lib/slice-adjustment";
import { useAdaptiveStore } from "@/store/useAdaptiveStore";
import { useDataStore } from "@/store/useDataStore";
import {
  selectActiveSliceId,
  selectDraggingHandle,
  selectDraggingSliceId,
  selectLiveBoundarySec,
  selectSelectedIds,
  selectSlices,
  useSliceDomainStore,
} from "@/store/useSliceDomainStore";
import { useTimeStore } from "@/store/useTimeStore";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sampleWarpSeconds = (
  linearSec: number,
  warpMap: Float32Array,
  warpDomain: [number, number]
) => {
  if (warpMap.length === 0) return linearSec;
  const [warpStartSec, warpEndSec] = warpDomain;
  const warpSpan = Math.max(1e-9, warpEndSec - warpStartSec);
  const normalized = clamp((linearSec - warpStartSec) / warpSpan, 0, 1);
  const rawIndex = normalized * (warpMap.length - 1);
  const low = Math.floor(rawIndex);
  const high = Math.min(low + 1, warpMap.length - 1);
  const frac = rawIndex - low;
  const lowVal = warpMap[Math.max(0, low)] ?? linearSec;
  const highVal = warpMap[Math.max(0, high)] ?? lowVal;
  return lowVal * (1 - frac) + highVal * frac;
};

type DragState = {
  sliceId: string;
  handle: AdjustmentHandle;
  pointerId: number;
};

export function TimeSlices3D() {
  const slices = useSliceDomainStore(selectSlices);
  const addSlice = useSliceDomainStore((state) => state.addSlice);
  const updateSlice = useSliceDomainStore((state) => state.updateSlice);
  const setActiveSlice = useSliceDomainStore((state) => state.setActiveSlice);
  const activeSliceId = useSliceDomainStore(selectActiveSliceId);
  const getOverlapCounts = useSliceDomainStore((state) => state.getOverlapCounts);
  const selectedIds = useSliceDomainStore(selectSelectedIds);
  const selectSlice = useSliceDomainStore((state) => state.selectSlice);
  const toggleSlice = useSliceDomainStore((state) => state.toggleSlice);
  const clearSelection = useSliceDomainStore((state) => state.clearSelection);

  const beginDrag = useSliceDomainStore((state) => state.beginDrag);
  const updateDrag = useSliceDomainStore((state) => state.updateDrag);
  const endDrag = useSliceDomainStore((state) => state.endDrag);
  const snapEnabled = useSliceDomainStore((state) => state.snapEnabled);
  const snapMode = useSliceDomainStore((state) => state.snapMode);
  const fixedSnapPresetSec = useSliceDomainStore((state) => state.fixedSnapPresetSec);
  const draggingSliceId = useSliceDomainStore(selectDraggingSliceId);
  const draggingHandle = useSliceDomainStore(selectDraggingHandle);
  const liveBoundarySec = useSliceDomainStore(selectLiveBoundarySec);

  const minTimestampSec = useDataStore((state) => state.minTimestampSec);
  const maxTimestampSec = useDataStore((state) => state.maxTimestampSec);
  const warpMap = useAdaptiveStore((state) => state.warpMap);
  const mapDomain = useAdaptiveStore((state) => state.mapDomain);
  const warpFactor = useAdaptiveStore((state) => state.warpFactor);
  const timeScaleMode = useTimeStore((state) => state.timeScaleMode);

  const { camera, gl } = useThree();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverHandle, setHoverHandle] = useState<string | null>(null);
  const [hoveredSliceId, setHoveredSliceId] = useState<string | null>(null);

  const overlapCounts = getOverlapCounts();

  const domain = useMemo<[number, number]>(() => {
    const domainStart = minTimestampSec ?? mapDomain[0];
    const domainEnd = maxTimestampSec ?? mapDomain[1];
    if (domainEnd > domainStart) {
      return [domainStart, domainEnd];
    }
    return [0, 1];
  }, [mapDomain, maxTimestampSec, minTimestampSec]);

  const useAdaptiveMapping =
    timeScaleMode === "adaptive" && warpFactor > 0 && warpMap && warpMap.length > 1;

  const [domainStartSec, domainEndSec] = domain;
  const domainSpanSec = Math.max(1e-9, domainEndSec - domainStartSec);

  const percentToSec = (percent: number) =>
    domainStartSec + (clamp(percent, 0, 100) / 100) * domainSpanSec;

  const secToPercent = (sec: number) =>
    clamp(((sec - domainStartSec) / domainSpanSec) * 100, 0, 100);

  const { percentToY, yToPercent } = useMemo(() => {
    const span = Math.max(1e-9, domainEndSec - domainStartSec);

    const toDisplayTime = (percent: number) => {
      const linearSec = domainStartSec + (clamp(percent, 0, 100) / 100) * span;
      if (!useAdaptiveMapping) {
        return linearSec;
      }
      return (
        linearSec * (1 - warpFactor) +
        sampleWarpSeconds(linearSec, warpMap, mapDomain) * warpFactor
      );
    };

    const samplePercents = Array.from({ length: 101 }, (_, index) => index);
    const sampleDisplayTimes = samplePercents.map((percent) => toDisplayTime(percent));
    const minDisplayTime = sampleDisplayTimes[0] ?? 0;
    const maxDisplayTime = sampleDisplayTimes[sampleDisplayTimes.length - 1] ?? 1;
    const ySpan = Math.max(1e-9, maxDisplayTime - minDisplayTime);

    const percentToY = (percent: number) => {
      const display = toDisplayTime(percent);
      return ((display - minDisplayTime) / ySpan) * 100 - 50;
    };

    const yToPercent = (y: number) => {
      const targetDisplay = ((clamp(y, -50, 50) + 50) / 100) * ySpan + minDisplayTime;

      let lowIndex = 0;
      let highIndex = sampleDisplayTimes.length - 1;
      while (highIndex - lowIndex > 1) {
        const middle = Math.floor((lowIndex + highIndex) / 2);
        if ((sampleDisplayTimes[middle] ?? targetDisplay) < targetDisplay) {
          lowIndex = middle;
        } else {
          highIndex = middle;
        }
      }

      const lowDisplay = sampleDisplayTimes[lowIndex] ?? targetDisplay;
      const highDisplay = sampleDisplayTimes[highIndex] ?? lowDisplay;
      const t =
        highDisplay > lowDisplay
          ? clamp((targetDisplay - lowDisplay) / (highDisplay - lowDisplay), 0, 1)
          : 0;
      return clamp((lowIndex + (highIndex - lowIndex) * t) / 100, 0, 1) * 100;
    };

    return { percentToY, yToPercent };
  }, [
    domainEndSec,
    domainStartSec,
    mapDomain,
    useAdaptiveMapping,
    warpFactor,
    warpMap,
  ]);

  useEffect(() => {
    if (dragState || hoverHandle) {
      document.body.style.cursor = "ns-resize";
      return () => {
        document.body.style.cursor = "";
      };
    }

    return undefined;
  }, [dragState, hoverHandle]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const activeSlice = slices.find((slice) => slice.id === dragState.sliceId);
      if (!activeSlice || activeSlice.type !== "range" || !activeSlice.range) {
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const yNdc = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, yNdc), camera);

      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();

      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        cameraDir.clone().negate(),
        new THREE.Vector3(0, 0, 0)
      );

      const intersection = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!intersection) {
        return;
      }

      const rawPercent = yToPercent(intersection.y);
      const [sliceStart, sliceEnd] = [
        Math.min(activeSlice.range[0], activeSlice.range[1]),
        Math.max(activeSlice.range[0], activeSlice.range[1]),
      ];
      const fixedPercent = dragState.handle === "start" ? sliceEnd : sliceStart;

      const snapIntervalSec = resolveSnapIntervalSec({
        mode: snapMode,
        fixedPresetSec: fixedSnapPresetSec,
        domainStartSec,
        domainEndSec,
      });

      const [domainMin, domainMax] = [
        Math.min(domainStartSec, domainEndSec),
        Math.max(domainStartSec, domainEndSec),
      ];
      const gridCandidatesSec: number[] = [];
      const maxSteps = Math.ceil((domainMax - domainMin) / snapIntervalSec);
      for (let step = 0; step <= maxSteps; step += 1) {
        gridCandidatesSec.push(domainMin + step * snapIntervalSec);
      }

      const boundaries = slices
        .filter((slice) => slice.type === "range" && slice.range)
        .map((slice) => ({
          id: slice.id,
          startSec: percentToSec(Math.min(slice.range![0], slice.range![1])),
          endSec: percentToSec(Math.max(slice.range![0], slice.range![1])),
          isVisible: slice.isVisible,
        }));

      const adjusted = adjustBoundary({
        handle: dragState.handle,
        rawPointerSec: percentToSec(rawPercent),
        fixedBoundarySec: percentToSec(fixedPercent),
        domainStartSec,
        domainEndSec,
        minDurationSec: Math.max(60, snapIntervalSec * 0.25),
        snap: {
          enabled: snapEnabled,
          bypass: event.shiftKey,
          mode: snapMode,
          toleranceSec: snapIntervalSec * 0.35,
          gridCandidatesSec,
          neighborCandidatesSec: resolveNeighborCandidates({
            boundaries,
            activeSliceId: dragState.sliceId,
            handle: dragState.handle,
            domainStartSec,
            domainEndSec,
            fixedBoundarySec: percentToSec(fixedPercent),
          }),
        },
      });

      updateSlice(dragState.sliceId, {
        range: [adjusted.startNorm, adjusted.endNorm],
        time: (adjusted.startNorm + adjusted.endNorm) / 2,
      });

      updateDrag({
        limitCue: adjusted.limitCue,
        modifierBypass: event.shiftKey,
        liveBoundarySec: adjusted.appliedSec,
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      setDragState(null);
      endDrag();
      try {
        gl.domElement.releasePointerCapture(dragState.pointerId);
      } catch {
        // no-op: pointer can already be released by browser
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    camera,
    domainEndSec,
    domainStartSec,
    dragState,
    endDrag,
    fixedSnapPresetSec,
    gl.domElement,
    percentToSec,
    slices,
    snapEnabled,
    snapMode,
    updateDrag,
    updateSlice,
    yToPercent,
  ]);

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const percent = yToPercent(event.point.y);
    addSlice({ type: "point", time: percent });
  };

  const handleSliceClick = (event: ThreeEvent<MouseEvent>, sliceId: string) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      toggleSlice(sliceId);
      setActiveSlice(sliceId);
      return;
    }
    selectSlice(sliceId);
    setActiveSlice(sliceId);
  };

  const handleBoundaryDragStart = (
    event: ThreeEvent<PointerEvent>,
    sliceId: string,
    handle: AdjustmentHandle
  ) => {
    event.stopPropagation();
    selectSlice(sliceId);
    setActiveSlice(sliceId);
    beginDrag({ sliceId, handle });
    setDragState({ sliceId, handle, pointerId: event.pointerId });
    try {
      gl.domElement.setPointerCapture(event.pointerId);
    } catch {
      // no-op: pointer capture can fail in some browsers when not available
    }
  };

  return (
    <group>
      <mesh
        onDoubleClick={handleDoubleClick}
        onClick={(event) => {
          event.stopPropagation();
          clearSelection();
          setActiveSlice(null);
        }}
      >
        <boxGeometry args={[100, 100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {slices
        .filter((slice) => slice.isVisible)
        .map((slice) => {
          const isSelected = selectedIds.has(slice.id);

          if (slice.type === "range" && slice.range) {
            const start = Math.min(slice.range[0], slice.range[1]);
            const end = Math.max(slice.range[0], slice.range[1]);
            const startY = percentToY(start);
            const endY = percentToY(end);
            const height = Math.max(0.5, Math.abs(endY - startY));
            const centerY = (startY + endY) / 2;

            const previewHandleMatch =
              draggingSliceId === slice.id && draggingHandle && liveBoundarySec !== null;
            const previewY = previewHandleMatch ? percentToY(secToPercent(liveBoundarySec)) : null;
            const isActive = activeSliceId === slice.id;
            const isHovered = hoveredSliceId === slice.id;
            const overlapCount = overlapCounts[slice.id] ?? 1;

            return (
              <group key={slice.id} position={[0, centerY, 0]}>
                <mesh
                  onClick={(event) => handleSliceClick(event, slice.id)}
                  onPointerOver={(event) => {
                    event.stopPropagation();
                    setHoveredSliceId(slice.id);
                  }}
                  onPointerOut={() => {
                    setHoveredSliceId((current) =>
                      current === slice.id ? null : current
                    );
                  }}
                >
                  <boxGeometry args={[100, height, 100]} />
                  <meshBasicMaterial
                    color={
                      isActive
                        ? "#f59e0b"
                        : isSelected
                          ? "#60a5fa"
                          : slice.isBurst
                            ? "#f97316"
                            : "#22d3ee"
                    }
                    transparent
                    opacity={
                      isHovered
                        ? 0.42
                        : isSelected
                          ? 0.35
                          : slice.isBurst
                            ? 0.2
                            : 0.12
                    }
                    depthWrite={false}
                  />
                </mesh>
                {(isActive || isSelected || overlapCount > 1) && (
                  <mesh>
                    <boxGeometry args={[100.2, height + 0.2, 100.2]} />
                    <meshBasicMaterial
                      color={isActive ? "#f59e0b" : overlapCount > 1 ? "#c084fc" : "#60a5fa"}
                      wireframe
                      transparent
                      opacity={isHovered ? 0.8 : 0.58}
                      depthWrite={false}
                    />
                  </mesh>
                )}

                <mesh
                  position={[48, -height / 2, 48]}
                  onPointerDown={(event) =>
                    handleBoundaryDragStart(event, slice.id, "start")
                  }
                  onPointerOver={(event) => {
                    event.stopPropagation();
                    setHoverHandle(`${slice.id}:start`);
                  }}
                  onPointerOut={() => setHoverHandle(null)}
                >
                  <sphereGeometry args={[1.5, 12, 12]} />
                  <meshBasicMaterial
                    color={
                      draggingSliceId === slice.id && draggingHandle === "start"
                        ? "#f8fafc"
                        : "#38bdf8"
                    }
                  />
                </mesh>

                <mesh
                  position={[48, height / 2, 48]}
                  onPointerDown={(event) =>
                    handleBoundaryDragStart(event, slice.id, "end")
                  }
                  onPointerOver={(event) => {
                    event.stopPropagation();
                    setHoverHandle(`${slice.id}:end`);
                  }}
                  onPointerOut={() => setHoverHandle(null)}
                >
                  <sphereGeometry args={[1.5, 12, 12]} />
                  <meshBasicMaterial
                    color={
                      draggingSliceId === slice.id && draggingHandle === "end"
                        ? "#f8fafc"
                        : "#38bdf8"
                    }
                  />
                </mesh>

                {previewY !== null ? (
                  <mesh position={[0, previewY - centerY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.2, 50, 48]} />
                    <meshBasicMaterial color="#f8fafc" transparent opacity={0.35} depthWrite={false} />
                  </mesh>
                ) : null}

                {isHovered ? (
                  <Html position={[0, height / 2 + 3, 0]} center>
                    <div className="rounded-md border border-slate-700 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow">
                      <div className="font-medium">{slice.name ?? "Slice"}</div>
                      <div className="text-[10px] text-slate-300">
                        {start.toFixed(1)}% - {end.toFixed(1)}%
                      </div>
                      {overlapCount > 1 ? (
                        <div className="text-[10px] text-violet-300">
                          {overlapCount} overlap zones
                        </div>
                      ) : null}
                    </div>
                  </Html>
                ) : null}
              </group>
            );
          }

          const isActive = activeSliceId === slice.id;
          const isHovered = hoveredSliceId === slice.id;

          return (
            <group key={slice.id} position={[0, percentToY(slice.time), 0]}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(event) => handleSliceClick(event, slice.id)}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  setHoveredSliceId(slice.id);
                }}
                onPointerOut={() => {
                  setHoveredSliceId((current) =>
                    current === slice.id ? null : current
                  );
                }}
              >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial
                  color={
                    isActive
                      ? "#f59e0b"
                      : isSelected
                        ? "#60a5fa"
                        : slice.isBurst
                          ? "#f97316"
                          : "#22d3ee"
                  }
                  transparent
                  opacity={
                    isHovered
                      ? 0.75
                      : isSelected
                        ? 0.6
                        : slice.isBurst
                          ? 0.4
                          : 0.28
                  }
                  depthWrite={false}
                />
              </mesh>
              {(isActive || isSelected) && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
                  <ringGeometry args={[49.2, 50, 64]} />
                  <meshBasicMaterial
                    color={isActive ? "#f59e0b" : "#60a5fa"}
                    transparent
                    opacity={0.75}
                    depthWrite={false}
                  />
                </mesh>
              )}
              <gridHelper args={[100, 10]} position={[0, 0.05, 0]}>
                <meshBasicMaterial
                  color={isSelected ? "#60a5fa" : slice.isBurst ? "#f97316" : "#22d3ee"}
                  transparent
                  opacity={isSelected ? 0.45 : 0.2}
                />
              </gridHelper>
              {isHovered ? (
                <Html position={[0, 3, 0]} center>
                  <div className="rounded-md border border-slate-700 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 shadow">
                    <div className="font-medium">{slice.name ?? "Slice"}</div>
                    <div className="text-[10px] text-slate-300">{slice.time.toFixed(1)}%</div>
                  </div>
                </Html>
              ) : null}
            </group>
          );
        })}
    </group>
  );
}
