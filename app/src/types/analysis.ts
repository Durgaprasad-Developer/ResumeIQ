export interface SectionGap {
  expected: string[];
  found: string[];
  missing: string[];
}

export interface ActionableFix {
  context: string;
  problem: string;
  whyItMatters: string;
  whatToAdd: string;
  example: string;
}

export interface AnalysisResult {
  overallScore: number;
  potentialImprovement: "Low" | "Moderate" | "High" | "Significant";
  missingItems: string[];
  sectionAnalysis: SectionGap;
  highestImpactFixes: ActionableFix[];
}

export interface AnalysisAPIResponse {
  success: true;
  data: AnalysisResult;
}

export interface AnalysisAPIError {
  success: false;
  error: string;
}

export type APIResponse = AnalysisAPIResponse | AnalysisAPIError;
