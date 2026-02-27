// src/JobDetail.tsx
import { useState, useEffect } from "react";
import type { Job, CompanyIntel } from "./api";
import { getCompanyIntel } from "./api";

interface JobDetailProps {
  job: Job;
  token: string;
  onEdit: () => void;
  onBack: () => void;
  onBackToDiscover?: () => void;
  onCritique?: (jobId: string) => void;
}

// ── SVG Sparkline ────────────────────────────────────
function MiniSparkline({
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
}

// ── Rating Bar ───────────────────────────────────────
function RatingBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color =
    value >= 4.3 ? "#4ade80" : value >= 3.8 ? "#60a5fa" : value >= 3.3 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
      <span style={{ fontSize: 11, color: "rgba(176, 170, 192, 0.7)", width: 56, flexShrink: 0 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1, height: 5, borderRadius: 3,
          background: "rgba(200, 210, 240, 0.06)", overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%", borderRadius: 3, width: `${pct}%`,
            background: color, boxShadow: `0 0 8px ${color}44`,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, width: 26, textAlign: "right" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

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

// ═════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════

export default function JobDetail({ job, token, onEdit, onBack, onBackToDiscover, onCritique }: JobDetailProps) {
  const [intel, setIntel] = useState<CompanyIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState("");

  useEffect(() => {
    if (!job.company || !token) return;
    setIntelLoading(true);
    setIntelError("");
    getCompanyIntel(token, job.company)
      .then((data) => setIntel(data))
      .catch((err) => setIntelError(err.message || "Failed to load company intel"))
      .finally(() => setIntelLoading(false));
  }, [job.company, token]);

  const earnings = intel?.earnings || [];
  const revenueData = earnings.map((e) => e.revenue);
  const earningsData = earnings.map((e) => e.earnings);
  const revenueGrowth = calcGrowth(revenueData);
  const earningsGrowth = calcGrowth(earningsData);

  return (
    <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
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

      {/* Main card */}
      <div
        style={{
          background: "rgba(200, 210, 240, 0.06)", backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)", borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(150, 170, 220, 0.1)", padding: 32, boxShadow: "var(--shadow-sm)",
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
          {onCritique && (
            <button onClick={() => onCritique(job.id)} style={{
              padding: "9px 20px", background: "rgba(129, 140, 248, 0.06)", color: "#818cf8",
              borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
              border: "1px solid rgba(129, 140, 248, 0.12)", cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
            }}>Critique Resume</button>
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
              {earnings.length >= 2 && (
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

      {/* Keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
