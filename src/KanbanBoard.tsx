// src/KanbanBoard.tsx
// Kanban board view for job tracker with drag-and-drop status management

import { useState, useRef, useCallback } from "react";
import type { Job } from "./api";
import { updateJobStatus } from "./api";

interface KanbanBoardProps {
  jobs: Job[];
  token: string;
  onJobClick: (job: Job) => void;
  onStatusChange: (jobId: string, newStatus: string) => void;
}

const COLUMNS = [
  { id: "saved", label: "Saved", emoji: "📋", color: "#818cf8" },
  { id: "applied", label: "Applied", emoji: "📨", color: "#c084fc" },
  { id: "screening", label: "Screening", emoji: "📞", color: "#fbbf58" },
  { id: "interview", label: "Interview", emoji: "🎯", color: "#60a5fa" },
  { id: "offer", label: "Offer", emoji: "🎉", color: "#6ee7a8" },
  { id: "rejected", label: "Rejected", emoji: "✗", color: "#6e6a80" },
];

export default function KanbanBoard({ jobs, token, onJobClick, onStatusChange }: KanbanBoardProps) {
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  const jobsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = jobs.filter((j) => (j.status || "saved") === col.id);
    return acc;
  }, {} as Record<string, Job[]>);

  const handleDragStart = useCallback((e: React.DragEvent, job: Job) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
    // Make the drag image slightly transparent
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => { el.style.opacity = "0.4"; }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDraggedJob(null);
    setDragOverColumn(null);
    dragCounter.current = {};
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) + 1;
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) - 1;
    if (dragCounter.current[columnId] <= 0) {
      dragCounter.current[columnId] = 0;
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  }, [dragOverColumn]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    dragCounter.current = {};

    if (!draggedJob || (draggedJob.status || "saved") === columnId) {
      setDraggedJob(null);
      return;
    }

    const jobId = draggedJob.id;
    setDraggedJob(null);

    try {
      setUpdatingId(jobId);
      await updateJobStatus(token, jobId, columnId);
      onStatusChange(jobId, columnId);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  }, [draggedJob, token, onStatusChange]);

  // Column stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => !["rejected"].includes(j.status || "saved")).length;

  return (
    <div>
      {/* Board header stats */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap",
      }}>
        {COLUMNS.filter(c => jobsByStatus[c.id].length > 0 || ["saved", "applied", "interview", "offer"].includes(c.id)).map(col => (
          <div key={col.id} style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: col.color,
              opacity: jobsByStatus[col.id].length > 0 ? 1 : 0.3,
            }} />
            <span>{col.label}</span>
            <span style={{
              fontWeight: 600,
              color: jobsByStatus[col.id].length > 0 ? "var(--text-primary)" : "var(--text-faint)",
            }}>
              {jobsByStatus[col.id].length}
            </span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {activeJobs} active of {totalJobs} total
        </span>
      </div>

      {/* Kanban columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`,
        gap: 12,
        minHeight: 400,
        overflowX: "auto",
      }}>
        {COLUMNS.map((col) => {
          const colJobs = jobsByStatus[col.id];
          const isOver = dragOverColumn === col.id && draggedJob && (draggedJob.status || "saved") !== col.id;

          return (
            <div
              key={col.id}
              onDragEnter={(e) => handleDragEnter(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              style={{
                background: isOver ? "var(--glass-bg-hover)" : "var(--glass-bg)",
                backdropFilter: "blur(var(--glass-blur))",
                WebkitBackdropFilter: "blur(var(--glass-blur))",
                borderRadius: "var(--radius-lg)",
                border: isOver ? `2px dashed ${col.color}` : "1px solid var(--glass-border)",
                padding: 12,
                minWidth: 170,
                transition: "all 0.25s ease",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Column header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "6px 8px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{col.emoji}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
                    textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>
                    {col.label}
                  </span>
                </div>
                <span style={{
                  background: colJobs.length > 0 ? `${col.color}18` : "var(--bg-body)",
                  color: colJobs.length > 0 ? col.color : "var(--text-faint)",
                  fontSize: 11, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 10,
                  minWidth: 22, textAlign: "center",
                }}>
                  {colJobs.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {colJobs.map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, job)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onJobClick(job)}
                    style={{
                      background: "var(--glass-bg)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      cursor: updatingId === job.id ? "wait" : "grab",
                      transition: "all 0.25s ease",
                      opacity: updatingId === job.id ? 0.5 : draggedJob?.id === job.id ? 0.4 : 1,
                      borderLeft: `3px solid ${col.color}`,
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)";
                      (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border-hover)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLElement).style.background = "var(--glass-bg)";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)";
                      (e.currentTarget as HTMLElement).style.transform = "none";
                    }}
                  >
                    {/* Company + logo */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt=""
                          style={{
                            width: 20, height: 20, borderRadius: 4,
                            objectFit: "contain", background: "var(--bg-inset)",
                          }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div style={{
                          width: 20, height: 20, borderRadius: 4,
                          background: job.companyColor || "rgba(129, 140, 248, 0.12)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#818cf8",
                        }}>
                          {job.company?.[0] || "?"}
                        </div>
                      )}
                      <span style={{
                        fontSize: 11, color: "var(--text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {job.company}
                      </span>
                    </div>

                    {/* Job title */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                      lineHeight: 1.3, marginBottom: 8,
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                    }}>
                      {job.title}
                    </div>

                    {/* Meta row */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      flexWrap: "wrap",
                    }}>
                      {/* Match score */}
                      {job.matchScore > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px",
                          borderRadius: 4,
                          background: job.matchScore >= 80 ? "rgba(110, 231, 168, 0.08)"
                            : job.matchScore >= 60 ? "rgba(129, 140, 248, 0.08)"
                            : job.matchScore >= 40 ? "rgba(251, 191, 88, 0.08)" : "rgba(110, 106, 128, 0.08)",
                          color: job.matchScore >= 80 ? "#6ee7a8"
                            : job.matchScore >= 60 ? "#818cf8"
                            : job.matchScore >= 40 ? "#fbbf58" : "#6e6a80",
                        }}>
                          {job.matchScore}%
                        </span>
                      )}
                      {/* Location snippet */}
                      {job.location && (
                        <span style={{
                          fontSize: 10, color: "var(--text-faint)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: 80,
                        }}>
                          {job.location.split(",")[0]}
                        </span>
                      )}
                      {/* Bookmarked indicator */}
                      {job.bookmarked && (
                        <span style={{ fontSize: 11 }}>⭐</span>
                      )}
                    </div>

                    {/* Salary if available */}
                    {job.salaryRange && (
                      <div style={{
                        fontSize: 11, color: "var(--text-muted)",
                        marginTop: 6,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        💰 {job.salaryRange}
                      </div>
                    )}
                  </div>
                ))}

                {/* Drop zone hint when empty and dragging */}
                {colJobs.length === 0 && (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    color: isOver ? col.color : "var(--text-faint)",
                    fontSize: 12,
                    border: isOver ? `1px dashed ${col.color}40` : "1px dashed var(--border)",
                    borderRadius: "var(--radius-sm)",
                    minHeight: 80,
                    transition: "all 0.2s ease",
                  }}>
                    {draggedJob ? "Drop here" : "No jobs"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
