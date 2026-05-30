import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

function getDataPath(): string {
  // Fallback to /tmp in serverless/production to prevent EROFS (Read-only file system)
  if (process.env.VERCEL || process.env.NODE_ENV === "production" || process.env.LAMBDA_TASK_ROOT) {
    return path.join(os.tmpdir(), "events.json");
  }
  return path.join(process.cwd(), "data", "events.json");
}

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const dataPath = getDataPath();
    
    // Ensure the parent directory exists
    try {
      await fs.mkdir(path.dirname(dataPath), { recursive: true });
    } catch {
      // Ignore if directory already exists
    }

    let events = [];
    
    // Try to read existing events
    try {
      const fileData = await fs.readFile(dataPath, "utf8");
      events = JSON.parse(fileData);
    } catch {
      events = [];
    }
    
    // Append the new event
    events.push(event);
    
    // Write back to the file
    try {
      await fs.writeFile(dataPath, JSON.stringify(events, null, 2), "utf8");
    } catch (writeError) {
      console.warn("Could not write event to file (likely read-only tmp), logging to console instead:", writeError);
      console.info("Analytics Event:", event);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to store analytics event:", error);
    // Return success: true anyway so analytics failures never crash the front-end client
    return NextResponse.json({ success: true, warning: "Stored via console fallback" });
  }
}
