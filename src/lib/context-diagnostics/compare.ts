import type { DynamicProfileResult } from './profile';

export interface ProfileComparison {
  matches: boolean;
  staticProfileName: string;
  dynamicProfileName: string;
  reason: string;
}

const normalizeProfileName = (value: string | null | undefined): string => {
  const normalized = (value ?? '').trim();
  return normalized.length > 0 ? normalized : 'No static profile';
};

const buildDifferenceReason = (dynamicProfile: DynamicProfileResult): string => {
  if (dynamicProfile.state === 'no-strong') {
    return 'Static profile differs because the current context has no strong profile signal.';
  }
  if (dynamicProfile.state === 'weak-signal') {
    return `Static profile differs because dynamic diagnostics detect ${dynamicProfile.label} with a weak signal.`;
  }
  return `Static profile differs because dynamic diagnostics detect ${dynamicProfile.label} for the current context.`;
};

export const buildProfileComparison = (
  staticProfileName: string | null | undefined,
  dynamicProfile: DynamicProfileResult,
): ProfileComparison => {
  const normalizedStaticProfile = normalizeProfileName(staticProfileName);
  const matches = normalizedStaticProfile.toLowerCase() === dynamicProfile.label.toLowerCase();

  return {
    matches,
    staticProfileName: normalizedStaticProfile,
    dynamicProfileName: dynamicProfile.label,
    reason: matches
      ? `Static and dynamic diagnostics both indicate ${dynamicProfile.label}.`
      : buildDifferenceReason(dynamicProfile),
  };
};
