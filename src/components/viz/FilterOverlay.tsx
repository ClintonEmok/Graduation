"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFilterStore } from "@/store/useFilterStore";
import { getCrimeTypeId, getDistrictId } from "@/lib/category-maps";
import { PresetManager } from "@/components/viz/PresetManager";

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FacetItem {
  name: string;
  count: number;
}

interface FacetsResponse {
  types: FacetItem[];
  districts: FacetItem[];
}

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
  const selectedTypes = useFilterStore((state) => state.selectedTypes);
  const selectedDistricts = useFilterStore((state) => state.selectedDistricts);
  const setTypes = useFilterStore((state) => state.setTypes);
  const setDistricts = useFilterStore((state) => state.setDistricts);
  const clearAllPresets = useFilterStore((state) => state.clearAllPresets);
  const hasPresets = useFilterStore((state) => state.hasPresets());

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"types" | "districts" | "time" | "presets">(
    "types"
  );
  const [facetData, setFacetData] = useState<FacetsResponse>({ types: [], districts: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [facetError, setFacetError] = useState<string | null>(null);
  const fallbackRangeRef = useRef<[number, number]>([0, Math.floor(Date.now() / 1000)]);

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

  const activeRange = useMemo(
    () => selectedTimeRange ?? fallbackRangeRef.current,
    [selectedTimeRange]
  );

  useEffect(() => {
    if (!isOpen) return;
    const [start, end] = activeRange;
    const controller = new AbortController();

    const fetchFacets = async () => {
      setIsLoading(true);
      setFacetError(null);
      try {
        const response = await fetch(`/api/crime/facets?start=${start}&end=${end}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load facets (${response.status})`);
        }
        const data = (await response.json()) as FacetsResponse;
        setFacetData({
          types: Array.isArray(data.types) ? data.types : [],
          districts: Array.isArray(data.districts) ? data.districts : [],
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setFacetError(error instanceof Error ? error.message : "Failed to load facets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacets();
    return () => controller.abort();
  }, [activeRange, isOpen]);

  const typeOptions = useMemo(() => {
    return [...facetData.types]
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        id: getCrimeTypeId(item.name),
      }));
  }, [facetData.types]);

  const districtOptions = useMemo(() => {
    return [...facetData.districts]
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        id: getDistrictId(item.name),
      }));
  }, [facetData.districts]);

  const allTypeIds = useMemo(() => {
    return Array.from(new Set(typeOptions.map((item) => item.id)));
  }, [typeOptions]);

  const allDistrictIds = useMemo(() => {
    return Array.from(new Set(districtOptions.map((item) => item.id)));
  }, [districtOptions]);

  const filteredTypes = useMemo(() => {
    const query = typeQuery.trim().toLowerCase();
    if (!query) return typeOptions;
    return typeOptions.filter((item) => item.name.toLowerCase().includes(query));
  }, [typeOptions, typeQuery]);

  const filteredDistricts = useMemo(() => {
    const query = districtQuery.trim().toLowerCase();
    if (!query) return districtOptions;
    return districtOptions.filter((item) => item.name.toLowerCase().includes(query));
  }, [districtOptions, districtQuery]);

  const isAllTypesSelected = selectedTypes.length === 0;
  const isAllDistrictsSelected = selectedDistricts.length === 0;

  const handleTypeToggle = (id: number, nextChecked: boolean) => {
    if (isAllTypesSelected) {
      if (!nextChecked) {
        setTypes(allTypeIds.filter((typeId) => typeId !== id));
      }
      return;
    }
    if (nextChecked) {
      setTypes(Array.from(new Set([...selectedTypes, id])));
    } else {
      setTypes(selectedTypes.filter((typeId) => typeId !== id));
    }
  };

  const handleDistrictToggle = (id: number, nextChecked: boolean) => {
    if (isAllDistrictsSelected) {
      if (!nextChecked) {
        setDistricts(allDistrictIds.filter((districtId) => districtId !== id));
      }
      return;
    }
    if (nextChecked) {
      setDistricts(Array.from(new Set([...selectedDistricts, id])));
    } else {
      setDistricts(selectedDistricts.filter((districtId) => districtId !== id));
    }
  };

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

        <div className="border-b border-border px-4 py-2">
          <div className="flex gap-2 text-xs font-medium">
            {(
              [
                { id: "types", label: "Types" },
                { id: "districts", label: "Districts" },
                { id: "time", label: "Time Range" },
                { id: "presets", label: "Presets" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-2 py-1 transition-colors ${
                  activeTab === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-4 py-4">
          {activeTab === "types" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Crime Type</h3>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <button className="hover:text-foreground" onClick={() => setTypes(allTypeIds)}>
                    Select All
                  </button>
                  <span>/</span>
                  <button className="hover:text-foreground" onClick={() => setTypes([])}>
                    Clear
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search crime types"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={typeQuery}
                onChange={(event) => setTypeQuery(event.target.value)}
              />
              <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Loading crime types…</p>
                )}
                {!isLoading && filteredTypes.length === 0 && (
                  <p className="text-xs text-muted-foreground">No matching crime types.</p>
                )}
                {filteredTypes.map((item) => {
                  const checked = isAllTypesSelected || selectedTypes.includes(item.id);
                  return (
                    <label key={`${item.name}-${item.id}`} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(event) => handleTypeToggle(item.id, event.target.checked)}
                        />
                        {item.name}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {item.count.toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "districts" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">District</h3>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <button className="hover:text-foreground" onClick={() => setDistricts(allDistrictIds)}>
                    Select All
                  </button>
                  <span>/</span>
                  <button className="hover:text-foreground" onClick={() => setDistricts([])}>
                    Clear
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="Search districts"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={districtQuery}
                onChange={(event) => setDistrictQuery(event.target.value)}
              />
              <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Loading districts…</p>
                )}
                {!isLoading && filteredDistricts.length === 0 && (
                  <p className="text-xs text-muted-foreground">No matching districts.</p>
                )}
                {filteredDistricts.map((item) => {
                  const checked = isAllDistrictsSelected || selectedDistricts.includes(item.id);
                  return (
                    <label key={`${item.name}-${item.id}`} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(event) => handleDistrictToggle(item.id, event.target.checked)}
                        />
                        {item.name}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {item.count.toLocaleString()}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "time" && (
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
              {facetError && <p className="text-xs text-destructive">{facetError}</p>}
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
          )}

          {activeTab === "presets" && (
            <section className="space-y-4">
              <PresetManager onPresetLoaded={onClose} />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Clear all saved presets</p>
                <button
                  onClick={clearAllPresets}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  disabled={!hasPresets}
                >
                  Clear All
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
