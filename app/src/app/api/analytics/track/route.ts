import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    
    // Define the path to our local JSON store
    const dataPath = path.join(process.cwd(), "data", "events.json");
    
    let events = [];
    
    // Try to read existing events
    try {
      const fileData = await fs.readFile(dataPath, "utf8");
      events = JSON.parse(fileData);
    } catch {
      // File might not exist yet or is empty, start fresh
      events = [];
    }
    
    // Append the new event
    events.push(event);
    
    // Write back to the file
    await fs.writeFile(dataPath, JSON.stringify(events, null, 2), "utf8");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to store analytics event:", error);
    return NextResponse.json({ success: false, error: "Failed to store event" }, { status: 500 });
  }
}
