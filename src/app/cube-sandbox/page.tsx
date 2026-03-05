"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SandboxContextPanel } from "./components/SandboxContextPanel";
import { SandboxShell } from "./components/SandboxShell";
import { resetSandboxState } from "./lib/resetSandboxState";
import { useWarpProposalStore } from "@/store/useWarpProposalStore";

export default function CubeSandboxPage() {
  const hasBootstrapped = useRef(false);
  const [isResetting, setIsResetting] = useState(false);
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
      clearWarpProposals();
    };
  }, [clearWarpProposals]);

  const contextPanel = (
    <SandboxContextPanel onReset={() => void handleReset()} isResetting={isResetting} />
  );

  return <SandboxShell contextPanel={contextPanel} />;
}
