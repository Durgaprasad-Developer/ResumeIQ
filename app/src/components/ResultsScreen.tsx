"use client";

import { useEffect, useRef } from "react";
import { AnalysisResult } from "@/types/analysis";
import { track } from "@/lib/analytics";

interface Props {
  data: AnalysisResult;
  targetRole?: string;
  onReset: () => void;
}

export default function ResultsScreen({ data, targetRole, onReset }: Props) {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    barsRef.current.forEach((bar, i) => {
      if (bar) {
        setTimeout(() => {
          bar.style.width = bar.getAttribute("data-width") || "0%";
        }, 100 + i * 200);
      }
    });
  }, []);

  useEffect(() => {
    track("results_viewed");
  }, []);

  const getImprovementColor = (level: string) => {
    switch (level) {
      case "Significant": return "text-lime-400 drop-shadow-[0_0_10px_rgba(200,245,60,0.5)]";
      case "High": return "text-green-400";
      case "Moderate": return "text-orange-400";
      case "Low": return "text-red-400";
      default: return "text-white";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--rs-black)] text-[var(--rs-white)] p-6 md:p-12 selection:bg-[var(--rs-accent)] selection:text-black font-sans">
      <div className="max-w-4xl mx-auto space-y-12 pb-16">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8 animate-fadeInUp">
          <div>
            <div className="font-dm-mono text-sm tracking-widest text-[var(--rs-accent)] mb-3">
              ANALYSIS COMPLETE
            </div>
            <h2 className="font-syne font-bold text-4xl md:text-5xl leading-tight">
              Resume Evaluation
            </h2>
            {targetRole && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--rs-accent)]/10 border border-[var(--rs-accent)]/20 text-[var(--rs-accent)] text-sm font-dm-mono shadow-[0_0_15px_rgba(200,245,60,0.1)]">
                <span className="w-2 h-2 rounded-full bg-[var(--rs-accent)] animate-pulse-dot" />
                Targeting: {targetRole}
              </div>
            )}
          </div>

          <div className="flex gap-8 bg-white/5 px-8 py-6 rounded-3xl border border-white/10 backdrop-blur-sm">
            <div className="text-center">
              <div className="font-dm-mono text-xs text-white/50 mb-2 uppercase tracking-wider">Current Score</div>
              <div className="font-syne font-bold text-4xl text-white">{data.overallScore}</div>
            </div>
            <div className="w-[1px] bg-white/10" />
            <div className="text-center">
              <div className="font-dm-mono text-xs text-white/50 mb-2 uppercase tracking-wider">Potential Gain</div>
              <div className={`font-syne font-bold text-2xl mt-1 ${getImprovementColor(data.potentialImprovement)}`}>
                {data.potentialImprovement}
              </div>
            </div>
          </div>
        </header>

        {/* Section Gap Analysis */}
        {data.sectionAnalysis && (
          <section className="animate-fadeInUp" style={{ animationDelay: "0.2s", opacity: 0 }}>
            <div className="font-syne font-bold text-xs uppercase tracking-widest mb-4 text-white/40" style={{ letterSpacing: "0.15em" }}>
              Structural Analysis
            </div>
            <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div className="flex-1 min-w-[200px]">
                  <h4 className="font-dm-mono text-[10px] uppercase tracking-wider text-green-400/60 mb-3">Found</h4>
                  <ul className="space-y-2">
                    {data.sectionAnalysis.found.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-green-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-[1px] bg-white/5 hidden sm:block" />
                <div className="flex-1 min-w-[200px]">
                  <h4 className="font-dm-mono text-[10px] uppercase tracking-wider text-red-400/60 mb-3">Missing</h4>
                  <ul className="space-y-2">
                    {data.sectionAnalysis.missing.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Highest Impact Fixes (The Core Coaching Engine) */}
        {data.highestImpactFixes && data.highestImpactFixes.length > 0 && (
          <section className="animate-fadeInUp" style={{ animationDelay: "0.3s", opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="font-syne font-bold text-xs uppercase tracking-widest" style={{ color: "var(--rs-accent)", letterSpacing: "0.15em" }}>
                Highest Impact Fixes
              </div>
              <div className="font-dm-mono text-[10px] text-[var(--rs-accent)]/60 bg-[var(--rs-accent)]/10 px-2 py-1 rounded">
                Can be fixed in &lt; 30 mins
              </div>
            </div>
            
            <div className="space-y-6">
              {data.highestImpactFixes.map((fix, i) => (
                <div key={i} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg group">
                  {/* Context Header */}
                  <div className="bg-black/30 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="font-dm-mono text-xs text-white/50 uppercase tracking-wider">Fix #{i + 1}</span>
                    <span className="font-syne font-bold text-sm text-white/80 bg-white/10 px-3 py-1 rounded-full">
                      {fix.context}
                    </span>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-8">
                    {/* Problem & Why it matters */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="flex items-center gap-2 text-red-400 font-syne font-bold mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          The Problem
                        </h4>
                        <p className="text-white/70 text-sm leading-relaxed">{fix.problem}</p>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 text-[var(--rs-accent)] font-syne font-bold mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-9 5 18 3-9h5"/></svg>
                          Why Recruiters Care
                        </h4>
                        <p className="text-white/70 text-sm leading-relaxed">{fix.whyItMatters}</p>
                      </div>
                    </div>

                    <hr className="border-white/5" />

                    {/* What to add & Example */}
                    <div>
                      <h4 className="font-dm-mono text-xs uppercase tracking-wider text-white/40 mb-3">Action Plan</h4>
                      <div className="bg-black/40 rounded-xl p-5 border border-white/5">
                        <div className="text-sm text-white/90 mb-4 font-medium flex items-start gap-3">
                          <span className="text-[var(--rs-accent)] shrink-0">↳</span>
                          {fix.whatToAdd}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <div className="text-[10px] uppercase font-dm-mono text-white/30 mb-2 tracking-wider">Example Rewrite</div>
                          <div className="text-sm text-green-300/80 font-syne italic leading-relaxed border-l-2 border-green-500/30 pl-4">
                            &quot;{fix.example}&quot;
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Analyze another */}
        <div className="text-center pt-8 pb-10">
          <button
            onClick={() => {
              track("analyze_another_resume", { location: "bottom" });
              onReset();
            }}
            className="font-syne font-bold rounded-xl px-8 py-3 transition-all duration-150"
            style={{ background: "var(--rs-accent)", color: "var(--rs-black)", fontSize: "0.9rem" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--rs-accent-dark)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--rs-accent)";
            }}
          >
            Analyze Another Resume
          </button>
        </div>
      </div>
    </div>
  );
}
