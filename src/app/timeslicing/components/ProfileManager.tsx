"use client";

import { useMemo, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useContextExtractor } from '@/hooks/useContextExtractor';
import { useSmartProfiles } from '@/hooks/useSmartProfiles';
import { useViewportStore } from '@/lib/stores/viewportStore';
import { useFilterStore } from '@/store/useFilterStore';
import { type ContextProfile, useContextProfileStore } from '@/store/useContextProfileStore';

function summarizeCrimeTypes(crimeTypes: string[]): string {
  if (crimeTypes.length === 0) {
    return 'All crimes';
  }
  if (crimeTypes.length === 1) {
    return crimeTypes[0];
  }
  return `${crimeTypes.length} crime types`;
}

export function ProfileManager() {
  const [expanded, setExpanded] = useState(false);

  const customProfiles = useContextProfileStore((state) => state.customProfiles);
  const activeProfileId = useContextProfileStore((state) => state.activeProfileId);
  const addCustomProfile = useContextProfileStore((state) => state.addCustomProfile);
  const deleteProfile = useContextProfileStore((state) => state.deleteProfile);
  const setActiveProfile = useContextProfileStore((state) => state.setActiveProfile);

  const setFilters = useViewportStore((state) => state.setFilters);
  const setViewport = useViewportStore((state) => state.setViewport);
  const setTimeRange = useFilterStore((state) => state.setTimeRange);

  const { getCurrentContext } = useContextExtractor();
  const currentContext = getCurrentContext('visible');
  const smartProfile = useSmartProfiles(currentContext);

  const profileRows = useMemo(
    () => [...customProfiles].sort((a, b) => b.createdAt - a.createdAt),
    [customProfiles]
  );

  const applyProfile = (profile: ContextProfile) => {
    const nextContext = profile.context;
    setFilters({
      crimeTypes: nextContext.crimeTypes,
      districts: nextContext.districts,
    });
    setViewport(nextContext.timeRange.start, nextContext.timeRange.end);
    setTimeRange([nextContext.timeRange.start, nextContext.timeRange.end]);
    setActiveProfile(profile.id);
    toast.success(`Loaded profile: ${profile.name}`);
  };

  const handleSaveProfile = () => {
    const name = window.prompt('Profile name', 'My context profile');
    if (!name) {
      return;
    }

    const profile = addCustomProfile(name, currentContext);
    if (!profile) {
      toast.error('Profile name already exists or is empty.');
      return;
    }

    toast.success(`Saved profile: ${profile.name}`);
  };

  const handleDelete = (profile: ContextProfile) => {
    const confirmed = window.confirm(`Delete profile "${profile.name}"?`);
    if (!confirmed) {
      return;
    }
    deleteProfile(profile.id);
    toast.success(`Deleted profile: ${profile.name}`);
  };

  return (
    <div className="border-b border-slate-700/70 px-4 py-3">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Bookmark className="size-4 text-slate-300" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-300">Context Profiles</span>
          {profileRows.length > 0 && (
            <span className="rounded-full border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
              {profileRows.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-slate-400" />
        ) : (
          <ChevronDown className="size-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900/70 p-2">
            <div className="text-xs text-slate-300">
              <div className="font-medium text-slate-200">Current context</div>
              <div className="text-slate-400">{summarizeCrimeTypes(currentContext.crimeTypes)}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveProfile} className="h-7 px-2 text-xs">
              <Save className="mr-1 size-3" />
              Save Profile
            </Button>
          </div>

          {smartProfile && (
            <div className="rounded border border-amber-700/70 bg-amber-900/20 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-amber-200">Smart profile: {smartProfile.name}</span>
                <span className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  Active
                </span>
              </div>
              <p className="mt-1 text-amber-100/85">{smartProfile.description}</p>
            </div>
          )}

          {profileRows.length === 0 ? (
            <p className="text-xs text-slate-500">No saved custom profiles yet.</p>
          ) : (
            <div className="space-y-2">
              {profileRows.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded border border-slate-700 bg-slate-900/60 p-2 text-xs text-slate-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-100">{profile.name}</span>
                        {activeProfileId === profile.id && (
                          <span className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-slate-400">
                        {summarizeCrimeTypes(profile.context.crimeTypes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => applyProfile(profile)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(profile)}
                        className="h-7 px-2 text-[11px] text-red-300 hover:text-red-200"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
