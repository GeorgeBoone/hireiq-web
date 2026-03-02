// src/JobList.tsx
import { useState, useEffect } from "react";
import type { Job } from "./api";
import { getJobs, toggleBookmark, deleteJob } from "./api";
import { STATUS_COLORS } from "./utils/skillMatching";
import KanbanBoard from "./KanbanBoard";

interface JobListProps {
  token: string;
  onSelectJob: (job: Job) => void;
  onAddJob: () => void;
  onCompare?: (jobs: Job[]) => void;
}

type ViewMode = "list" | "kanban";

export default function JobList({ token, onSelectJob, onAddJob, onCompare }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  function toggleSelection(jobId: string) {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else if (next.size < 4) {
        next.add(jobId);
      }
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
      if (!compareMode) setViewMode("list");
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (locationFilter) params.location = locationFilter;
      if (bookmarkedOnly) params.bookmarked = "true";
      const data = await getJobs(token, Object.keys(params).length > 0 ? params : undefined);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch when filters change (debounced by user action)
  useEffect(() => {
    const timeout = setTimeout(loadJobs, 300);
    return () => clearTimeout(timeout);
  }, [search, locationFilter, bookmarkedOnly]);

  async function handleBookmark(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    try {
      const result = await toggleBookmark(token, job.id);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, bookmarked: result.bookmarked } : j))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    if (!confirm(`Delete "${job.title}" at ${job.company}?`)) return;
    try {
      await deleteJob(token, job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleStatusChange(jobId: string, newStatus: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
    );
  }

  // Filter jobs for list view
  const filteredJobs = jobs.filter((j) => {
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!j.title.toLowerCase().includes(s) && !j.company.toLowerCase().includes(s)) return false;
    }
    if (bookmarkedOnly && !j.bookmarked) return false;
    return true;
  });

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Job Tracker
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{
            display: "flex", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-light)", overflow: "hidden",
          }}>
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                padding: "7px 14px", border: "none", fontSize: 13, fontWeight: 600,
                background: viewMode === "kanban" ? "var(--accent)" : "var(--bg-surface)",
                color: viewMode === "kanban" ? "white" : "var(--text-muted)",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>▦</span> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "7px 14px", border: "none", fontSize: 13, fontWeight: 600,
                background: viewMode === "list" ? "var(--accent)" : "var(--bg-surface)",
                color: viewMode === "list" ? "white" : "var(--text-muted)",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>☰</span> List
            </button>
          </div>
          <button
            onClick={onAddJob}
            style={{
              padding: "9px 20px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Add Job
          </button>
          {onCompare && jobs.length >= 2 && (
            <>
              <button
                onClick={handleCompareClick}
                style={{
                  padding: "9px 20px",
                  background: compareMode && selectedJobIds.size >= 2
                    ? "linear-gradient(135deg, #818cf8, #6366f1)"
                    : "rgba(200, 210, 240, 0.06)",
                  color: compareMode && selectedJobIds.size >= 2 ? "white" : "var(--text-secondary)",
                  border: compareMode ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: compareMode && selectedJobIds.size >= 2
                    ? "0 2px 16px rgba(129, 140, 248, 0.2)" : "none",
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
                  onClick={() => { setCompareMode(false); setSelectedJobIds(new Set()); }}
                  style={{
                    padding: "9px 14px", background: "transparent",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "var(--radius-sm)", fontSize: 13,
                    color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compare mode hint */}
      {compareMode && (
        <div style={{
          padding: "10px 16px", marginBottom: 16,
          background: "rgba(129, 140, 248, 0.06)",
          border: "1px solid rgba(129, 140, 248, 0.12)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)", fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ color: "#818cf8", fontWeight: 700 }}>⬡</span>
          Click on jobs to select them for comparison (2-4 jobs). {selectedJobIds.size > 0 && `${selectedJobIds.size} selected.`}
        </div>
      )}

      {/* Filters bar — show for list view, minimal for kanban */}
      {viewMode === "list" && (
        <div style={{
          display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap",
          padding: "14px 18px",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-light)",
        }}>
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="">All Locations</option>
            <option value="remote">Remote</option>
            <option value="onsite">On-site</option>
          </select>
          <label style={{
            display: "flex", alignItems: "center", gap: 6,
            cursor: "pointer", fontSize: 14, color: "var(--text-secondary)",
            padding: "0 8px",
          }}>
            <input
              type="checkbox"
              checked={bookmarkedOnly}
              onChange={(e) => setBookmarkedOnly(e.target.checked)}
            />
            Bookmarked
          </label>
        </div>
      )}

      {error && (
        <div style={{
          padding: "12px 16px", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: "var(--radius-sm)",
          color: "#dc2626", fontSize: 14, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60,
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h2 style={{ color: "var(--text-primary)", fontSize: 18, marginBottom: 8 }}>
            No jobs saved yet
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 20, fontSize: 14 }}>
            Add jobs manually or save them from the Discover feed
          </p>
          <button
            onClick={onAddJob}
            style={{
              padding: "10px 24px", background: "var(--accent)", color: "white",
              border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Add Your First Job
          </button>
        </div>
      ) : viewMode === "kanban" && !compareMode ? (
        <KanbanBoard
          jobs={jobs}
          token={token}
          onJobClick={onSelectJob}
          onStatusChange={handleStatusChange}
        />
      ) : (
        /* List view */
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredJobs.map((job) => {
            const st = STATUS_COLORS[job.status || "saved"] || STATUS_COLORS.saved;

            const isSelected = selectedJobIds.has(job.id);

            return (
              <div
                key={job.id}
                onClick={() => compareMode ? toggleSelection(job.id) : onSelectJob(job)}
                style={{
                  padding: "16px 20px",
                  background: isSelected ? "rgba(129, 140, 248, 0.06)" : "var(--glass-bg)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: isSelected
                    ? "1px solid rgba(129, 140, 248, 0.25)"
                    : "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--glass-border-hover)";
                    e.currentTarget.style.background = "var(--glass-bg-hover)";
                  }
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                    e.currentTarget.style.background = "var(--glass-bg)";
                  }
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Compare checkbox */}
                {compareMode && (
                  <div
                    onClick={(e) => { e.stopPropagation(); toggleSelection(job.id); }}
                    style={{
                      width: 22, height: 22, borderRadius: 6, marginRight: 14, flexShrink: 0,
                      marginTop: 2,
                      border: isSelected ? "2px solid var(--accent)" : "2px solid var(--glass-border)",
                      background: isSelected ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    {isSelected && (
                      <span style={{ color: "white", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>✓</span>
                    )}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>{job.title}</strong>
                    {/* Status badge */}
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                      background: st.bg, color: st.text,
                      textTransform: "capitalize",
                    }}>
                      {job.status || "saved"}
                    </span>
                    {job.matchScore > 0 && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                        background: job.matchScore >= 80 ? "rgba(110,231,168,0.08)"
                          : job.matchScore >= 60 ? "rgba(129,140,248,0.08)" : "rgba(251,191,88,0.08)",
                        color: job.matchScore >= 80 ? "#6ee7a8"
                          : job.matchScore >= 60 ? "#818cf8" : "#fbbf58",
                      }}>
                        {job.matchScore}% match
                      </span>
                    )}
                  </div>
                  <div style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 14 }}>
                    {job.company}
                    {job.location && ` · ${job.location}`}
                    {job.salaryRange && ` · ${job.salaryRange}`}
                  </div>
                  {job.tags && job.tags.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {job.tags.map((tag) => (
                        <span key={tag} style={{
                          fontSize: 11, padding: "2px 8px",
                          background: "#ede9fe", color: "#6366f1",
                          borderRadius: 4, fontWeight: 500,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 16 }}>
                  <button
                    onClick={(e) => handleBookmark(e, job)}
                    title={job.bookmarked ? "Remove bookmark" : "Bookmark"}
                    style={{
                      background: "none", border: "none", fontSize: 20, padding: 4,
                      color: job.bookmarked ? "#d97706" : "var(--text-faint)",
                      cursor: "pointer",
                    }}
                  >
                    {job.bookmarked ? "★" : "☆"}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, job)}
                    title="Delete job"
                    style={{
                      background: "none", border: "none", fontSize: 16, padding: 4,
                      color: "var(--text-faint)", cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
