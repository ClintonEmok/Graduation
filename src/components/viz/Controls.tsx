"use client";

import { useState } from "react";
import { Filter, Home, Layers, Settings } from "lucide-react";
import { FilterOverlay } from "./FilterOverlay";

export function Controls() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Home"
        >
          <Home className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Layers"
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        <div className="h-5 w-px bg-border" />
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Filters"
          onClick={() => setIsFilterOpen((open) => !open)}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      <FilterOverlay isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    </>
  );
}
