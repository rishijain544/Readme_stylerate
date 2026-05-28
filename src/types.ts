/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RepoData {
  name: string;
  fullName: string;
  description: string;
  language: string;
  languages: Record<string, number>;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  files: string[];
  owner: string;
  url: string;
}

export interface MLClassification {
  projectType: string;
  confidence: string;
  probabilities: number[];
}

export interface SectionRecommendation {
  name: string;
  similarity: number;
  confidence: string;
  recommended: boolean;
}

export interface TrainingStatus {
  phase: 'idle' | 'classifier' | 'scorer' | 'ready';
  epoch: number;
  totalEpochs: number;
  accuracy?: number;
  mae?: number;
}

export interface ReadmeHistory {
  id: string;
  repoName: string;
  repoUrl: string;
  repoDescription: string;
  language: string;
  stars: number;
  sections: string[];
  content: string;
  mlProjectType: string;
  mlConfidence: string;
  mlQualityScore: number;
  recommendedSections: string[];
  createdAt: number;
  generationMode?: 'url' | 'description';
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string | null;
  plan: 'free';
  readmesGenerated: number;
  createdAt: number;
  lastActiveAt: number;
}
