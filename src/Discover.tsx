// src/Discover.tsx
import { useState, useEffect, useCallback } from "react";
import type { FeedJob, Job } from "./api";
import { getFeed, refreshFeed, dismissFeedJob, saveFeedJob } from "./api";

/** Convert a FeedJob to a Job for the detail/compare view. */
export function feedJobToJob(job: FeedJob): Job {
  return {
    id: job.savedJobId || job.id,
    userId: "",
    externalId: job.externalId,
    title: job.title,
    company: job.company,
    location: job.location,
    salaryRange: job.salaryText,
    jobType: job.jobType,
    description: job.description,
    applyUrl: job.applyUrl,
    requiredSkills: job.requiredSkills,
    preferredSkills: [],
    companyLogo: job.companyLogo,
    matchScore: job.matchScore,
    source: job.source,
    bookmarked: false,
    status: job.saved ? "saved" : "discovered",
    tags: [],
    createdAt: job.fetchedAt,
    updatedAt: job.fetchedAt,
  };
}

interface DiscoverProps {
  token: string;
  onSelectJob: (job: Job) => void;
  onCompare?: (jobs: FeedJob[]) => void;
}

export default function Discover({ token, onSelectJob, onCompare }: DiscoverProps) {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshMsg, setRefreshMsg] = useState("");

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getFeed(token);
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleRefresh = async () => {
    let foundNew = false;
    try {
      setRefreshing(true);
      setError("");
      setRefreshMsg("");

      // Kick off refresh (returns immediately — refresh runs in background)
      await refreshFeed(token, true);
      setRefreshMsg("Refreshing feed — new jobs will appear shortly...");

      // Poll for new results: reload after 5s, 12s, and 25s
      const prevCount = jobs.length;
      const delays = [5000, 7000, 13000];
      for (const delay of delays) {
        await new Promise((r) => setTimeout(r, delay));
        try {
          const data = await getFeed(token);
          setJobs(data.jobs || []);
          if ((data.jobs || []).length > prevCount) {
            foundNew = true;
            const diff = (data.jobs || []).length - prevCount;
            setRefreshMsg(`Found ${diff} new job${diff === 1 ? "" : "s"}`);
            setTimeout(() => setRefreshMsg(""), 5000);
            break;
          }
        } catch {
          // ignore polling errors
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
      // One final reload to catch any stragglers
      try {
        const data = await getFeed(token);
        setJobs(data.jobs || []);
      } catch {
        // ignore
      }
      if (!foundNew) {
        setRefreshMsg("");
      }
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissFeedJob(token, id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (id: string) => {
    try {
      setSavingId(id);
      const savedJob = await saveFeedJob(token, id);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, saved: true, savedJobId: savedJob?.id } : j)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  };

  // ── Compare mode helpers ──────────────────────────
  function toggleSelection(jobId: string) {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else if (next.size < 4) next.add(jobId);
      return next;
    });
  }

  function handleCompareClick() {
    if (compareMode && selectedJobIds.size >= 2 && onCompare) {
      const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id));
      onCompare(selectedJobs);
    } else {
      setCompareMode(!compareMode);
      setSelectedJobIds(new Set());
    }
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedJobIds(new Set());
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return { bg: "var(--success-light)", color: "var(--success)" };
    if (score >= 60) return { bg: "var(--accent-light)", color: "var(--accent)" };
    if (score >= 40) return { bg: "var(--warning-light)", color: "var(--warning)" };
    return { bg: "var(--bg-inset)", color: "var(--text-faint)" };
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Discover Jobs
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            AI-matched jobs based on your profile
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Compare button */}
          {onCompare && jobs.length >= 2 && (
            <>
              <button
                onClick={handleCompareClick}
                style={{
                  padding: "9px 22px",
                  background: compareMode && selectedJobIds.size >= 2
                    ? "linear-gradient(135deg, #818cf8, #6366f1)"
                    : compareMode
                      ? "rgba(129, 140, 248, 0.15)"
                      : "rgba(200, 210, 240, 0.08)",
                  color: compareMode && selectedJobIds.size >= 2
                    ? "#fff"
                    : compareMode
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  border: compareMode
                    ? "1px solid rgba(129, 140, 248, 0.3)"
                    : "1px solid rgba(150, 170, 220, 0.13)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 14, fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                {compareMode
                  ? selectedJobIds.size >= 2
                    ? `Compare ${selectedJobIds.size} Jobs`
                    : `Select jobs (${selectedJobIds.size}/2-4)`
                  : "Compare"}
              </button>
              {compareMode && (
                <button
                  onClick={exitCompareMode}
                  style={{
                    padding: "9px 14px",
                    background: "transparent",
                    border: "1px solid rgba(150, 170, 220, 0.13)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13, color: "var(--text-muted)",
                  }}
                >
                  Cancel
                </button>
              )}
            </>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: "9px 22px",
              background: refreshing ? "var(--border-medium)" : "var(--accent)",
              color: refreshing ? "var(--text-faint)" : "#fff",
              border: "none", borderRadius: "var(--radius-sm)",
              fontSize: 14, fontWeight: 600,
            }}
          >
            {refreshing ? "Refreshing..." : "⟳ Refresh Feed"}
          </button>
        </div>
      </div>

      {/* Compare mode hint */}
      {compareMode && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(129, 140, 248, 0.08)",
          border: "1px solid rgba(129, 140, 248, 0.15)",
          borderRadius: "var(--radius-sm)",
          color: "var(--accent)", fontSize: 13,
          marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚖️</span>
          Select 2-4 jobs to compare side by side with AI analysis
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px", background: "var(--danger-light)",
          border: "1px solid #fecaca", borderRadius: "var(--radius-sm)",
          color: "var(--danger)", fontSize: 14, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Refresh success message */}
      {refreshMsg && (
        <div style={{
          padding: "12px 16px", background: "rgba(110, 231, 168, 0.08)",
          border: "1px solid rgba(110, 231, 168, 0.2)", borderRadius: "var(--radius-sm)",
          color: "#6ee7a8", fontSize: 14, marginBottom: 16,
        }}>
          ✓ {refreshMsg}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          Loading your feed...
        </div>
      )}

      {/* Empty */}
      {!loading && jobs.length === 0 && (
        <div style={{
          textAlign: "center", padding: 60,
          background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ color: "var(--text-primary)", fontSize: 18, marginBottom: 8 }}>No jobs in your feed yet</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: 14 }}>
            Make sure your profile has skills and preferences set, then hit Refresh Feed.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: "10px 24px", background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600,
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>
      )}

      {/* Job cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {jobs.map((job) => {
          const sc = scoreColor(job.matchScore);
          const isSelected = selectedJobIds.has(job.id);
          return (
            <div
              key={job.id}
              onClick={() => compareMode ? toggleSelection(job.id) : onSelectJob(feedJobToJob(job))}
              style={{
                background: isSelected
                  ? "rgba(129, 140, 248, 0.12)"
                  : job.saved
                    ? "rgba(110, 231, 168, 0.07)"
                    : "rgba(200, 210, 240, 0.09)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: isSelected
                  ? "1px solid rgba(129, 140, 248, 0.4)"
                  : job.saved
                    ? "1px solid rgba(110, 231, 168, 0.15)"
                    : "1px solid rgba(150, 170, 220, 0.13)",
                borderRadius: "var(--radius-md)",
                padding: "20px 24px",
                transition: "all 0.4s ease",
                cursor: "pointer",
                boxShadow: isSelected
                  ? "0 0 24px rgba(129, 140, 248, 0.1), 0 4px 16px rgba(0,0,0,0.15)"
                  : job.saved
                    ? "0 0 24px rgba(110, 231, 168, 0.06), 0 4px 16px rgba(0,0,0,0.15)"
                    : expandedId === job.id ? "var(--shadow-md)" : "none",
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                {/* Checkbox in compare mode */}
                {compareMode && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, paddingTop: 2,
                  }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ width: 18, height: 18, accentColor: "#818cf8", cursor: "pointer" }}
                    />
                  </div>
                )}

                {/* Logo */}
                {job.companyLogo ? (
                  <img
                    src={job.companyLogo} alt={job.company}
                    style={{
                      width: 48, height: 48, borderRadius: "var(--radius-sm)",
                      objectFit: "contain", background: "var(--bg-inset)",
                      border: "1px solid var(--border-light)", flexShrink: 0,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: "var(--radius-sm)",
                    background: "var(--accent-light)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontWeight: 700, color: "var(--accent)", fontSize: 18, flexShrink: 0,
                  }}>
                    {job.company?.[0] || "?"}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.3,
                    }}
                  >
                    {job.title}
                    {job.saved && <span style={{ fontSize: 11, color: "#6ee7a8", marginLeft: 8, fontWeight: 500 }}>✓ Saved</span>}
                  </h3>
                  <div style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 2 }}>
                    {job.company}
                  </div>
                  <div style={{
                    display: "flex", gap: 14, flexWrap: "wrap",
                    marginTop: 6, fontSize: 13, color: "#c8c2d4",
                  }}>
                    {job.location && <span>📍 {job.location}</span>}
                    {job.salaryText && <span>💰 {job.salaryText}</span>}
                    {job.jobType && <span>🏢 {job.jobType}</span>}
                    {job.postedAt && <span>🕐 {timeAgo(job.postedAt)}</span>}
                  </div>
                </div>

                {/* Score badge */}
                <div style={{
                  background: sc.bg, color: sc.color,
                  fontWeight: 700, fontSize: 18, padding: "8px 14px",
                  borderRadius: "var(--radius-md)", textAlign: "center",
                  lineHeight: 1, flexShrink: 0,
                }}>
                  {job.matchScore}
                  <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.8 }}>match</div>
                </div>
              </div>

              {/* Skills */}
              {job.requiredSkills && job.requiredSkills.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {job.requiredSkills.slice(0, 8).map((skill) => (
                    <span key={skill} style={{
                      padding: "3px 10px", background: "rgba(200, 210, 240, 0.06)",
                      borderRadius: "var(--radius-sm)", fontSize: 12, color: "#b0aac0",
                    }}>
                      {skill}
                    </span>
                  ))}
                  {job.requiredSkills.length > 8 && (
                    <span style={{ fontSize: 12, color: "var(--text-faint)", alignSelf: "center" }}>
                      +{job.requiredSkills.length - 8} more
                    </span>
                  )}
                </div>
              )}

              {/* Expanded description */}
              {expandedId === job.id && job.description && (
                <div onClick={(e) => e.stopPropagation()} style={{
                  marginTop: 14, padding: 16, background: "var(--bg-inset)",
                  borderRadius: "var(--radius-sm)", fontSize: 13,
                  color: "var(--text-secondary)", lineHeight: 1.7,
                  maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap",
                }}>
                  {job.description}
                </div>
              )}

              {/* Actions */}
              {!compareMode && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
                  <button
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    style={{
                      padding: "6px 14px", background: "rgba(200, 210, 240, 0.06)",
                      border: "1px solid rgba(150, 170, 220, 0.1)", borderRadius: "var(--radius-sm)",
                      fontSize: 13, color: "#b0aac0",
                    }}
                  >
                    {expandedId === job.id ? "Less ▲" : "More ▼"}
                  </button>

                  {job.applyUrl && (
                    <a
                      href={job.applyUrl} target="_blank" rel="noopener noreferrer"
                      style={{
                        padding: "6px 14px", background: "rgba(200, 210, 240, 0.06)",
                        border: "1px solid rgba(150, 170, 220, 0.1)", borderRadius: "var(--radius-sm)",
                        fontSize: 13, color: "var(--accent)", textDecoration: "none",
                      }}
                    >
                      Apply ↗
                    </a>
                  )}

                  <div style={{ flex: 1 }} />

                  <button
                    onClick={() => handleDismiss(job.id)}
                    style={{
                      padding: "6px 14px", background: "transparent",
                      border: "1px solid rgba(150, 170, 220, 0.1)", borderRadius: "var(--radius-sm)",
                      fontSize: 13, color: "#8a8498",
                    }}
                  >
                    ✕ Not for me
                  </button>

                  <button
                    onClick={() => handleSave(job.id)}
                    disabled={job.saved || savingId === job.id}
                    style={{
                      padding: "6px 16px",
                      background: job.saved ? "rgba(110, 231, 168, 0.08)" : "var(--accent)",
                      color: job.saved ? "#6ee7a8" : "#fff",
                      border: job.saved ? "1px solid rgba(110, 231, 168, 0.2)" : "none",
                      borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {job.saved ? "✓ Saved" : savingId === job.id ? "Saving..." : "Save to Tracker"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!loading && jobs.length > 0 && (
        <div style={{
          textAlign: "center", marginTop: 24, padding: 16,
          color: "var(--text-faint)", fontSize: 13,
        }}>
          Showing {jobs.length} jobs matched to your profile · Feed refreshes every 2 hours
        </div>
      )}
    </div>
  );
}
