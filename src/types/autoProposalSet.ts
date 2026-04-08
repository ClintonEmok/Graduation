export interface AutoProposalScoreBreakdown {
  coverage: number
  relevance: number
  overlap: number
  continuity: number
  total: number
}

export interface AutoProposalReasonMetadata {
  lowConfidenceReason?: string
  noResultReason?: string
  whyRecommended?: string
}

export interface AutoProposalWarpInterval {
  startPercent: number
  endPercent: number
  strength: number
}

export type AutoProposalWarpEmphasis = 'aggressive' | 'balanced' | 'conservative'

export interface AutoProposalWarpProfile {
  name: string
  emphasis: AutoProposalWarpEmphasis
  confidence: number
  intervals: AutoProposalWarpInterval[]
}

export type AutoProposalBoundaryMethod = 'peak' | 'change-point' | 'rule-based'

export interface AutoProposalIntervalSet {
  boundaries: number[]
  method: AutoProposalBoundaryMethod
  confidence: number
}

export interface AutoProposalSet {
  id: string
  rank: number
  isRecommended: boolean
  confidence: number
  score: AutoProposalScoreBreakdown
  warp: AutoProposalWarpProfile
  intervals?: AutoProposalIntervalSet
  reasonMetadata?: AutoProposalReasonMetadata
}

export interface AutoProposalContext {
  crimeTypes: string[]
  timeRange: {
    start: number
    end: number
  }
  isFullDataset: boolean
  profileName?: string
}

export interface RankedAutoProposalSets {
  generatedAt: number
  sets: AutoProposalSet[]
  recommendedId: string | null
  reasonMetadata?: AutoProposalReasonMetadata
}
