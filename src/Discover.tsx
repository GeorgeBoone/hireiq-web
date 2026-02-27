// src/Discover.tsx
import { useState, useEffect, useCallback } from "react";
import type { FeedJob, Job } from "./api";
import { getFeed, refreshFeed, dismissFeedJob, saveFeedJob } from "./api";

interface DiscoverProps {
  token: string;
  onSelectJob: (job: Job) => void;
}

export default function Discover({ token, onSelectJob }: DiscoverProps) {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getFeed(token);
      setJobs(data.jobs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      const result = await refreshFeed(token);
      await loadFeed();
      if (result.fetched === 0 && result.new === 0) {
        setError("Feed was recently refreshed. Try again later.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissFeedJob(token, id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (id: string) => {
    try {
      setSavingId(id);
      const savedJob = await saveFeedJob(token, id);
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, saved: true, savedJobId: savedJob?.id } : j)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

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
          return (
            <div
              key={job.id}
              style={{
                background: job.saved
                  ? "rgba(110, 231, 168, 0.07)"
                  : "rgba(200, 210, 240, 0.09)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: job.saved
                  ? "1px solid rgba(110, 231, 168, 0.15)"
                  : "1px solid rgba(150, 170, 220, 0.13)",
                borderRadius: "var(--radius-md)",
                padding: "20px 24px",
                transition: "all 0.4s ease",
                boxShadow: job.saved
                  ? "0 0 24px rgba(110, 231, 168, 0.06), 0 4px 16px rgba(0,0,0,0.15)"
                  : expandedId === job.id ? "var(--shadow-md)" : "none",
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
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
                    onClick={() => {
                      if (job.saved && job.savedJobId) {
                        // Navigate to the saved job detail
                        onSelectJob({
                          id: job.savedJobId,
                          title: job.title,
                          company: job.company,
                          location: job.location,
                          salaryRange: job.salaryText,
                          jobType: job.jobType,
                          description: job.description,
                          applyUrl: job.applyUrl,
                          requiredSkills: job.requiredSkills,
                          matchScore: job.matchScore,
                          source: job.source,
                          companyLogo: job.companyLogo,
                          bookmarked: false,
                          status: "saved",
                          tags: [],
                          hiringEmail: "",
                          createdAt: job.fetchedAt,
                        } as any);
                      }
                    }}
                    style={{
                      fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, lineHeight: 1.3,
                      cursor: job.saved ? "pointer" : "default",
                      transition: "color 0.2s",
                      ...(job.saved ? { textDecoration: "none" } : {}),
                    }}
                    onMouseEnter={(e) => { if (job.saved) (e.currentTarget as HTMLElement).style.color = "#a5b4fc"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                  >
                    {job.title}
                    {job.saved && <span style={{ fontSize: 11, color: "#6e6a80", marginLeft: 8, fontWeight: 400 }}>View →</span>}
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
                <div style={{
                  marginTop: 14, padding: 16, background: "var(--bg-inset)",
                  borderRadius: "var(--radius-sm)", fontSize: 13,
                  color: "var(--text-secondary)", lineHeight: 1.7,
                  maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap",
                }}>
                  {job.description}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
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
          Showing {jobs.length} jobs matched to your profile · Feed refreshes daily
        </div>
      )}
    </div>
  );
}
