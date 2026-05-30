"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { track } from "@/lib/analytics";

interface Props {
  onAnalyze: (file: File) => void;
  error: string;
  setError: (e: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];
const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export default function LandingScreen({ onAnalyze, error, setError }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (f: File): string | null => {
      const ext =
        "." + (f.name.split(".").pop()?.toLowerCase() ?? "");
      const mimeOk = ALLOWED_MIME.includes(f.type);
      const extOk = ALLOWED_EXTENSIONS.includes(ext);

      if (!mimeOk && !extOk) {
        return "Only PDF and DOCX files are supported.";
      }
      if (f.size === 0) {
        return "The file is empty. Please upload a valid resume.";
      }
      if (f.size > MAX_FILE_SIZE) {
        return "Maximum file size is 5MB.";
      }
      return null;
    },
    []
  );

  const handleFile = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        setFile(null);
        return;
      }
      setError("");
      setFile(f);
      track("resume_uploaded", { fileType: f.type, fileSize: f.size });
    },
    [validateFile, setError]
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || loading) return;
    setLoading(true);
    onAnalyze(file);
  };

  return (
    <div
      style={{ background: "var(--rs-black)", minHeight: "100vh" }}
      className="relative flex flex-col overflow-hidden"
    >
      {/* Background grid decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px)
          `,
        }}
      />

      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle at top right, rgba(200,245,60,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 8,
              height: 8,
              background: "var(--rs-accent)",
              borderRadius: "50%",
              animation: "pulse-dot 2s infinite",
            }}
          />
          <span
            className="font-syne font-bold text-lg"
            style={{ color: "var(--rs-white)" }}
          >
            ResumeIQ
          </span>
        </div>
        <div
          className="font-mono text-xs"
          style={{ color: "rgba(250,250,248,0.3)" }}
        >
          v1.0 · MVP
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-full max-w-lg animate-fadeInUp">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 mb-8 font-mono text-xs rounded-full px-3 py-1"
            style={{
              background: "rgba(200,245,60,0.1)",
              border: "1px solid rgba(200,245,60,0.25)",
              color: "var(--rs-accent)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--rs-accent)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "pulse-dot 2s infinite",
              }}
            />
            AI-powered · Instant · Free
          </div>

          {/* Headline */}
          <h1
            className="font-syne font-extrabold mb-4"
            style={{
              color: "var(--rs-white)",
              fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
            }}
          >
            Know exactly why
            <br />
            you&apos;re getting{" "}
            <span style={{ color: "var(--rs-accent)" }}>rejected.</span>
          </h1>

          <p
            className="mb-10 font-light"
            style={{
              color: "rgba(250,250,248,0.5)",
              fontSize: "1rem",
              lineHeight: 1.7,
              maxWidth: 420,
            }}
          >
            Upload your resume. Get a score, your top strengths, weaknesses,
            and exact improvements — in under 10 seconds.
          </p>

          {/* Drop zone */}
          <div
            id="drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              track("resume_upload_started");
              inputRef.current?.click();
            }}
            className="relative rounded-2xl text-center cursor-pointer mb-4 transition-all duration-200"
            style={{
              border: `1.5px dashed ${dragging ? "var(--rs-accent)" : "rgba(200,245,60,0.3)"}`,
              background: dragging
                ? "rgba(200,245,60,0.08)"
                : "rgba(200,245,60,0.04)",
              padding: "2.5rem 2rem",
            }}
          >
            <input
              ref={inputRef}
              id="file-input"
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={handleInputChange}
            />

            {/* Upload icon */}
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-xl"
              style={{
                width: 52,
                height: 52,
                background: "rgba(200,245,60,0.1)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--rs-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            {file ? (
              <>
                <div
                  className="font-syne font-semibold mb-1"
                  style={{ color: "var(--rs-accent)", fontSize: "0.95rem" }}
                >
                  ✓ {file.name}
                </div>
                <div
                  className="font-mono text-xs"
                  style={{ color: "rgba(250,250,248,0.35)" }}
                >
                  {(file.size / 1024).toFixed(0)} KB · Click to change
                </div>
              </>
            ) : (
              <>
                <div
                  className="font-syne font-semibold mb-1"
                  style={{ color: "var(--rs-white)", fontSize: "0.95rem" }}
                >
                  Drop your resume here
                </div>
                <div
                  className="font-mono text-xs"
                  style={{ color: "rgba(250,250,248,0.35)" }}
                >
                  PDF or DOCX · Max 5MB
                </div>
              </>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div
              id="error-message"
              className="rounded-xl px-4 py-3 mb-4 text-sm animate-fadeIn"
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "var(--rs-red)",
              }}
              role="alert"
            >
              ⚠ {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            id="analyze-btn"
            onClick={handleSubmit}
            disabled={!file || loading}
            className="w-full font-syne font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              padding: "14px 24px",
              background:
                !file || loading ? "rgba(200,245,60,0.4)" : "var(--rs-accent)",
              color: "var(--rs-black)",
              fontSize: "0.95rem",
              cursor: !file || loading ? "not-allowed" : "pointer",
              transform: file && !loading ? "none" : "none",
            }}
            onMouseEnter={(e) => {
              if (file && !loading) {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--rs-accent-dark)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "none";
              (e.currentTarget as HTMLButtonElement).style.background =
                !file || loading ? "rgba(200,245,60,0.4)" : "var(--rs-accent)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </svg>
            {loading ? "Starting analysis…" : "Analyze My Resume"}
          </button>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-4 mt-8">
            {[
              "ATS score",
              "Strengths & weaknesses",
              "Exact improvements",
            ].map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-2 text-sm"
                style={{ color: "rgba(250,250,248,0.45)" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rs-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="relative z-10 text-center pb-6 font-mono text-xs"
        style={{ color: "rgba(250,250,248,0.2)" }}
      >
        Your resume is processed securely and never stored.
      </div>
    </div>
  );
}
