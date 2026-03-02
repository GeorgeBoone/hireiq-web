// src/JobDetail.tsx
import { useState, useEffect, useMemo, memo } from "react";
import type { Job, CompanyIntel, Profile, Application, StatusHistory } from "./api";
import {
  getCompanyIntel,
  getApplication,
  createApplication,
  updateApplicationStatus,
  updateApplicationDetails,
  getApplicationHistory,
} from "./api";
import type { SkillStatus, SkillGapItem, SkillGapResult } from "./utils/skillMatching";
import { normalizeSkill, isPartialMatch, analyzeSkillGap, STATUS_COLORS } from "./utils/skillMatching";

interface JobDetailProps {
  job: Job;
  token: string;
  profile?: Profile | null;
  onEdit: () => void;
  onBack: () => void;
  onBackToDiscover?: () => void;
  onCritique?: (jobId: string) => void;
}

// ── SVG Sparkline ────────────────────────────────────
const MiniSparkline = memo(function MiniSparkline({
  data,
  color,
  height = 36,
  width = 130,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `grad-${color.replace("#", "")}-${width}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 6) - 3}
        r="3"
        fill={color}
      />
    </svg>
  );
});

// ── Analyst Recommendation Badge ─────────────────────
function RecommendationBadge({ mean, label }: { mean: number; label: string }) {
  const color =
    mean <= 1.5 ? "#4ade80" : mean <= 2.5 ? "#60a5fa" : mean <= 3.5 ? "#fbbf24" : "#f87171";
  const text =
    label || (mean <= 1.5 ? "Strong Buy" : mean <= 2.5 ? "Buy" : mean <= 3.5 ? "Hold" : "Sell");

  return (
    <span
      style={{
        padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
        background: `${color}18`, color, textTransform: "capitalize",
      }}
    >
      {text}
    </span>
  );
}

// ── Formatting Helpers ───────────────────────────────
function fmtLargeNum(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  if (!n) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function calcGrowth(data: number[]): string {
  if (!data || data.length < 2) return "";
  const first = data[0];
  const last = data[data.length - 1];
  if (!first) return "";
  const pct = ((last - first) / first) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

// ── Glass Card ───────────────────────────────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "rgba(200, 210, 240, 0.04)",
        border: "1px solid rgba(150, 170, 220, 0.08)",
        borderRadius: 16, padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Coverage Ring ────────────────────────────────────
const CoverageRing = memo(function CoverageRing({ pct, size = 80, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? "#4ade80" : pct >= 60 ? "#60a5fa" : pct >= 40 ? "#fbbf24" : "#f87171";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="rgba(200, 210, 240, 0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.26} fontWeight={800}
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
        {pct}%
      </text>
    </svg>
  );
});

// ── Skill Gap Panel ──────────────────────────────────
function SkillGapPanel({ gap }: { gap: SkillGapResult }) {
  const statusIcon = (status: SkillStatus) => {
    switch (status) {
      case "have": return { symbol: "✓", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" };
      case "partial": return { symbol: "~", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" };
      case "missing": return { symbol: "✕", color: "#f87171", bg: "rgba(248, 113, 113, 0.1)" };
    }
  };

  const sorted = [...gap.items].sort((a, b) => {
    const order: Record<SkillStatus, number> = { missing: 0, partial: 1, have: 2 };
    return order[a.status] - order[b.status];
  });

  const requiredItems = sorted.filter((i) => !i.isPreferred);
  const preferredItems = sorted.filter((i) => i.isPreferred);

  return (
    <div>
      {/* Header + Coverage Ring */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <CoverageRing pct={gap.coverageRequired} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Skill Coverage
          </div>
          <div style={{ fontSize: 12, color: "#8a8498", lineHeight: 1.5 }}>
            <span style={{ color: "#4ade80", fontWeight: 600 }}>{gap.haveCount}</span> matched · {" "}
            <span style={{ color: "#fbbf24", fontWeight: 600 }}>{gap.partialCount}</span> partial · {" "}
            <span style={{ color: "#f87171", fontWeight: 600 }}>{gap.missingCount}</span> missing
          </div>
        </div>
      </div>

      {/* Required Skills */}
      {requiredItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, color: "#8a8498", fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.5px", marginBottom: 8,
          }}>
            Required Skills
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {requiredItems.map((item) => {
              const ic = statusIcon(item.status);
              return (
                <div key={item.skill} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 8,
                  background: ic.bg, border: `1px solid ${ic.color}22`,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: ic.color,
                    background: `${ic.color}18`,
                  }}>
                    {ic.symbol}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#c8c2d4", flex: 1 }}>
                    {item.skill}
                  </span>
                  {item.status === "partial" && item.matchedWith && (
                    <span style={{ fontSize: 10, color: "#fbbf24", opacity: 0.8 }}>
                      ≈ {item.matchedWith}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preferred Skills */}
      {preferredItems.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, color: "#8a8498", fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.5px", marginBottom: 8,
          }}>
            Nice to Have
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {preferredItems.map((item) => {
              const ic = statusIcon(item.status);
              return (
                <div key={item.skill} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", borderRadius: 8,
                  background: ic.bg, border: `1px solid ${ic.color}22`,
                  opacity: 0.85,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: ic.color,
                    background: `${ic.color}18`,
                  }}>
                    {ic.symbol}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#c8c2d4", flex: 1 }}>
                    {item.skill}
                  </span>
                  {item.status === "partial" && item.matchedWith && (
                    <span style={{ fontSize: 10, color: "#fbbf24", opacity: 0.8 }}>
                      ≈ {item.matchedWith}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing skills summary */}
      {gap.missingCount > 0 && (
        <GlassCard style={{ padding: 14, marginTop: 4 }}>
          <div style={{ fontSize: 10, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            Bridge the Gap
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#b0aac0" }}>
            {gap.items
              .filter((i) => i.status === "missing" && !i.isPreferred)
              .map((i) => i.skill)
              .join(", ")}{" "}
            — consider adding these to your skillset to strengthen your application.
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════

export default function JobDetail({ job, token, profile, onEdit, onBack, onBackToDiscover, onCritique }: JobDetailProps) {
  const [intel, setIntel] = useState<CompanyIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState("");

  useEffect(() => {
    if (!job.company || !token) return;
    setIntelLoading(true);
    setIntelError("");
    getCompanyIntel(token, job.company)
      .then((data) => setIntel(data))
      .catch((err) => setIntelError(err instanceof Error ? err.message : "Failed to load company intel"))
      .finally(() => setIntelLoading(false));
  }, [job.company, token]);

  const { revenueData, earningsData, revenueGrowth, earningsGrowth } = useMemo(() => {
    const earnings = intel?.earnings || [];
    const rev = earnings.map((e) => e.revenue);
    const earn = earnings.map((e) => e.earnings);
    return {
      revenueData: rev,
      earningsData: earn,
      revenueGrowth: calcGrowth(rev),
      earningsGrowth: calcGrowth(earn),
    };
  }, [intel?.earnings]);

  // Skill gap analysis
  const extractedSkills = useMemo(() => {
    // If job already has requiredSkills, use them
    if (job.requiredSkills && job.requiredSkills.length > 0) return [];
    // Otherwise extract from description
    if (!job.description) return [];
    const desc = job.description.toLowerCase();
    const knownSkills = [
      "Java", "JavaScript", "TypeScript", "Python", "Go", "Rust", "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin",
      "React", "React Native", "Angular", "Vue", "Svelte", "Next.js", "Nuxt", "Node.js", "Express", "Django", "Flask",
      "Spring Boot", "Spring", ".NET", "ASP.NET", "Rails", "Laravel",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins", "CI/CD",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Cassandra",
      "Kafka", "RabbitMQ", "GraphQL", "REST", "gRPC", "Microservices",
      "HTML", "CSS", "Sass", "Tailwind", "Bootstrap",
      "Git", "Linux", "Agile", "Scrum", "Jira",
      "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP",
      "Figma", "Sketch", "UI/UX",
      "SQL", "NoSQL", "ETL", "Data Pipeline",
      "Firebase", "Supabase", "Auth0",
      "Nginx", "Apache", "Webpack", "Vite",
      "Jest", "Cypress", "Selenium", "Unit Testing",
      "OAuth", "JWT", "SSO",
    ];
    const found: string[] = [];
    for (const skill of knownSkills) {
      // Word boundary match to avoid partial matches like "Go" in "Google"
      const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(desc)) {
        found.push(skill);
      }
    }
    return found;
  }, [job.requiredSkills, job.description]);

  const effectiveRequired = job.requiredSkills?.length > 0 ? job.requiredSkills : extractedSkills;
  const effectivePreferred = job.preferredSkills || [];
  const allJobSkills = [...effectiveRequired, ...effectivePreferred];
  const hasSkillData = allJobSkills.length > 0 && profile?.skills && profile.skills.length > 0;
  const skillsExtracted = extractedSkills.length > 0;
  const skillGap = useMemo(() => {
    if (!hasSkillData) return null;
    return analyzeSkillGap(profile!.skills, effectiveRequired, effectivePreferred);
  }, [profile?.skills, effectiveRequired, effectivePreferred, hasSkillData]);

  // ── Pipeline Tracker state ────────────────────────────
  const [application, setApplication] = useState<Application | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [nextStepDraft, setNextStepDraft] = useState("");
  const [detailsSaving, setDetailsSaving] = useState(false);

  useEffect(() => {
    if (!job.id || !token) return;
    setAppLoading(true);
    getApplication(token, job.id)
      .then((data) => {
        setApplication(data);
        if (data) {
          setNextStepDraft(data.nextStep || "");
          getApplicationHistory(token, job.id)
            .then(setHistory)
            .catch(() => {});
        }
      })
      .catch(() => setApplication(null))
      .finally(() => setAppLoading(false));
  }, [job.id, token]);

  async function handleStartTracking() {
    try {
      const now = new Date().toISOString();
      const created = await createApplication(token, job.id, {
        status: "applied",
        appliedAt: now,
      });
      setApplication(created);
      setNextStepDraft(created.nextStep || "");
    } catch (err) {
      console.error("Failed to start tracking:", err instanceof Error ? err.message : err);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!application) return;
    try {
      const updated = await updateApplicationStatus(token, job.id, newStatus, statusNote);
      setApplication(updated);
      setStatusConfirm(null);
      setStatusNote("");
      const h = await getApplicationHistory(token, job.id);
      setHistory(h);
    } catch (err) {
      console.error("Failed to update status:", err instanceof Error ? err.message : err);
    }
  }

  async function handleDetailsSave(details: {
    nextStep?: string;
    followUpDate?: string | null;
    followUpType?: string;
    followUpUrgent?: boolean;
  }) {
    if (!application) return;
    setDetailsSaving(true);
    try {
      const updated = await updateApplicationDetails(token, job.id, details);
      setApplication(updated);
    } catch (err) {
      console.error("Failed to update details:", err instanceof Error ? err.message : err);
    } finally {
      setDetailsSaving(false);
    }
  }

  const PIPELINE_STAGES = [
    { id: "saved", label: "Saved", color: "#818cf8", emoji: "📋" },
    { id: "applied", label: "Applied", color: "#c084fc", emoji: "📨" },
    { id: "screening", label: "Screening", color: "#fbbf58", emoji: "📞" },
    { id: "interview", label: "Interview", color: "#60a5fa", emoji: "🎯" },
    { id: "offer", label: "Offer", color: "#6ee7a8", emoji: "🎉" },
  ];

  const currentStageIndex = application
    ? PIPELINE_STAGES.findIndex((s) => s.id === application.status)
    : -1;

  const isTerminal = application?.status === "rejected" || application?.status === "withdrawn";

  return (
    <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              background: "rgba(200, 210, 240, 0.06)", border: "1px solid rgba(150, 170, 220, 0.1)",
              borderRadius: "var(--radius-sm)", padding: "7px 16px", fontSize: 14,
              color: "#b0aac0", fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            ← Tracker
          </button>
          {onBackToDiscover && (
            <button
              onClick={onBackToDiscover}
              style={{
                background: "rgba(200, 210, 240, 0.06)", border: "1px solid rgba(150, 170, 220, 0.1)",
                borderRadius: "var(--radius-sm)", padding: "7px 16px", fontSize: 14,
                color: "#b0aac0", fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              ← Discover
            </button>
          )}
        </div>
        <button
          onClick={onEdit}
          style={{
            padding: "7px 20px", background: "linear-gradient(135deg, #818cf8, #6366f1)",
            color: "white", border: "none", borderRadius: "var(--radius-sm)",
            fontWeight: 600, fontSize: 14, boxShadow: "0 2px 16px rgba(129, 140, 248, 0.2)",
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Edit
        </button>
      </div>

      {/* ── Pipeline Tracker ──────────────────────────── */}
      {!appLoading && !application && !isTerminal && (
        <div style={{
          marginBottom: 20,
          background: "rgba(200, 210, 240, 0.04)",
          border: "1px dashed rgba(150, 170, 220, 0.15)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              Pipeline Tracker
            </div>
            <div style={{ fontSize: 13, color: "#8a8498", marginTop: 2 }}>
              Start tracking this application to manage your pipeline
            </div>
          </div>
          <button
            onClick={handleStartTracking}
            style={{
              padding: "9px 24px",
              background: "linear-gradient(135deg, #818cf8, #6366f1)",
              color: "white", border: "none", borderRadius: "var(--radius-sm)",
              fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 2px 16px rgba(129, 140, 248, 0.2)",
            }}
          >
            Start Tracking
          </button>
        </div>
      )}

      {application && (
        <div style={{
          marginBottom: 20,
          background: "rgba(200, 210, 240, 0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(150, 170, 220, 0.1)",
          padding: "24px 28px",
          boxShadow: "var(--shadow-sm)",
        }}>
          {/* Pipeline stages */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const isCurrent = !isTerminal && stage.id === application.status;
              const isCompleted = !isTerminal && currentStageIndex > i;
              const isClickable = !isTerminal && stage.id !== application.status;

              return (
                <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div
                    onClick={() => isClickable && setStatusConfirm(stage.id)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      cursor: isClickable ? "pointer" : "default",
                      opacity: isTerminal ? 0.4 : (isCurrent || isCompleted ? 1 : 0.4),
                      transition: "all 0.2s",
                      flex: 1,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                      background: isCurrent
                        ? `${stage.color}22`
                        : isCompleted
                          ? `${stage.color}18`
                          : "rgba(200, 210, 240, 0.06)",
                      border: isCurrent
                        ? `2px solid ${stage.color}`
                        : isCompleted
                          ? `2px solid ${stage.color}66`
                          : "2px solid rgba(150, 170, 220, 0.1)",
                      boxShadow: isCurrent ? `0 0 16px ${stage.color}33` : "none",
                    }}>
                      {isCompleted ? "✓" : stage.emoji}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? stage.color : isCompleted ? "#b0aac0" : "#6e6a80",
                      letterSpacing: "-0.2px",
                    }}>
                      {stage.label}
                    </span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div style={{
                      height: 2, flex: "0 0 20px",
                      background: isCompleted ? `${stage.color}44` : "rgba(150, 170, 220, 0.08)",
                      marginTop: -18,
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Terminal status badge */}
          {isTerminal && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              padding: "8px 14px", borderRadius: "var(--radius-sm)",
              background: application.status === "rejected" ? "rgba(239, 68, 68, 0.1)" : "rgba(150, 170, 220, 0.08)",
              border: `1px solid ${application.status === "rejected" ? "rgba(239, 68, 68, 0.2)" : "rgba(150, 170, 220, 0.12)"}`,
            }}>
              <span style={{ fontSize: 14 }}>{application.status === "rejected" ? "✗" : "↩"}</span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: application.status === "rejected" ? "#ef4444" : "#b0aac0",
              }}>
                {application.status === "rejected" ? "Rejected" : "Withdrawn"}
              </span>
              <button
                onClick={() => setStatusConfirm("applied")}
                style={{
                  marginLeft: "auto", padding: "4px 12px", fontSize: 12, fontWeight: 600,
                  background: "rgba(200, 210, 240, 0.06)", border: "1px solid rgba(150, 170, 220, 0.1)",
                  borderRadius: "var(--radius-sm)", color: "#b0aac0", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Reopen
              </button>
            </div>
          )}

          {/* Status confirm dialog */}
          {statusConfirm && (
            <div style={{
              marginBottom: 16, padding: "14px 18px",
              background: "rgba(129, 140, 248, 0.06)",
              border: "1px solid rgba(129, 140, 248, 0.12)",
              borderRadius: "var(--radius-sm)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
                Move to {PIPELINE_STAGES.find((s) => s.id === statusConfirm)?.label || statusConfirm}?
              </div>
              <input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add a note (optional)..."
                style={{
                  width: "100%", padding: "8px 12px", fontSize: 13,
                  background: "rgba(200, 210, 240, 0.06)",
                  border: "1px solid rgba(150, 170, 220, 0.1)",
                  borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                  fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleStatusChange(statusConfirm)}
                  style={{
                    padding: "6px 18px", fontSize: 13, fontWeight: 600,
                    background: "linear-gradient(135deg, #818cf8, #6366f1)",
                    color: "white", border: "none", borderRadius: "var(--radius-sm)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setStatusConfirm(null); setStatusNote(""); }}
                  style={{
                    padding: "6px 18px", fontSize: 13, fontWeight: 500,
                    background: "transparent", border: "1px solid rgba(150, 170, 220, 0.1)",
                    borderRadius: "var(--radius-sm)", color: "#b0aac0",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reject / Withdraw actions */}
          {!isTerminal && !statusConfirm && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setStatusConfirm("rejected")}
                style={{
                  padding: "5px 14px", fontSize: 12, fontWeight: 500,
                  background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)",
                  borderRadius: "var(--radius-sm)", color: "#ef4444",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Mark Rejected
              </button>
              <button
                onClick={() => setStatusConfirm("withdrawn")}
                style={{
                  padding: "5px 14px", fontSize: 12, fontWeight: 500,
                  background: "rgba(200, 210, 240, 0.04)", border: "1px solid rgba(150, 170, 220, 0.1)",
                  borderRadius: "var(--radius-sm)", color: "#8a8498",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Withdraw
              </button>
            </div>
          )}

          {/* Details row */}
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "start",
            borderTop: "1px solid rgba(150, 170, 220, 0.08)", paddingTop: 16,
          }}>
            {/* Applied date */}
            <div>
              <div style={{ fontSize: 11, color: "#6e6a80", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Applied</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
                {application.appliedAt
                  ? new Date(application.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </div>
            </div>

            {/* Next step */}
            <div>
              <div style={{ fontSize: 11, color: "#6e6a80", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Next Step</div>
              <input
                value={nextStepDraft}
                onChange={(e) => setNextStepDraft(e.target.value)}
                onBlur={() => {
                  if (nextStepDraft !== (application.nextStep || "")) {
                    handleDetailsSave({ nextStep: nextStepDraft });
                  }
                }}
                placeholder="e.g. Phone screen with hiring manager, Tuesday 3pm"
                style={{
                  width: "100%", padding: "6px 10px", fontSize: 13,
                  background: "rgba(200, 210, 240, 0.04)",
                  border: "1px solid rgba(150, 170, 220, 0.08)",
                  borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                  fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Follow-up */}
            <div>
              <div style={{ fontSize: 11, color: "#6e6a80", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Follow Up</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="date"
                  value={application.followUpDate ? application.followUpDate.slice(0, 10) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleDetailsSave({
                      followUpDate: val ? new Date(val + "T12:00:00Z").toISOString() : null,
                      followUpType: application.followUpType || "email",
                      followUpUrgent: application.followUpUrgent,
                    });
                  }}
                  style={{
                    padding: "5px 8px", fontSize: 12,
                    background: "rgba(200, 210, 240, 0.04)",
                    border: "1px solid rgba(150, 170, 220, 0.08)",
                    borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                    fontFamily: "inherit",
                  }}
                />
                <select
                  value={application.followUpType || "email"}
                  onChange={(e) => handleDetailsSave({ followUpType: e.target.value })}
                  style={{
                    padding: "5px 8px", fontSize: 12,
                    background: "rgba(200, 210, 240, 0.04)",
                    border: "1px solid rgba(150, 170, 220, 0.08)",
                    borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
                    fontFamily: "inherit",
                  }}
                >
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">Other</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#8a8498", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={application.followUpUrgent}
                    onChange={(e) => handleDetailsSave({ followUpUrgent: e.target.checked })}
                    style={{ accentColor: "#ef4444" }}
                  />
                  Urgent
                </label>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          {history.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontSize: 12, fontWeight: 600, color: "#8a8498",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {historyExpanded ? "▾" : "▸"} History ({history.length})
              </button>

              {historyExpanded && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {history.map((h) => {
                    const stageColor = PIPELINE_STAGES.find((s) => s.id === h.toStatus)?.color || "#6e6a80";
                    return (
                      <div key={h.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 12px",
                        background: "rgba(200, 210, 240, 0.04)",
                        border: "1px solid rgba(150, 170, 220, 0.08)",
                        borderRadius: 20,
                      }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                          background: stageColor,
                        }} />
                        <span style={{ fontSize: 12, color: "#8a8498" }}>{h.fromStatus || "created"}</span>
                        <span style={{ fontSize: 11, color: "#6e6a80" }}>→</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: stageColor }}>{h.toStatus}</span>
                        {h.note && (
                          <span style={{ fontSize: 11, color: "#6e6a80", fontStyle: "italic", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {h.note}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: "#6e6a80", whiteSpace: "nowrap" }}>
                          {new Date(h.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {detailsSaving && (
            <div style={{ fontSize: 11, color: "#818cf8", marginTop: 8 }}>Saving...</div>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: 20,
        alignItems: "start",
      }}>
        {/* LEFT COLUMN: Job Detail */}
        <div
          style={{
            background: "rgba(200, 210, 240, 0.06)", backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)", borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(150, 170, 220, 0.1)", padding: 32, boxShadow: "var(--shadow-sm)",
            minWidth: 0,
          }}
        >
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {job.title}
            </h1>
            {job.bookmarked && <span style={{ fontSize: 20, color: "#fbbf58" }}>★</span>}
          </div>
          <p style={{ color: "#b0aac0", margin: "6px 0 0", fontSize: 15 }}>
            {job.company}
            {job.location && ` · ${job.location}`}
            {job.jobType && ` · ${job.jobType}`}
          </p>
        </div>

        {/* Key details grid */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
            marginBottom: 24, padding: 20, background: "rgba(200, 210, 240, 0.04)",
            border: "1px solid rgba(150, 170, 220, 0.06)", borderRadius: "var(--radius-md)",
          }}
        >
          {job.salaryRange && (
            <div>
              <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Salary</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>{job.salaryRange}</div>
            </div>
          )}
          {job.source && (
            <div>
              <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Source</div>
              <div style={{ fontSize: 15, color: "#c8c2d4", marginTop: 4, textTransform: "capitalize" }}>{job.source}</div>
            </div>
          )}
          {job.matchScore > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Match</div>
              <div style={{ marginTop: 4 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 4, fontWeight: 600, fontSize: 14,
                  background: job.matchScore >= 80 ? "rgba(110, 231, 168, 0.08)" : job.matchScore >= 60 ? "rgba(129, 140, 248, 0.08)" : "rgba(251, 191, 88, 0.08)",
                  color: job.matchScore >= 80 ? "#6ee7a8" : job.matchScore >= 60 ? "#818cf8" : "#fbbf58",
                }}>
                  {job.matchScore}%
                </span>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Saved</div>
            <div style={{ fontSize: 15, color: "#c8c2d4", marginTop: 4 }}>{new Date(job.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Required Skills */}
        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, color: "#8a8498", fontWeight: 600, marginBottom: 8 }}>Required Skills</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {job.requiredSkills.map((skill) => (
                <span key={skill} style={{
                  padding: "4px 12px", background: "rgba(251, 191, 88, 0.08)",
                  color: "#fbbf58", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid rgba(251, 191, 88, 0.1)",
                }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, color: "#8a8498", fontWeight: 600, marginBottom: 8 }}>Tags</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {job.tags.map((tag) => (
                <span key={tag} style={{
                  padding: "4px 12px", background: "rgba(129, 140, 248, 0.08)",
                  color: "#a5b4fc", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid rgba(129, 140, 248, 0.1)",
                }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Action links */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          {onCritique && (
            <button onClick={() => onCritique(job.id)} style={{
              padding: "9px 20px", background: "rgba(129, 140, 248, 0.06)", color: "#818cf8",
              borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
              border: "1px solid rgba(129, 140, 248, 0.12)", cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
            }}>Critique Resume</button>
          )}
          {job.applyUrl && (
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" style={{
              padding: "9px 20px", background: "linear-gradient(135deg, #6ee7a8, #34d399)",
              color: "#082f20", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
              display: "inline-block", textDecoration: "none",
              boxShadow: "0 2px 12px rgba(110, 231, 168, 0.2)",
            }}>Apply →</a>
          )}
          <a
            href={
              intel?.profile?.website
                ? `${intel.profile.website.replace(/\/$/, "")}/careers`
                : `https://www.google.com/search?q=${encodeURIComponent(job.company + " careers")}`
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "9px 20px", background: "rgba(200, 210, 240, 0.06)",
              color: "#a5b4fc", borderRadius: "var(--radius-sm)", fontSize: 14,
              display: "inline-flex", alignItems: "center", gap: 6,
              textDecoration: "none", border: "1px solid rgba(129, 140, 248, 0.12)",
              fontWeight: 600,
            }}
          >
            Careers Page ↗
          </a>
          {job.hiringEmail && (
            <a href={`mailto:${job.hiringEmail}`} style={{
              padding: "9px 20px", background: "rgba(200, 210, 240, 0.06)", color: "#b0aac0",
              borderRadius: "var(--radius-sm)", fontSize: 14, display: "inline-block",
              textDecoration: "none", border: "1px solid rgba(150, 170, 220, 0.1)",
            }}>Email Recruiter</a>
          )}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* COMPANY INTEL                                  */}
        {/* ═══════════════════════════════════════════════ */}

        <div style={{ marginBottom: 28 }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, color: "#8a8498", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              Company Intel
              {intel && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 500,
                  background: intel.source === "yahoo_finance" ? "rgba(110, 231, 168, 0.1)" : "rgba(129, 140, 248, 0.1)",
                  color: intel.source === "yahoo_finance" ? "#4ade80" : "#a5b4fc",
                }}>
                  {intel.source === "yahoo_finance" ? "Live Data" : "AI Estimated"}
                </span>
              )}
            </h3>
            {intel?.profile?.website && (
              <a href={intel.profile.website} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "#818cf8", textDecoration: "none" }}>
                {intel.profile.website.replace(/https?:\/\/(www\.)?/, "")} →
              </a>
            )}
          </div>

          {/* Loading */}
          {intelLoading && (
            <GlassCard>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 20, color: "#8a8498", fontSize: 14 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(129, 140, 248, 0.2)", borderTopColor: "#818cf8",
                  animation: "spin 0.8s linear infinite",
                }} />
                Loading company data...
              </div>
            </GlassCard>
          )}

          {/* Error */}
          {intelError && !intelLoading && (
            <GlassCard style={{ borderColor: "rgba(248, 113, 113, 0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f87171", fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>⚠</span> {intelError}
              </div>
            </GlassCard>
          )}

          {/* Intel loaded */}
          {intel && !intelLoading && (
            <>
              {/* Key stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {/* Market Cap / Valuation */}
                <GlassCard style={{ padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {intel.isPublic ? "Market Cap" : "Valuation"}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#a5b4fc" }}>
                    {intel.financials.marketCapFmt || fmtLargeNum(intel.financials.marketCap) || "—"}
                  </div>
                  {intel.ticker && (
                    <div style={{ fontSize: 10, color: "#8a8498", marginTop: 4 }}>
                      {intel.ticker}{intel.financials.currentPrice > 0 && ` · $${intel.financials.currentPrice.toFixed(2)}`}
                    </div>
                  )}
                </GlassCard>

                {/* Employees */}
                <GlassCard style={{ padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Employees</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#67e8f9" }}>
                    {intel.profile.fullTimeEmployees ? intel.profile.fullTimeEmployees.toLocaleString() : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#8a8498", marginTop: 4 }}>
                    {intel.profile.industry || intel.profile.sector || "—"}
                  </div>
                </GlassCard>

                {/* Revenue */}
                <GlassCard style={{ padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Revenue</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>
                    {intel.financials.totalRevenueFmt || fmtLargeNum(intel.financials.totalRevenue) || "—"}
                  </div>
                  {intel.financials.revenueGrowth !== 0 && (
                    <div style={{
                      fontSize: 10, marginTop: 4, fontWeight: 600,
                      color: intel.financials.revenueGrowth > 0 ? "#4ade80" : "#f87171",
                    }}>
                      {intel.financials.revenueGrowth > 0 ? "▲" : "▼"} {fmtPct(Math.abs(intel.financials.revenueGrowth))} YoY
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Sparklines (public cos with earnings) */}
              {(intel.earnings?.length ?? 0) >= 2 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <GlassCard style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quarterly Revenue</div>
                      {revenueGrowth && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: revenueGrowth.startsWith("+") ? "#4ade80" : "#f87171" }}>
                          {revenueGrowth}
                        </span>
                      )}
                    </div>
                    <MiniSparkline data={revenueData} color="#a5b4fc" />
                  </GlassCard>

                  <GlassCard style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quarterly Earnings</div>
                      {earningsGrowth && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: earningsGrowth.startsWith("+") ? "#4ade80" : "#f87171" }}>
                          {earningsGrowth}
                        </span>
                      )}
                    </div>
                    <MiniSparkline data={earningsData} color="#67e8f9" />
                  </GlassCard>
                </div>
              )}

              {/* Financial metrics (public) */}
              {intel.isPublic && (intel.financials.grossMargins > 0 || intel.financials.profitMargins !== 0) && (
                <GlassCard style={{ padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
                    {intel.financials.grossMargins > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 3 }}>Gross Margin</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c8c2d4" }}>{fmtPct(intel.financials.grossMargins)}</div>
                      </div>
                    )}
                    {intel.financials.profitMargins !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 3 }}>Profit Margin</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: intel.financials.profitMargins > 0 ? "#4ade80" : "#f87171" }}>
                          {fmtPct(intel.financials.profitMargins)}
                        </div>
                      </div>
                    )}
                    {intel.financials.trailingPE > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 3 }}>P/E Ratio</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#c8c2d4" }}>{intel.financials.trailingPE.toFixed(1)}</div>
                      </div>
                    )}
                    {intel.financials.freeCashflow !== 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 3 }}>Free Cash Flow</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: intel.financials.freeCashflow > 0 ? "#4ade80" : "#f87171" }}>
                          {intel.financials.freeCashflowFmt || fmtLargeNum(Math.abs(intel.financials.freeCashflow))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              )}

              {/* Analyst consensus (public) */}
              {intel.isPublic && intel.ratings.numberOfAnalysts > 0 && (
                <GlassCard style={{ padding: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Analyst Consensus</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <RecommendationBadge mean={intel.ratings.recommendationMean} label={intel.ratings.recommendationKey} />
                      <span style={{ fontSize: 11, color: "#8a8498" }}>{intel.ratings.numberOfAnalysts} analysts</span>
                    </div>
                  </div>
                  {intel.ratings.targetLowPrice > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 2 }}>Price Target Range</div>
                      <div style={{ fontSize: 13, color: "#c8c2d4" }}>
                        <span style={{ color: "#f87171" }}>${intel.ratings.targetLowPrice.toFixed(0)}</span>
                        {" — "}
                        <span style={{ fontWeight: 700, color: "#4ade80" }}>${intel.ratings.targetHighPrice.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}

              {/* Officers */}
              {intel.officers && intel.officers.length > 0 && (
                <GlassCard style={{ padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Leadership</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {intel.officers.slice(0, 4).map((officer) => (
                      <div key={officer.name} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
                        borderRadius: 10, background: "rgba(200, 210, 240, 0.04)",
                        border: "1px solid rgba(150, 170, 220, 0.06)",
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: "linear-gradient(135deg, rgba(129, 140, 248, 0.2), rgba(168, 85, 247, 0.15))",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, color: "#a5b4fc",
                        }}>
                          {officer.name?.split(" ").pop()?.[0] || "?"}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#c8c2d4" }}>{officer.name}</div>
                          <div style={{ fontSize: 10, color: "#8a8498" }}>{officer.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Company summary */}
              {intel.profile.summary && (
                <GlassCard style={{ padding: 16 }}>
                  <div style={{ fontSize: 10, color: "#8a8498", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    About {intel.company}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "#b0aac0", margin: 0 }}>
                    {intel.profile.summary}
                  </p>
                  <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    {intel.profile.city && (
                      <span style={{ fontSize: 11, color: "#8a8498" }}>
                        {intel.profile.city}, {intel.profile.country}
                      </span>
                    )}
                    {intel.profile.founded > 0 && (
                      <span style={{ fontSize: 11, color: "#8a8498" }}>
                        Founded {intel.profile.founded}
                      </span>
                    )}
                  </div>
                </GlassCard>
              )}
            </>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <h3 style={{ fontSize: 13, color: "#8a8498", fontWeight: 600, marginBottom: 8 }}>Description</h3>
            <div style={{
              padding: 20, background: "rgba(200, 210, 240, 0.04)",
              border: "1px solid rgba(150, 170, 220, 0.06)", borderRadius: "var(--radius-md)",
              whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14, color: "#c8c2d4",
            }}>
              {job.description}
            </div>
          </div>
        )}
      </div>
      {/* END LEFT COLUMN */}

      {/* RIGHT COLUMN: Skill Gap Analysis */}
      <div style={{
        position: "sticky", top: "calc(var(--nav-height, 56px) + 16px)",
        background: "rgba(200, 210, 240, 0.06)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)", borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(150, 170, 220, 0.1)", padding: 24, boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{
          fontSize: 14, color: "#8a8498", fontWeight: 600, margin: "0 0 16px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          Skill Gap Analysis
          {skillGap && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 500,
              background: skillGap.coverageRequired >= 80 ? "rgba(74, 222, 128, 0.1)" : skillGap.coverageRequired >= 60 ? "rgba(96, 165, 250, 0.1)" : "rgba(248, 113, 113, 0.1)",
              color: skillGap.coverageRequired >= 80 ? "#4ade80" : skillGap.coverageRequired >= 60 ? "#60a5fa" : "#f87171",
            }}>
              {skillGap.coverageRequired >= 80 ? "Strong Fit" : skillGap.coverageRequired >= 60 ? "Good Fit" : "Gaps to Fill"}
            </span>
          )}
          {skillsExtracted && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 500,
              background: "rgba(251, 191, 36, 0.1)", color: "#fbbf24",
            }}>
              Auto-detected
            </span>
          )}
        </h3>

        {skillGap ? (
          <SkillGapPanel gap={skillGap} />
        ) : !profile?.skills || profile.skills.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: 13, color: "#8a8498", lineHeight: 1.5 }}>
              Add skills to your profile to see how you match this role.
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 13, color: "#8a8498", lineHeight: 1.5 }}>
              This job doesn't have skill requirements listed yet.
            </div>
          </div>
        )}
      </div>

      </div>
      {/* END GRID */}

      {/* Keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
