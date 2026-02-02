"use client";

import { useState } from 'react';
import { useStudyStore } from '@/store/useStudyStore';
import { useLogger } from '@/hooks/useLogger';
import { ClipboardList, Play, Square } from 'lucide-react';

export function StudyControls() {
  const { sessionId, participantId, startSession, endSession } = useStudyStore();
  const { log } = useLogger();
  const [isOpen, setIsOpen] = useState(false);
  const [pidInput, setPidInput] = useState('');

  const handleStart = () => {
    const pid = pidInput.trim() || undefined;
    startSession(pid);
    log('session_started', { participantId: pid });
    setPidInput('');
  };

  const handleStop = () => {
    log('session_ended');
    // flush logic is handled by logger interval or unload
    endSession();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 p-2 bg-background/80 backdrop-blur border rounded-full shadow-md text-muted-foreground hover:text-foreground"
        title="Study Controls"
      >
        <ClipboardList className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 p-4 bg-background/95 backdrop-blur border rounded-lg shadow-xl w-64 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Study Session</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      {sessionId ? (
        <div className="space-y-3">
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground">Session ID:</p>
            <p className="font-mono bg-muted p-1 rounded truncate">{sessionId}</p>
            <p className="text-muted-foreground mt-2">Participant:</p>
            <p className="font-mono font-medium">{participantId}</p>
          </div>
          
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Square className="w-4 h-4 fill-current" />
            End Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Participant ID (Optional)
            </label>
            <input
              type="text"
              value={pidInput}
              onChange={(e) => setPidInput(e.target.value)}
              placeholder="e.g. P001"
              className="w-full px-2 py-1.5 text-sm rounded-md border bg-background"
            />
          </div>
          
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Session
          </button>
        </div>
      )}
    </div>
  );
}
