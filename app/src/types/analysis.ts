export interface Readiness {
  startup: number;
  product: number;
  mnc: number;
}

export interface MissingEvidence {
  context: string;
  missing: string[];
}

export interface SectionGap {
  expected: string[];
  found: string[];
  missing: string[];
}

export interface Addition {
  item: string;
  scoreImpact: number;
}

export interface AnalysisResult {
  overallScore: number;
  readiness: Readiness;
  missingItems: string[];
  missingEvidence: MissingEvidence[];
  sectionAnalysis: SectionGap;
  topAdditions: Addition[];
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

