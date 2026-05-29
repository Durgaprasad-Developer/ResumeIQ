import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { APIResponse, AnalysisResult } from "@/types/analysis";

/* ─── Constants ────────────────────────────────────────────────── */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];

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

  return `You are a senior technical recruiter hiring for a ${role} position. Your task is to evaluate the resume below based on expectations for a ${role} candidate, and return a structured JSON response identifying exactly what is missing and what needs to be added for the candidate to be shortlisted for this specific role.
Do not return Markdown, explanations, or text outside the JSON object.

ANALYSIS RULES:
1. "readiness" represents the estimated shortlisting probability (0-100) for different company tiers.
2. "missingItems" should be a list of high-level missing sections (e.g. "GitHub Link", "Technical Skills Section", "Certifications").
3. "missingEvidence" identifies specific claims the user made (e.g. "Built AI Chatbot") and lists exactly what evidence a recruiter would look for but cannot find (e.g. "User count", "Accuracy metrics").
4. "sectionAnalysis" compares what a standard resume should have ("expected"), what this resume has ("found"), and what is lacking ("missing").
5. "topAdditions" provides exact, concrete content suggestions the user should add to dramatically improve their score. "scoreImpact" is an integer representing how many points their overall score will increase if they add it. Ensure Current Score + Total Impact <= 100.

RESUME TEXT:
${trimmed}

Return EXACTLY this JSON structure:
{
  "overallScore": <integer 0-100>,
  "readiness": {
    "startup": <integer 0-100>,
    "product": <integer 0-100>,
    "mnc": <integer 0-100>
  },
  "missingItems": [
    "<string>"
  ],
  "missingEvidence": [
    {
      "context": "<e.g., 'Project: AI Chatbot'>",
      "missing": ["<e.g., 'Impact metrics'>", "<e.g., 'Scale'>"]
    }
  ],
  "sectionAnalysis": {
    "expected": ["<string>"],
    "found": ["<string>"],
    "missing": ["<string>"]
  },
  "topAdditions": [
    {
      "item": "<e.g., 'Add Project Metrics'>",
      "scoreImpact": <integer>
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

  const rawReadiness = typeof raw.readiness === "object" && raw.readiness !== null ? (raw.readiness as Record<string, unknown>) : {};
  const readiness = {
    startup: clamp(rawReadiness.startup),
    product: clamp(rawReadiness.product),
    mnc: clamp(rawReadiness.mnc),
  };

  const missingItems = ensureStringArray(raw.missingItems, ["Technical Details", "Impact Metrics"]);

  const missingEvidence = Array.isArray(raw.missingEvidence)
    ? raw.missingEvidence
        .filter((ev): ev is Record<string, unknown> => typeof ev === "object" && ev !== null)
        .map((ev) => ({
          context: typeof ev.context === "string" ? ev.context : "Resume Claim",
          missing: ensureStringArray(ev.missing, ["Metrics", "Context"]),
        }))
        .slice(0, 5)
    : [];

  const rawSection = typeof raw.sectionAnalysis === "object" && raw.sectionAnalysis !== null ? (raw.sectionAnalysis as Record<string, unknown>) : {};
  const sectionAnalysis = {
    expected: ensureStringArray(rawSection.expected, ["Experience", "Projects", "Skills"]),
    found: ensureStringArray(rawSection.found, ["Experience"]),
    missing: ensureStringArray(rawSection.missing, ["Projects", "Skills"]),
  };

  const topAdditions = Array.isArray(raw.topAdditions)
    ? raw.topAdditions
        .filter((add): add is Record<string, unknown> => typeof add === "object" && add !== null)
        .map((add) => ({
          item: typeof add.item === "string" ? add.item : "Add details",
          scoreImpact: clamp(add.scoreImpact),
        }))
        .slice(0, 5)
    : [];

  return {
    overallScore: clamp(raw.overallScore),
    readiness,
    missingItems,
    missingEvidence,
    sectionAnalysis,
    topAdditions,
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
