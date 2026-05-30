"use client";

import { useEffect, useRef } from "react";
import { AnalysisResult } from "@/types/analysis";
import { track } from "@/lib/analytics";

interface Props {
  data: AnalysisResult;
  targetRole?: string;
  onReset: () => void;
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#c8f53c" : score >= 55 ? "#f97316" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="45" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <circle
            cx="55"
            cy="55"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 55 55)"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-syne font-extrabold leading-none" style={{ color, fontSize: "1.8rem" }}>
            {score}
          </span>
          <span className="font-dm-mono text-xs" style={{ color: "rgba(250,250,248,0.35)" }}>
            /100
          </span>
        </div>
      </div>
      <div
        className="font-dm-mono text-xs uppercase tracking-widest text-center"
        style={{ color: "rgba(250,250,248,0.45)", letterSpacing: "0.12em" }}
      >
        {label}
      </div>
    </div>
  );
}

export default function ResultsScreen({ data, targetRole, onReset }: Props) {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    track("results_viewed", { overallScore: data.overallScore, targetRole });
    
    const t = setTimeout(() => {
      barsRef.current.forEach((el) => {
        if (el) {
          const target = el.getAttribute("data-width") ?? "0";
          el.style.width = target + "%";
        }
      });
    }, 150);
    return () => clearTimeout(t);
  }, [data.overallScore, targetRole]);

  return (
    <div
      style={{ background: "var(--rs-black)", minHeight: "100vh" }}
      className="relative flex flex-col overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px)
          `,
        }}
      />
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle at top right, rgba(200,245,60,0.08) 0%, transparent 65%)",
        }}
      />

      <header
        style={{
          background: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
        className="sticky top-0 z-20"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div style={{ width: 8, height: 8, background: "var(--rs-accent)", borderRadius: "50%" }} />
            <span className="font-syne font-bold text-base" style={{ color: "var(--rs-white)" }}>ResumeIQ</span>
          </div>
          <button
            id="new-resume-btn"
            onClick={() => {
              track("analyze_another_resume", { location: "header" });
              onReset();
            }}
            className="font-dm-mono text-xs rounded-lg px-3 py-2 transition-all duration-150"
            style={{
              color: "rgba(250,250,248,0.5)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--rs-white)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(250,250,248,0.5)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            ↺ New resume
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8 space-y-8">
        
        {/* Target Role Badge */}
        {targetRole && (
          <div className="flex justify-center animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(200,245,60,0.08)", border: "1px solid rgba(200,245,60,0.2)" }}>
              <div className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_#c8f53c]" />
              <span className="font-dm-mono text-sm font-semibold text-lime-400">Target Role: {targetRole}</span>
            </div>
          </div>
        )}

        {/* Scores & Readiness */}
        <section className="animate-fadeInUp grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-8 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <ScoreRing score={data.overallScore} label="Overall Score" />
          </div>
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="font-syne font-bold text-xs uppercase tracking-widest mb-6" style={{ color: "rgba(250,250,248,0.4)", letterSpacing: "0.15em" }}>
              Resume Round Readiness
            </div>
            <div className="space-y-4">
              {[
                { label: "Startup", score: data.readiness?.startup || 0, color: "#c8f53c" },
                { label: "Product Company", score: data.readiness?.product || 0, color: "#60a5fa" },
                { label: "MNC / Enterprise", score: data.readiness?.mnc || 0, color: "#a78bfa" }
              ].map((tier, i) => (
                <div key={tier.label} className="flex items-center gap-4">
                  <div className="text-sm flex-1" style={{ color: "rgba(250,250,248,0.8)" }}>{tier.label}</div>
                  <div className="rounded-full overflow-hidden shrink-0 h-[5px] w-24 bg-white/5">
                    <div
                      ref={(el) => { if (el) barsRef.current[i] = el; }}
                      data-width={tier.score}
                      className="h-full rounded-full"
                      style={{
                        background: tier.color,
                        width: "0%",
                        transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                        transitionDelay: `${0.15 + i * 0.1}s`,
                      }}
                    />
                  </div>
                  <div className="font-dm-mono text-xs w-8 text-right" style={{ color: tier.color }}>{tier.score}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Missing Items */}
        {data.missingItems && data.missingItems.length > 0 && (
          <section className="animate-fadeInUp" style={{ animationDelay: "0.1s", opacity: 0 }}>
            <div className="font-syne font-bold text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(250,250,248,0.4)", letterSpacing: "0.15em" }}>
              Missing Sections & Items
            </div>
            <div className="flex flex-wrap gap-2.5">
              {data.missingItems.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                  style={{ background: "rgba(239, 68, 68, 0.06)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Missing Evidence */}
        {data.missingEvidence && data.missingEvidence.length > 0 && (
          <section className="animate-fadeInUp" style={{ animationDelay: "0.2s", opacity: 0 }}>
            <div className="font-syne font-bold text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(250,250,248,0.4)", letterSpacing: "0.15em" }}>
              Missing Evidence Recruiter Looks For
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.missingEvidence.map((ev, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="font-dm-mono text-xs uppercase text-gray-400 mb-3">{ev.context}</div>
                  <div className="space-y-2">
                    {ev.missing.map((m, j) => (
                      <div key={j} className="flex items-start gap-2 text-sm" style={{ color: "rgba(250,250,248,0.7)" }}>
                        <span className="text-red-400 mt-0.5">↳</span>
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gap Analysis */}
        {data.sectionAnalysis && (
          <section className="animate-fadeInUp" style={{ animationDelay: "0.3s", opacity: 0 }}>
            <div className="font-syne font-bold text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(250,250,248,0.4)", letterSpacing: "0.15em" }}>
              Section-wise Gap Analysis
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
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

        {/* Top Additions (Killer Feature) */}
        {data.topAdditions && data.topAdditions.length > 0 && (
          <section className="animate-fadeInUp" style={{ animationDelay: "0.4s", opacity: 0 }}>
            <div className="font-syne font-bold text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(200,245,60,0.8)", letterSpacing: "0.15em" }}>
              Add These Next
            </div>
            <div className="rounded-2xl p-6" style={{ background: "rgba(200,245,60,0.03)", border: "1px solid rgba(200,245,60,0.15)" }}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="font-dm-mono text-sm text-gray-400">Current Score</div>
                <div className="font-syne font-bold text-xl">{data.overallScore}</div>
              </div>
              <div className="space-y-3">
                {data.topAdditions.map((add, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="text-sm flex items-center gap-3 text-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#c8f53c]" />
                      {add.item}
                    </div>
                    <div className="font-dm-mono text-sm text-lime-400 font-bold transition-transform group-hover:scale-110">
                      +{add.scoreImpact}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <div className="font-dm-mono text-sm text-lime-400">Expected Score</div>
                <div className="font-syne font-extrabold text-2xl text-lime-400 drop-shadow-[0_0_15px_rgba(200,245,60,0.3)]">
                  {Math.min(100, data.overallScore + data.topAdditions.reduce((acc, curr) => acc + curr.scoreImpact, 0))}
                </div>
              </div>
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
