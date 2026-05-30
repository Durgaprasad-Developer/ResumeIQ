import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { APIResponse, AnalysisResult } from "@/types/analysis";

/* ─── Constants & State ────────────────────────────────────────── */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];

// Simple in-memory cache for the session (cleared on cold starts)
const analysisCache = new Map<string, AnalysisResult>();

/* ─── Text extractors ────────────────────────────────────────── */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  // @ts-expect-error - pdf-parse does not have official typescript declarations
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

/* ─── AI prompt builder ──────────────────────────────────────── */
function buildPrompt(resumeText: string, role: string): string {
  const trimmed = resumeText.substring(0, 6000);

  return `You are a senior technical career coach helping a candidate improve their resume for a ${role} position.
Your job is to identify flaws and provide HIGHLY ACTIONABLE, evidence-based improvements.

CRITICAL RULE (The 30-Minute Rule):
Every single fix or recommendation you provide MUST be something the user can actually accomplish in the next 30 minutes by reframing or elaborating on their existing experience.
DO NOT tell them to "Add Product Management Experience" or "Get an AWS Certification" if they do not already have it. 
INSTEAD, tell them how to reframe their existing projects to highlight leadership, metrics, or technical depth.

ANALYSIS RULES:
1. "overallScore" is an integer (0-100) reflecting their current standing for this role.
2. "potentialImprovement" is a strict string enum ("Low", "Moderate", "High", "Significant") based on how much impact the fixes will have.
3. "missingItems" is a short array of high-level missing sections (e.g. "GitHub Link", "Summary").
4. "sectionAnalysis" compares what a standard resume should have ("expected"), what this resume has ("found"), and what is lacking ("missing").
5. "highestImpactFixes" is an array of exactly 3 to 4 actionable fixes following the 30-Minute Rule.

RESUME TEXT:
${trimmed}

Return EXACTLY this JSON structure:
{
  "overallScore": <integer 0-100>,
  "potentialImprovement": "<'Low' | 'Moderate' | 'High' | 'Significant'>",
  "missingItems": ["<string>"],
  "sectionAnalysis": {
    "expected": ["<string>"],
    "found": ["<string>"],
    "missing": ["<string>"]
  },
  "highestImpactFixes": [
    {
      "context": "<e.g., 'Project: SyncStream' or 'Experience: Company XYZ'>",
      "problem": "<e.g., 'No measurable outcome'>",
      "whyItMatters": "<e.g., 'Recruiters use scale to judge complexity.'>",
      "whatToAdd": "<e.g., 'Mention records processed or users served.'>",
      "example": "<e.g., 'Built an AI-powered analyzer using Next.js that processes 500+ resumes per day.'>"
    }
  ]
}`;
}

/* ─── Response validator ─────────────────────────────────────── */
function validateAndClamp(data: unknown): AnalysisResult {
  if (typeof data !== "object" || data === null) {
    throw new Error("AI returned non-object response");
  }

  const raw = data as Record<string, unknown>;

  const clamp = (n: unknown): number => {
    const num = Number(n);
    if (isNaN(num)) return 0;
    return Math.min(100, Math.max(0, Math.round(num)));
  };

  const ensureStringArray = (arr: unknown, fallback: string[]): string[] => {
    if (!Array.isArray(arr)) return fallback;
    return arr.filter((x): x is string => typeof x === "string").slice(0, 10);
  };

  const missingItems = ensureStringArray(raw.missingItems, ["Technical Details", "Impact Metrics"]);

  const rawSection = typeof raw.sectionAnalysis === "object" && raw.sectionAnalysis !== null ? (raw.sectionAnalysis as Record<string, unknown>) : {};
  const sectionAnalysis = {
    expected: ensureStringArray(rawSection.expected, ["Experience", "Projects", "Skills"]),
    found: ensureStringArray(rawSection.found, ["Experience"]),
    missing: ensureStringArray(rawSection.missing, ["Projects", "Skills"]),
  };

  const highestImpactFixes = Array.isArray(raw.highestImpactFixes)
    ? raw.highestImpactFixes
        .filter((fix): fix is Record<string, unknown> => typeof fix === "object" && fix !== null)
        .map((fix) => ({
          context: typeof fix.context === "string" ? fix.context : "Resume Claim",
          problem: typeof fix.problem === "string" ? fix.problem : "Lacks detail",
          whyItMatters: typeof fix.whyItMatters === "string" ? fix.whyItMatters : "Recruiters need evidence of scale.",
          whatToAdd: typeof fix.whatToAdd === "string" ? fix.whatToAdd : "Add specific metrics.",
          example: typeof fix.example === "string" ? fix.example : "Improved system performance by 20%.",
        }))
        .slice(0, 5)
    : [];

  const allowedImprovements = ["Low", "Moderate", "High", "Significant"];
  let potentialImprovement = typeof raw.potentialImprovement === "string" ? raw.potentialImprovement : "High";
  if (!allowedImprovements.includes(potentialImprovement)) {
    potentialImprovement = "High";
  }

  return {
    overallScore: clamp(raw.overallScore),
    potentialImprovement: potentialImprovement as "Low" | "Moderate" | "High" | "Significant",
    missingItems,
    sectionAnalysis,
    highestImpactFixes,
  };
}

/* ─── Primary: NVIDIA API (Llama 3.3 70B) ────────────────────── */
async function callNvidiaAPI(prompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" }, // Enforce JSON response format
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`NVIDIA API responded with status ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

/* ─── Fallback: Gemini API ───────────────────────────────────── */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const MODEL_CHAIN = [
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  let rawText = "";
  let lastErr = "";

  for (const modelName of MODEL_CHAIN) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
      });
      const result = await model.generateContent(prompt);
      rawText = result.response.text();
      break; 
    } catch (geminiErr: unknown) {
      lastErr = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
    }
  }

  if (!rawText) {
    throw new Error(`All Gemini models failed. Last error: ${lastErr}`);
  }

  return rawText;
}

/* ─── Route handler ──────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const role = (formData.get("role") as string) || "Software Engineer";
    const sessionId = formData.get("sessionId") as string | null;

    if (!file) {
      return NextResponse.json<APIResponse>(
        { success: false, error: "No file uploaded. Please select a resume." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<APIResponse>(
        { success: false, error: "Maximum file size is 5MB." },
        { status: 413 }
      );
    }

    // ── Check Cache ──
    if (sessionId) {
      const cacheKey = `${sessionId}-${role}-${file.size}-${file.name}`;
      if (analysisCache.has(cacheKey)) {
        console.log(`[/api/analyze] Serving result from cache for ${cacheKey}`);
        return NextResponse.json<APIResponse>({
          success: true,
          data: analysisCache.get(cacheKey)!,
        });
      }
    }

    const popResult = file.name.split(".").pop();
    const ext = popResult ? "." + popResult.toLowerCase() : "";
    const isMimeAllowed = ALLOWED_TYPES.includes(file.type);
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      return NextResponse.json<APIResponse>(
        { success: false, error: "Only PDF and DOCX files are supported." },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json<APIResponse>(
        { success: false, error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    let resumeText = "";
    try {
      if (ext === ".pdf" || file.type === "application/pdf") {
        resumeText = await extractFromPDF(buffer);
      } else {
        resumeText = await extractFromDOCX(buffer);
      }
    } catch {
      return NextResponse.json<APIResponse>(
        { success: false, error: "Unable to read this file. It may be corrupted or password-protected." },
        { status: 422 }
      );
    }

    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json<APIResponse>(
        { success: false, error: "Could not extract enough text from the resume. Please ensure the file is not image-only or empty." },
        { status: 422 }
      );
    }

    const sanitizedText = resumeText.replace(
      /ignore previous instructions?.*$/gim,
      "[content redacted]"
    );

    const prompt = buildPrompt(sanitizedText, role);
    let rawResponse = "";
    let usedProvider = "NVIDIA";

    // ── Attempt Call to Primary (NVIDIA) ──
    try {
      console.log("[/api/analyze] Attempting primary analysis with NVIDIA (Llama 3.3 70B)...");
      rawResponse = await callNvidiaAPI(prompt);
    } catch (nvidiaErr: unknown) {
      const errMsg = nvidiaErr instanceof Error ? nvidiaErr.message : String(nvidiaErr);
      console.error("[/api/analyze] NVIDIA API failed:", errMsg);

      // ── Fallback to Gemini ──
      try {
        console.log("[/api/analyze] Attempting fallback analysis with Gemini...");
        rawResponse = await callGeminiAPI(prompt);
        usedProvider = "Gemini";
      } catch (geminiErr: unknown) {
        const geminiErrMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        console.error("[/api/analyze] Fallback Gemini API also failed:", geminiErrMsg);

        const isQuotaIssue = errMsg.includes("429") || geminiErrMsg.includes("429") || geminiErrMsg.includes("quota");
        return NextResponse.json<APIResponse>(
          {
            success: false,
            error: isQuotaIssue
              ? "AI quota exceeded for today. Please try again later or check API key limits."
              : "AI analysis failed. Please try again in a moment.",
          },
          { status: 503 }
        );
      }
    }

    console.log(`[/api/analyze] Analysis succeeded via ${usedProvider}!`);

    // ── Parse JSON ──
    let parsed: unknown;
    try {
      const cleaned = rawResponse
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json<APIResponse>(
        { success: false, error: "Failed to parse analysis report. Please retry." },
        { status: 500 }
      );
    }

    // ── Validate and Clamp ──
    let analysisResult: AnalysisResult;
    try {
      analysisResult = validateAndClamp(parsed);
    } catch {
      return NextResponse.json<APIResponse>(
        { success: false, error: "Failed to compile analysis report structure." },
        { status: 500 }
      );
    }

    // ── Cache Result ──
    if (sessionId) {
      const cacheKey = `${sessionId}-${role}-${file.size}-${file.name}`;
      analysisCache.set(cacheKey, analysisResult);
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: analysisResult,
    });
  } catch (err) {
    console.error("[/api/analyze] Unhandled error:", err);
    return NextResponse.json<APIResponse>(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
