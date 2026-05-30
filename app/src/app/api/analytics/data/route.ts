import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { AnalyticsEvent } from "@/lib/analytics";

function getDataPath(): string {
  // Fallback to /tmp in serverless/production to prevent EROFS (Read-only file system)
  if (process.env.VERCEL || process.env.NODE_ENV === "production" || process.env.LAMBDA_TASK_ROOT) {
    return path.join(os.tmpdir(), "events.json");
  }
  return path.join(process.cwd(), "data", "events.json");
}

export async function GET() {
  try {
    const dataPath = getDataPath();
    let events: AnalyticsEvent[] = [];
    
    try {
      const fileData = await fs.readFile(dataPath, "utf8");
      events = JSON.parse(fileData);
    } catch {
      events = [];
    }
    
    // Calculate KPIs
    const uniqueSessions = new Set(events.map(e => e.session_id));
    const visitors = uniqueSessions.size;
    
    const uploads = events.filter(e => e.event_name === "resume_uploaded").length;
    const completed = events.filter(e => e.event_name === "analysis_completed").length;
    const failed = events.filter(e => e.event_name === "analysis_failed").length;
    
    // Repeat users (sessions that clicked "analyze_another_resume")
    const repeatUsers = new Set(
      events.filter(e => e.event_name === "analyze_another_resume").map(e => e.session_id)
    ).size;
    
    // Average score
    const scoreEvents = events.filter(e => e.event_name === "analysis_completed" && e.properties?.overallScore);
    const avgScore = scoreEvents.length > 0
      ? Math.round(scoreEvents.reduce((acc, e) => acc + ((e.properties?.overallScore as number) || 0), 0) / scoreEvents.length)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          visitors,
          uploads,
          completed,
          failed,
          repeatUsers,
          avgScore,
        },
        events: events.reverse().slice(0, 50) // Return last 50 events for the log
      }
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch data" }, { status: 500 });
  }
}
