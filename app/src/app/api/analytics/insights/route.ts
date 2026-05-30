import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const kpis = await req.json();

    const prompt = `You are an expert SaaS Product Manager analyzing funnel data for an app called ResumeIQ. 
ResumeIQ flow: Landing Page -> Upload Resume -> Select Role -> AI Analysis -> View Results.

Here is the current usage data:
${JSON.stringify(kpis, null, 2)}

Analyze this data. What is the biggest dropoff point? What is the likely cause? What should the engineering team fix?
Return EXACTLY a JSON object with this structure:
{
  "biggestDropoff": "<string>",
  "evidence": "<string>",
  "likelyCause": "<string>",
  "recommendation": "<string>"
}`;

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error("NVIDIA_API_KEY is missing");
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
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON output
    const parsed = JSON.parse(rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());

    return NextResponse.json({ success: true, insight: parsed });
  } catch (error) {
    console.error("Failed to generate analytics insight:", error);
    return NextResponse.json({ success: false, error: "Failed to generate insight" }, { status: 500 });
  }
}
