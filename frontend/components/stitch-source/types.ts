export type ScreenId =
  | 'landing'
  | 'dashboard'
  | 'competencies'
  | 'challenges'
  | 'project-upgrade'
  | 'career'
  | 'roadmap'
  | 'project-defense'
  | 'settings'
  | 'diagnostic'
  | 'profile';

export interface EvidenceItem {
  id: string;
  title: string;
  source: string;
  sourceType: 'CHALLENGE' | 'GIT_PR' | 'AUDIT_TRACE' | 'GITHUB_SYNC';
  description: string;
  hash: string;
  confidence: number;
  timeAgo: string;
  status: 'Demonstrated' | 'Developing' | 'Needs Evidence' | 'Transfer Gap';
  vectorName?: string;
  subdetails?: string;
}

export interface VectorMetric {
  id: string;
  code: string;
  name: string;
  status: 'Demonstrated' | 'Developing' | 'Needs Evidence' | 'Transfer Gap';
  percentage: number;
  runtime: string;
  latencyDelta?: string;
  benchmarkDelta?: string;
  footprintDelta?: string;
  dropoutRate?: string;
  astMatch: string;
  summary: string;
}

export interface RoadmapMilestone {
  id: string;
  stepNumber: string;
  title: string;
  status: 'Passed' | 'Active' | 'Next' | 'Queued' | 'Capstone';
  description: string;
  proofId?: string;
  hash?: string;
  metrics?: string;
  empiricalTrigger?: string;
}
