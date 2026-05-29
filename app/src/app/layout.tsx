import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeIQ — AI-Powered Resume Analysis",
  description:
    "Upload your resume and get instant AI-powered feedback. Get your overall score, ATS score, top strengths, weaknesses, and exact improvements — in under 10 seconds.",
  keywords: [
    "resume analyzer",
    "ATS score",
    "resume feedback",
    "AI resume review",
    "job application",
    "resume checker",
  ],
  authors: [{ name: "ResumeIQ" }],
  openGraph: {
    title: "ResumeIQ — Know Exactly Why You're Getting Rejected",
    description:
      "Upload your resume → AI analyzes it like a recruiter → score, strengths, weaknesses, and exact improvements in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
