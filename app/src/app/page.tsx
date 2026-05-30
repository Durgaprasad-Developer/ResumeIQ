"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AnalysisResult } from "@/types/analysis";
import { track } from "@/lib/analytics";
import LandingScreen from "@/components/LandingScreen";
import RoleSelectionScreen from "@/components/RoleSelectionScreen";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import ResultsScreen from "@/components/ResultsScreen";

type Screen = "landing" | "role-selection" | "analyzing" | "results";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    track("landing_page_viewed");
    setSessionId(crypto.randomUUID());
  }, []);

  // Landing screen calls this when file is dropped
  const handleFileDrop = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError("");
    setScreen("role-selection");
  }, []);

  const handleAnalyze = useCallback(async (role: string) => {
    if (!file) return;
    setTargetRole(role);
    setScreen("analyzing");

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", role);
    formData.append("sessionId", sessionId);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const json = await res.json();

      if (!json.success) {
        track("analysis_failed", { reason: json.error ?? "Unknown error" });
        setError(json.error ?? "Analysis failed. Please try again.");
        setScreen("landing");
        return;
      }

      track("analysis_completed", { 
        overallScore: json.data.overallScore,
        targetRole: role
      });
      setResults(json.data);
      setScreen("results");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      track("analysis_failed", { reason: "Network error" });
      setError("Network error. Please check your connection and try again.");
      setScreen("landing");
    }
  }, [file, sessionId]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setTargetRole("");
    setResults(null);
    setError("");
    setScreen("landing");
  }, []);

  return (
    <main className="min-h-screen">
      {screen === "landing" && (
        <LandingScreen
          onAnalyze={handleFileDrop}
          error={error}
          setError={setError}
        />
      )}
      {screen === "role-selection" && (
        <RoleSelectionScreen
          fileName={file?.name ?? ""}
          onConfirmRole={handleAnalyze}
          onCancel={handleReset}
        />
      )}
      {screen === "analyzing" && (
        <AnalyzingScreen fileName={file?.name ?? ""} />
      )}
      {screen === "results" && results && (
        <ResultsScreen 
          data={results} 
          targetRole={targetRole} 
          onReset={handleReset} 
        />
      )}
    </main>
  );
}
