"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SandboxContextPanel } from "./components/SandboxContextPanel";
import { SandboxShell } from "./components/SandboxShell";
import { resetSandboxState } from "./lib/resetSandboxState";

export default function CubeSandboxPage() {
  const hasBootstrapped = useRef(false);
  const [isResetting, setIsResetting] = useState(false);

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

  return (
    <SandboxShell
      contextPanel={<SandboxContextPanel onReset={() => void handleReset()} isResetting={isResetting} />}
    />
  );
}
