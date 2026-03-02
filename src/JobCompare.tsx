// src/JobCompare.tsx
import { useState, useEffect, useMemo, memo } from "react";
import type { Job, CompareResult, Profile } from "./api";
import { compareJobs } from "./api";
import type { SkillStatus } from "./utils/skillMatching";
import { analyzeSkillGap, STATUS_COLORS } from "./utils/skillMatching";

interface JobCompareProps {
  jobs: Job[];
  token: string;
  profile?: Profile | null;
  onBack: () => void;
  compareFn?: (token: string, jobIds: string[]) => Promise<CompareResult>;
  backLabel?: string;
}

const JOB_LABELS = ["Job A", "Job B", "Job C", "Job D"];

// ── Coverage Ring ────────────────────────────────────
const CoverageRing = memo(function CoverageRing({ pct, size = 64, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
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
        fill={color} fontSize={size * 0.24} fontWeight={800}
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
        {pct}%
      </text>
    </svg>
  );
});

// ── Glass Card helper ────────────────────────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(200, 210, 240, 0.04)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderRadius: 12,
      border: "1px solid rgba(150, 170, 220, 0.08)",
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Score Bar ────────────────────────────────────────
const ScoreBar = memo(function ScoreBar({ score, isWinner, color }: { score: number; isWinner: boolean; color: string }) {
  return (
    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(200,210,240,0.06)" }}>
      <div style={{
        width: `${score}%`, height: "100%", borderRadius: 4,
        background: isWinner ? color : `${color}66`,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
});

// ── Known Skills for auto-detection ──────────────────
const KNOWN_SKILLS = [
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

function extractSkillsFromDescription(description: string): string[] {
  if (!description) return [];
  const found: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(description)) found.push(skill);
  }
  return found;
}

// ── Dimension colors ─────────────────────────────────
const DIMENSION_COLORS: Record<string, string> = {
  "Compensation": "#fbbf24",
  "Growth Potential": "#818cf8",
  "Skill Alignment": "#4ade80",
  "Work-Life Balance": "#67e8f9",
  "Company Stability": "#a78bfa",
  "Culture Fit": "#f472b6",
};

// ═════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════

export default function JobCompare({ jobs, token, profile, onBack, compareFn, backLabel }: JobCompareProps) {
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    runComparison();
  }, []);

  async function runComparison() {
    setLoading(true);
    setError("");
    try {
      const fn = compareFn || compareJobs;
      const result = await fn(token, jobs.map((j) => j.id));
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  // Compute skill gaps for each job
  const skillGaps = useMemo(() => {
    if (!profile?.skills || profile.skills.length === 0) return jobs.map(() => null);
    return jobs.map((job) => {
      const effectiveRequired = job.requiredSkills?.length > 0
        ? job.requiredSkills
        : extractSkillsFromDescription(job.description);
      const effectivePreferred = job.preferredSkills || [];
      if (effectiveRequired.length === 0 && effectivePreferred.length === 0) return null;
      return analyzeSkillGap(profile.skills, effectiveRequired, effectivePreferred);
    });
  }, [jobs, profile?.skills]);

  const gridCols = jobs.length <= 2 ? "1fr 1fr" : jobs.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr";

  // Map job index to label
  const labelForIndex = (i: number) => JOB_LABELS[i];
  const isRecommended = (i: number) =>
    comparison?.recommendation === labelForIndex(i);

  // Status badge styling (shared constant)
  const statusColors = STATUS_COLORS;

  return (
    <div style={{ maxWidth: "var(--content-max)", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <button
            onClick={onBack}
            style={{
              background: "rgba(200, 210, 240, 0.06)", border: "1px solid rgba(150, 170, 220, 0.1)",
              borderRadius: "var(--radius-sm)", padding: "7px 16px", fontSize: 14,
              color: "#b0aac0", fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            ← {backLabel || "Tracker"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Job Comparison
          </h1>
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 600,
            background: "rgba(129, 140, 248, 0.1)", color: "#a5b4fc",
          }}>
            {jobs.length} jobs
          </span>
        </div>
        <button
          onClick={runComparison}
          disabled={loading}
          style={{
            padding: "7px 20px",
            background: loading ? "rgba(200, 210, 240, 0.04)" : "linear-gradient(135deg, #818cf8, #6366f1)",
            color: loading ? "var(--text-muted)" : "white",
            border: "none", borderRadius: "var(--radius-sm)",
            fontWeight: 600, fontSize: 14,
            fontFamily: "inherit", cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Analyzing..." : "Re-analyze"}
        </button>
      </div>

      {/* Job Header Cards */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12, marginBottom: 20 }}>
        {jobs.map((job, i) => {
          const st = statusColors[job.status || "saved"] || statusColors.saved;
          const recommended = isRecommended(i);
          return (
            <GlassCard
              key={job.id}
              style={{
                padding: 20,
                borderColor: recommended ? "rgba(129, 140, 248, 0.3)" : undefined,
                boxShadow: recommended ? "0 0 24px rgba(129, 140, 248, 0.12)" : undefined,
                position: "relative",
              }}
            >
              {/* Label badge */}
              <div style={{
                fontSize: 10, fontWeight: 700, color: "#8a8498",
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {labelForIndex(i)}
                {recommended && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                    background: "rgba(129, 140, 248, 0.15)", color: "#a5b4fc",
                  }}>
                    Recommended
                  </span>
                )}
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {job.title}
              </div>
              <div style={{ fontSize: 14, color: "#b0aac0", marginBottom: 10 }}>
                {job.company}
                {job.location && ` · ${job.location}`}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {job.salaryRange && (
                  <span style={{
                    fontSize: 12, padding: "3px 10px", borderRadius: 6, fontWeight: 600,
                    background: "rgba(251, 191, 88, 0.08)", color: "#fbbf24",
                  }}>
                    {job.salaryRange}
                  </span>
                )}
                {job.jobType && (
                  <span style={{
                    fontSize: 12, padding: "3px 10px", borderRadius: 6, fontWeight: 500,
                    background: "rgba(200, 210, 240, 0.06)", color: "#b0aac0",
                    textTransform: "capitalize",
                  }}>
                    {job.jobType}
                  </span>
                )}
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                  background: st.bg, color: st.text, textTransform: "capitalize",
                }}>
                  {job.status || "saved"}
                </span>
              </div>

              {/* Match Score */}
              {job.matchScore > 0 && (
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: job.matchScore >= 80 ? "#6ee7a8" : job.matchScore >= 60 ? "#818cf8" : "#fbbf58",
                }}>
                  {job.matchScore}% match
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <GlassCard style={{ padding: 40, textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", margin: "0 auto 16px",
            border: "3px solid rgba(129, 140, 248, 0.2)", borderTopColor: "#818cf8",
            animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
            Analyzing {jobs.length} jobs...
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            AI is comparing compensation, growth potential, skill alignment, and more
          </div>
        </GlassCard>
      )}

      {/* Error State */}
      {error && !loading && (
        <GlassCard style={{ padding: 24, borderColor: "rgba(248, 113, 113, 0.15)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f87171", fontSize: 14, fontWeight: 600 }}>Comparison failed</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>{error}</div>
            </div>
            <button
              onClick={runComparison}
              style={{
                padding: "7px 16px", background: "rgba(248, 113, 113, 0.1)",
                border: "1px solid rgba(248, 113, 113, 0.2)", borderRadius: "var(--radius-sm)",
                color: "#f87171", fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </GlassCard>
      )}

      {/* AI Recommendation Banner */}
      {comparison && !loading && (
        <>
          <GlassCard style={{
            padding: 24, marginBottom: 20,
            borderLeft: "3px solid #818cf8",
            background: "rgba(129, 140, 248, 0.04)",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#8a8498", textTransform: "uppercase",
              letterSpacing: "0.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8,
            }}>
              AI Recommendation
              <span style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 500,
                background: "rgba(129, 140, 248, 0.1)", color: "#a5b4fc",
              }}>
                Powered by AI
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {comparison.recommendation}: {jobs[JOB_LABELS.indexOf(comparison.recommendation)]?.title || ""} at {jobs[JOB_LABELS.indexOf(comparison.recommendation)]?.company || ""}
            </div>
            <div style={{ fontSize: 14, color: "#b0aac0", lineHeight: 1.6, marginBottom: 12 }}>
              {comparison.recommendationReason}
            </div>
            <div style={{ fontSize: 13, color: "#8a8498", lineHeight: 1.6 }}>
              {comparison.summary}
            </div>

            {/* Rankings */}
            {comparison.rankings && comparison.rankings.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                {comparison.rankings.map((r) => {
                  const jobIndex = JOB_LABELS.indexOf(r.label);
                  return (
                    <div key={r.label} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 14px", borderRadius: 8,
                      background: r.rank === 1 ? "rgba(129, 140, 248, 0.1)" : "rgba(200, 210, 240, 0.04)",
                      border: `1px solid ${r.rank === 1 ? "rgba(129, 140, 248, 0.2)" : "rgba(150, 170, 220, 0.06)"}`,
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800,
                        background: r.rank === 1 ? "rgba(129, 140, 248, 0.2)" : "rgba(200, 210, 240, 0.06)",
                        color: r.rank === 1 ? "#a5b4fc" : "#8a8498",
                      }}>
                        #{r.rank}
                      </span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#c8c2d4" }}>
                          {jobIndex >= 0 ? jobs[jobIndex]?.company : r.label}
                        </div>
                        <div style={{ fontSize: 10, color: "#8a8498" }}>Score: {r.score}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Dimension Comparison */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#8a8498", textTransform: "uppercase",
              letterSpacing: "0.5px", marginBottom: 12,
            }}>
              Detailed Comparison
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {comparison.dimensions.map((dim) => {
                const dimColor = DIMENSION_COLORS[dim.name] || "#818cf8";
                return (
                  <GlassCard key={dim.name} style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", background: dimColor,
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          {dim.name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: dim.winner === "tie" ? "#fbbf24" : "#818cf8",
                      }}>
                        {dim.winner === "tie" ? "Tie" : `${dim.winner} wins`}
                      </span>
                    </div>

                    {/* Score bars for each job */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {jobs.map((job, i) => {
                        const label = labelForIndex(i);
                        const score = dim.scores?.[label] ?? 0;
                        const maxScore = Math.max(...Object.values(dim.scores || {}));
                        return (
                          <div key={job.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              width: 70, fontSize: 11, color: "var(--text-muted)",
                              textAlign: "right", flexShrink: 0,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {job.company}
                            </span>
                            <ScoreBar score={score} isWinner={score === maxScore} color={dimColor} />
                            <span style={{
                              width: 28, fontSize: 12, fontWeight: 700,
                              color: score === maxScore ? "var(--text-primary)" : "var(--text-muted)",
                              textAlign: "right", flexShrink: 0,
                            }}>
                              {score}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {dim.notes && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                        {dim.notes}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Caveats */}
          {comparison.caveats && comparison.caveats.length > 0 && (
            <GlassCard style={{ padding: 20, marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: "#8a8498", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 10,
              }}>
                Things to Consider
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {comparison.caveats.map((caveat, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#b0aac0", lineHeight: 1.5 }}>
                    <span style={{ color: "#fbbf24", flexShrink: 0 }}>•</span>
                    {caveat}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* Skill Gap Comparison */}
      {profile?.skills && profile.skills.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#8a8498", textTransform: "uppercase",
            letterSpacing: "0.5px", marginBottom: 12,
          }}>
            Skill Gap Comparison
          </div>
          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12 }}>
            {jobs.map((job, i) => {
              const gap = skillGaps[i];
              return (
                <GlassCard key={job.id} style={{ padding: 20 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#8a8498",
                    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12,
                  }}>
                    {labelForIndex(i)}: {job.company}
                  </div>

                  {gap ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <CoverageRing pct={gap.coverageRequired} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                            {gap.coverageRequired >= 80 ? "Strong Fit" : gap.coverageRequired >= 60 ? "Good Fit" : "Gaps to Fill"}
                          </div>
                          <div style={{ fontSize: 11, color: "#8a8498" }}>
                            <span style={{ color: "#4ade80" }}>{gap.haveCount}</span> matched ·{" "}
                            <span style={{ color: "#fbbf24" }}>{gap.partialCount}</span> partial ·{" "}
                            <span style={{ color: "#f87171" }}>{gap.missingCount}</span> missing
                          </div>
                        </div>
                      </div>

                      {/* Compact skill list */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {[...gap.items]
                          .filter((item) => !item.isPreferred)
                          .sort((a, b) => {
                            const order: Record<SkillStatus, number> = { missing: 0, partial: 1, have: 2 };
                            return order[a.status] - order[b.status];
                          })
                          .slice(0, 8)
                          .map((item) => {
                            const statusCfg = {
                              have: { symbol: "✓", color: "#4ade80" },
                              partial: { symbol: "~", color: "#fbbf24" },
                              missing: { symbol: "✕", color: "#f87171" },
                            }[item.status];
                            return (
                              <div key={item.skill} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                fontSize: 12, color: "#c8c2d4",
                              }}>
                                <span style={{ color: statusCfg.color, fontWeight: 800, fontSize: 10, width: 14, textAlign: "center" }}>
                                  {statusCfg.symbol}
                                </span>
                                {item.skill}
                              </div>
                            );
                          })}
                        {gap.items.filter((i) => !i.isPreferred).length > 8 && (
                          <div style={{ fontSize: 11, color: "#8a8498", paddingLeft: 20 }}>
                            +{gap.items.filter((i) => !i.isPreferred).length - 8} more
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "12px 0", color: "#8a8498", fontSize: 12 }}>
                      No skill requirements listed
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
