// src/JobList.tsx
import { useState, useEffect } from "react";
import type { Job, JobFilter } from "./api";
import * as api from "./api";

interface JobListProps {
  token: string;
  onSelectJob: (job: Job) => void;
  onAddJob: () => void;
}

export default function JobList({ token, onSelectJob, onAddJob }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Fetch jobs whenever filters change
  useEffect(() => {
    loadJobs();
  }, [search, locationFilter, bookmarkedOnly]);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const filter: JobFilter = {};
      if (search.trim()) filter.search = search.trim().toLowerCase();
      if (locationFilter) filter.location = locationFilter;
      if (bookmarkedOnly) filter.bookmarked = true;

      const data = await api.listJobs(token, filter);
      setJobs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookmark(e: React.MouseEvent, job: Job) {
    e.stopPropagation(); // Don't trigger row click
    try {
      const result = await api.toggleBookmark(token, job.id);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, bookmarked: result.bookmarked } : j
        )
      );
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(e: React.MouseEvent, job: Job) {
    e.stopPropagation();
    if (!confirm(`Delete "${job.title}" at ${job.company}?`)) return;
    try {
      await api.deleteJob(token, job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Jobs</h2>
        <button
          onClick={onAddJob}
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          + Add Job
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", flex: 1, minWidth: 150 }}
        />
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db" }}
        >
          <option value="">All Locations</option>
          <option value="remote">Remote</option>
          <option value="onsite">On-site</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={bookmarkedOnly}
            onChange={(e) => setBookmarkedOnly(e.target.checked)}
          />
          Bookmarked
        </label>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <p>No jobs yet. Click "+ Add Job" to save your first one.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectJob(job)}
              style={{
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 16 }}>{job.title}</strong>
                  {job.match_score > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: job.match_score >= 80 ? "#dcfce7" : job.match_score >= 60 ? "#fef9c3" : "#fef2f2",
                        color: job.match_score >= 80 ? "#166534" : job.match_score >= 60 ? "#854d0e" : "#991b1b",
                      }}
                    >
                      {job.match_score}% match
                    </span>
                  )}
                </div>
                <div style={{ color: "#6b7280", marginTop: 4 }}>
                  {job.company}
                  {job.location && ` · ${job.location}`}
                  {job.salary_range && ` · ${job.salary_range}`}
                </div>
                {job.tags && job.tags.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          padding: "1px 6px",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          borderRadius: 4,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 12 }}>
                <button
                  onClick={(e) => handleBookmark(e, job)}
                  title={job.bookmarked ? "Remove bookmark" : "Bookmark"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    padding: 4,
                  }}
                >
                  {job.bookmarked ? "★" : "☆"}
                </button>
                <button
                  onClick={(e) => handleDelete(e, job)}
                  title="Delete job"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "#9ca3af",
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
