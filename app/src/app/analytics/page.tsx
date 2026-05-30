"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  kpis: Record<string, number>;
  events: Record<string, unknown>[];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [insight, setInsight] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/data")
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
        }
        setLoading(false);
      });
  }, []);

  const generateInsight = async () => {
    if (!data?.kpis) return;
    setInsightLoading(true);
    try {
      const res = await fetch("/api/analytics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.kpis)
      });
      const json = await res.json();
      if (json.success) {
        setInsight(json.insight);
      }
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white p-12 flex items-center justify-center font-mono">Loading telemetry...</div>;
  }

  const kpis = data?.kpis || {};
  const events = data?.events || [];
  const typedInsight = insight;

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex justify-between items-end border-b border-white/10 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#c8f53c]">ResumeIQ Telemetry</h1>
            <p className="text-white/50 text-sm mt-1 font-mono">Micro-Analytics MVP Testbed</p>
          </div>
          <button 
            onClick={generateInsight}
            disabled={insightLoading}
            className="px-4 py-2 bg-[#c8f53c]/10 text-[#c8f53c] border border-[#c8f53c]/20 rounded-md font-mono text-sm hover:bg-[#c8f53c]/20 transition-colors disabled:opacity-50"
          >
            {insightLoading ? "Synthesizing..." : "Generate AI Insight"}
          </button>
        </header>

        {/* Insight Box */}
        {typedInsight && (
          <div className="bg-[#60a5fa]/10 border border-[#60a5fa]/20 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#60a5fa]/20 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <h2 className="text-[#60a5fa] font-bold mb-4 flex items-center gap-2">
              <span>✦</span> AI Product Manager Insight
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-white/50 text-xs font-mono mb-1 uppercase tracking-wider">Biggest Dropoff</p>
                <p className="text-lg font-semibold">{typedInsight.biggestDropoff}</p>
                
                <p className="text-white/50 text-xs font-mono mb-1 uppercase tracking-wider mt-4">Evidence</p>
                <p className="text-sm text-white/80">{typedInsight.evidence}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs font-mono mb-1 uppercase tracking-wider">Likely Cause</p>
                <p className="text-sm text-white/80">{typedInsight.likelyCause}</p>
                
                <p className="text-white/50 text-xs font-mono mb-1 uppercase tracking-wider mt-4">Recommendation</p>
                <p className="text-sm font-semibold text-[#c8f53c]">{typedInsight.recommendation}</p>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Visitors" value={kpis.visitors} />
          <KpiCard label="Uploads" value={kpis.uploads} />
          <KpiCard label="Completed" value={kpis.completed} />
          <KpiCard label="Failed" value={kpis.failed} />
          <KpiCard label="Repeat Users" value={kpis.repeatUsers} />
          <KpiCard label="Avg Score" value={kpis.avgScore} />
        </div>

        {/* Funnel */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white/50 text-xs font-mono mb-6 uppercase tracking-wider">Conversion Funnel</h3>
          <div className="flex flex-col gap-3">
            <FunnelBar label="Landing Page" value={kpis.visitors} max={kpis.visitors} />
            <FunnelBar label="Uploads" value={kpis.uploads} max={kpis.visitors} />
            <FunnelBar label="Completed Analysis" value={kpis.completed} max={kpis.visitors} />
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white/50 text-xs font-mono mb-4 uppercase tracking-wider">Raw Event Stream</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50 font-mono text-xs">
                  <th className="pb-3 pr-4 font-normal">Timestamp</th>
                  <th className="pb-3 pr-4 font-normal">Event</th>
                  <th className="pb-3 pr-4 font-normal">Session ID</th>
                  <th className="pb-3 font-normal">Properties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {events.map((e: Record<string, unknown>, i: number) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="py-2 pr-4 text-white/40">{new Date(e.timestamp as string).toLocaleTimeString()}</td>
                    <td className="py-2 pr-4 text-[#c8f53c]">{String(e.event_name)}</td>
                    <td className="py-2 pr-4 text-white/40 truncate max-w-[100px]">{String(e.session_id).substring(0, 8)}...</td>
                    <td className="py-2 text-white/60">{JSON.stringify(e.properties || {})}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-white/30">No events recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between h-24">
      <span className="text-white/50 text-xs font-mono uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold">{value || 0}</span>
    </div>
  );
}

function FunnelBar({ label, value, max }: { label: string, value: number, max: number }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 text-sm text-white/80 text-right">{label}</div>
      <div className="flex-1 h-8 bg-white/5 rounded-r-md flex items-center relative">
        <div 
          className="h-full bg-[#c8f53c]/40 rounded-r-md transition-all duration-1000" 
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-y-0 left-3 flex items-center text-xs font-mono">
          {value} <span className="text-white/40 ml-2">({percentage}%)</span>
        </div>
      </div>
    </div>
  );
}
