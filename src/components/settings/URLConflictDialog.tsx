'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { FLAG_DEFINITIONS } from '@/lib/feature-flags';

interface URLConflictDialogProps {
  isOpen: boolean;
  urlFlags: Record<string, boolean> | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function URLConflictDialog({
  isOpen,
  urlFlags,
  onConfirm,
  onCancel,
}: URLConflictDialogProps) {
  if (!urlFlags) return null;

  // Find flags that will be enabled
  const enabledFlags = Object.entries(urlFlags)
    .filter(([, enabled]) => enabled)
    .map(([id]) => FLAG_DEFINITIONS.find((f) => f.id === id))
    .filter(Boolean);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply Shared Settings?</AlertDialogTitle>
          <AlertDialogDescription>
            This link contains a feature configuration. Applying these settings will override your current preferences.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {enabledFlags.length > 0 && (
          <div className="py-4">
            <p className="text-sm font-medium mb-2">Features to enable:</p>
            <div className="flex flex-wrap gap-2">
              {enabledFlags.map((flag) => (
                <Badge key={flag!.id} variant="secondary">
                  {flag!.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Keep My Settings
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Apply Shared Settings
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
