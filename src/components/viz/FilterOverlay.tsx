"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilterStore } from "@/store/useFilterStore";

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FacetItem {
  name: string;
  count: number;
}

const PLACEHOLDER_TYPES: FacetItem[] = [
  { name: "Theft", count: 1280 },
  { name: "Assault", count: 640 },
  { name: "Burglary", count: 420 },
  { name: "Robbery", count: 210 },
];

const PLACEHOLDER_DISTRICTS: FacetItem[] = [
  { name: "001", count: 340 },
  { name: "012", count: 280 },
  { name: "018", count: 210 },
  { name: "025", count: 180 },
];

const formatDate = (epochSeconds: number) => {
  const date = new Date(epochSeconds * 1000);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const toInputDate = (epochSeconds: number) => {
  const date = new Date(epochSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string) => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.floor(timestamp / 1000);
};

export function FilterOverlay({ isOpen, onClose }: FilterOverlayProps) {
  const selectedTimeRange = useFilterStore((state) => state.selectedTimeRange);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);
  const clearTimeRange = useFilterStore((state) => state.clearTimeRange);

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (selectedTimeRange) {
      setStartInput(toInputDate(selectedTimeRange[0]));
      setEndInput(toInputDate(selectedTimeRange[1]));
    } else {
      setStartInput("");
      setEndInput("");
    }
  }, [selectedTimeRange]);

  const timeRangeLabel = useMemo(() => {
    if (!selectedTimeRange) {
      return "All time";
    }
    return `${formatDate(selectedTimeRange[0])} - ${formatDate(selectedTimeRange[1])}`;
  }, [selectedTimeRange]);

  const handleDateChange = (nextStart: string, nextEnd: string) => {
    const startValue = parseInputDate(nextStart);
    const endValue = parseInputDate(nextEnd);
    if (startValue && endValue) {
      const [start, end] = startValue <= endValue ? [startValue, endValue] : [endValue, startValue];
      setTimeRange([start, end]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <button
        aria-label="Close filters"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Filters</p>
            <h2 className="text-lg font-semibold">Crime Facets</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 px-4 py-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Crime Type</h3>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <button className="hover:text-foreground">Select All</button>
                <span>/</span>
                <button className="hover:text-foreground">Clear</button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Search crime types"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
              {PLACEHOLDER_TYPES.map((item) => (
                <label key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" />
                    {item.name}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.count.toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">District</h3>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <button className="hover:text-foreground">Select All</button>
                <span>/</span>
                <button className="hover:text-foreground">Clear</button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Search districts"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
              {PLACEHOLDER_DISTRICTS.map((item) => (
                <label key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" />
                    {item.name}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {item.count.toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Time Range</h3>
              <button
                onClick={clearTimeRange}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{timeRangeLabel}</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted-foreground">
                Start
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={startInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setStartInput(nextValue);
                    handleDateChange(nextValue, endInput);
                  }}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                End
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={endInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setEndInput(nextValue);
                    handleDateChange(startInput, nextValue);
                  }}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
