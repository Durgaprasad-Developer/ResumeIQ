"use client";

// Generate or retrieve a persistent session ID for the current browser session
function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  
  let sessionId = sessionStorage.getItem("resumeiq_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("resumeiq_session_id", sessionId);
  }
  return sessionId;
}

export interface AnalyticsEvent {
  event_name: string;
  properties?: Record<string, unknown>;
  session_id: string;
  timestamp: string;
}

/**
 * Tracks a custom analytics event and sends it to the local backend.
 */
export async function track(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const event: AnalyticsEvent = {
    event_name: eventName,
    properties,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
  };

  try {
    // Send without blocking execution
    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      // keepalive ensures the request finishes even if the user navigates away
      keepalive: true, 
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}
