"use client";

import { useState } from "react";

interface Props {
  fileName: string;
  onConfirmRole: (role: string) => void;
  onCancel: () => void;
}

const PREDEFINED_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "AI / ML Engineer",
  "Data Scientist / Analyst",
  "DevOps Engineer",
  "Software Engineer",
  "Product Manager",
  "UI / UX Designer",
];

export default function RoleSelectionScreen({ fileName, onConfirmRole, onCancel }: Props) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [customRole, setCustomRole] = useState("");

  const handleConfirm = () => {
    const finalRole = isCustom ? customRole.trim() : selectedRole;
    if (!finalRole) return;
    onConfirmRole(finalRole);
  };

  return (
    <div
      style={{ background: "var(--rs-black)", minHeight: "100vh" }}
      className="relative flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 60px)
          `,
        }}
      />

      {/* Center content */}
      <div className="relative z-10 w-full max-w-2xl animate-fadeInUp">
        <div className="text-center mb-10">
          <div className="font-dm-mono text-xs text-lime-400 mb-4 tracking-widest uppercase flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            File Attached: {fileName}
          </div>
          <h1
            className="font-syne font-extrabold text-4xl md:text-5xl mb-4"
            style={{ color: "var(--rs-white)" }}
          >
            Select Target Role
          </h1>
          <p
            className="font-dm-sans text-sm md:text-base max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(250, 250, 248, 0.6)" }}
          >
            Recruiters hire for specific positions, not generic resumes. Select the role you are targeting so our AI can accurately benchmark your missing signals.
          </p>
        </div>

        <div
          className="rounded-3xl p-6 sm:p-8 backdrop-blur-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {PREDEFINED_ROLES.map((role) => {
              const isSelected = !isCustom && selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedRole(role);
                  }}
                  className="text-left font-dm-mono text-sm px-4 py-3 rounded-xl transition-all duration-200 border"
                  style={{
                    background: isSelected ? "rgba(200,245,60,0.1)" : "rgba(255,255,255,0.03)",
                    color: isSelected ? "var(--rs-white)" : "rgba(250,250,248,0.7)",
                    borderColor: isSelected ? "rgba(200,245,60,0.3)" : "rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />}
                    </div>
                    <span className="truncate">{role}</span>
                  </div>
                </button>
              );
            })}
            
            {/* Custom role toggle */}
            <button
              onClick={() => {
                setIsCustom(true);
                setSelectedRole("");
              }}
              className="text-left font-dm-mono text-sm px-4 py-3 rounded-xl transition-all duration-200 border"
              style={{
                background: isCustom ? "rgba(200,245,60,0.1)" : "rgba(255,255,255,0.03)",
                color: isCustom ? "var(--rs-white)" : "rgba(250,250,248,0.7)",
                borderColor: isCustom ? "rgba(200,245,60,0.3)" : "rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                  {isCustom && <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />}
                </div>
                <span>Other / Custom</span>
              </div>
            </button>
          </div>

          {/* Custom Input */}
          <div
            className={`transition-all duration-300 overflow-hidden ${
              isCustom ? "max-h-24 opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"
            }`}
          >
            <input
              type="text"
              placeholder="e.g. Marketing Manager, Sales Exec..."
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              className="w-full font-dm-mono text-sm px-4 py-3 rounded-xl outline-none transition-all"
              style={{
                background: "rgba(10,10,10,0.5)",
                color: "var(--rs-white)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--rs-accent)";
                e.target.style.background = "rgba(20,20,20,0.8)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.1)";
                e.target.style.background = "rgba(10,10,10,0.5)";
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5">
            <button
              onClick={onCancel}
              className="font-syne font-bold px-6 py-3 rounded-xl text-sm transition-all text-gray-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isCustom && !selectedRole || isCustom && !customRole.trim()}
              className="flex-1 font-syne font-bold px-6 py-3 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--rs-accent)",
                color: "var(--rs-black)",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = "var(--rs-accent-dark)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = "var(--rs-accent)";
                  e.currentTarget.style.transform = "none";
                }
              }}
            >
              Start Analysis →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
