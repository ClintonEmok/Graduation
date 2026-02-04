'use client';

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import type { FeatureFlag, FeatureStatus } from '@/lib/feature-flags';

interface FeatureFlagItemProps {
  flag: FeatureFlag;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const statusVariants: Record<FeatureStatus, 'default' | 'secondary' | 'destructive'> = {
  stable: 'default',
  beta: 'secondary',
  experimental: 'destructive',
};

export function FeatureFlagItem({ flag, isEnabled, onToggle }: FeatureFlagItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={flag.id} className="text-sm font-medium">
            {flag.name}
          </Label>
          <Badge variant={statusVariants[flag.status]} className="text-xs">
            {flag.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{flag.description}</p>
      </div>
      <Switch
        id={flag.id}
        checked={isEnabled}
        onCheckedChange={onToggle}
        className="ml-4"
      />
    </div>
  );
}
