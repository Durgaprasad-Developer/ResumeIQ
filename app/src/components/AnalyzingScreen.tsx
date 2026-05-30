"use client";

import { useEffect, useState } from "react";

interface Props {
  fileName: string;
}

const STEPS = [
  { icon: "📄", label: "Extracting text from resume" },
  { icon: "🤖", label: "Running AI analysis" },
  { icon: "📊", label: "Generating scores" },
  { icon: "✨", label: "Building recommendations" },
];

type StepState = "pending" | "active" | "done";

export default function AnalyzingScreen({ fileName }: Props) {
  const [stepStates, setStepStates] = useState<StepState[]>([
    "active",
    "pending",
    "pending",
    "pending",
  ]);
  const [subText, setSubText] = useState("Reading document…");

  useEffect(() => {
    const subtexts = [
      "Reading document…",
      "Running AI analysis…",
      "Generating scores…",
      "Building recommendations…",
    ];

    const timings = [0, 1200, 2600, 4000];

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    timings.forEach((delay, i) => {
      const t = setTimeout(() => {
        setSubText(subtexts[i]);
        setStepStates((prev) => {
          const next = [...prev] as StepState[];
          if (i > 0) next[i - 1] = "done";
          next[i] = "active";
          return next;
        });
      }, delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{ background: "var(--rs-black)", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 60px)
          `,
        }}
      />

      {/* Glow orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, rgba(200,245,60,0.06) 0%, transparent 65%)",
          borderRadius: "50%",
        }}
      />

      <div className="relative z-10 text-center w-full max-w-sm animate-fadeIn">
        {/* Spinner */}
        <div
          className="mx-auto mb-8"
          style={{
            width: 64,
            height: 64,
            border: "2px solid rgba(200,245,60,0.12)",
            borderTopColor: "var(--rs-accent)",
            borderRadius: "50%",
            animation: "spin-custom 1s linear infinite",
          }}
        />

        {/* Title */}
        <div
          className="font-syne font-bold mb-2"
          style={{ color: "var(--rs-white)", fontSize: "1.5rem" }}
        >
          Analyzing your resume…
        </div>
        <div
          id="analyzing-sub"
          className="font-mono text-sm mb-10 transition-all duration-300"
          style={{ color: "rgba(250,250,248,0.4)" }}
        >
          {subText}
        </div>

        {/* File name */}
        {fileName && (
          <div
            className="font-mono text-xs mb-8 inline-block px-3 py-1 rounded-full"
            style={{
              color: "var(--rs-accent)",
              background: "rgba(200,245,60,0.08)",
              border: "1px solid rgba(200,245,60,0.2)",
            }}
          >
            {fileName}
          </div>
        )}

        {/* Steps */}
        <div className="text-left space-y-1">
          {STEPS.map((step, i) => {
            const state = stepStates[i];
            return (
              <div
                key={step.label}
                id={`step-${i}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-400"
                style={{
                  background:
                    state === "active"
                      ? "rgba(200,245,60,0.06)"
                      : "transparent",
                  borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ fontSize: "1rem", width: 20, textAlign: "center" }}>
                  {state === "done" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--rs-accent)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </span>
                <span
                  className="text-sm transition-colors duration-300"
                  style={{
                    color:
                      state === "done"
                        ? "var(--rs-accent)"
                        : state === "active"
                        ? "var(--rs-white)"
                        : "rgba(250,250,248,0.3)",
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ETA hint */}
        <div
          className="mt-8 font-mono text-xs"
          style={{ color: "rgba(250,250,248,0.2)" }}
        >
          Usually takes 5–15 seconds
        </div>
      </div>
    </div>
  );
}
