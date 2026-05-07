"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { SandboxContextPanel } from "./components/SandboxContextPanel";
import { SandboxShell } from "./components/SandboxShell";
import { resetSandboxState } from "./lib/resetSandboxState";
import { useIntervalProposalStore } from "@/store/useIntervalProposalStore";
import { useWarpProposalStore } from "@/store/useWarpProposalStore";

export default function CubeSandboxPage() {
  const hasBootstrapped = useRef(false);
  const [isResetting, setIsResetting] = useState(false);
  const clearIntervalProposals = useIntervalProposalStore((state) => state.clear);
  const clearWarpProposals = useWarpProposalStore((state) => state.clear);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetSandboxState();
    } finally {
      setIsResetting(false);
    }
  }, []);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    void handleReset();
  }, [handleReset]);

  useEffect(() => {
    return () => {
      clearIntervalProposals();
      clearWarpProposals();
    };
  }, [clearIntervalProposals, clearWarpProposals]);

  const contextPanel = (
    <SandboxContextPanel onReset={() => void handleReset()} isResetting={isResetting} />
  );

  return (
    <Suspense fallback={null}>
      <SandboxShell contextPanel={contextPanel} />
    </Suspense>
  );
}
