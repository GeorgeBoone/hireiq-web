// src/KanbanBoard.tsx
// Kanban board view for job tracker with drag-and-drop status management

import { useState, useRef, useCallback } from "react";
//import { Job, updateJobStatus } from "./api";
import type { Job } from "./api";
import { updateJobStatus } from "./api";

interface KanbanBoardProps {
  jobs: Job[];
  token: string;
  onJobClick: (job: Job) => void;
  onStatusChange: (jobId: string, newStatus: string) => void;
}

const COLUMNS = [
  { id: "saved", label: "Saved", emoji: "📋", color: "#6366f1" },
  { id: "applied", label: "Applied", emoji: "📨", color: "#8b5cf6" },
  { id: "screening", label: "Screening", emoji: "📞", color: "#d97706" },
  { id: "interview", label: "Interview", emoji: "🎯", color: "#2563eb" },
  { id: "offer", label: "Offer", emoji: "🎉", color: "#16a34a" },
  { id: "rejected", label: "Rejected", emoji: "✗", color: "#94a3b8" },
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
                background: isOver ? `${col.color}08` : "var(--bg-inset)",
                borderRadius: "var(--radius-md)",
                border: isOver ? `2px dashed ${col.color}` : "2px solid transparent",
                padding: 10,
                minWidth: 170,
                transition: "all 0.2s ease",
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
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 14px",
                      cursor: updatingId === job.id ? "wait" : "grab",
                      transition: "all 0.15s ease",
                      opacity: updatingId === job.id ? 0.5 : draggedJob?.id === job.id ? 0.4 : 1,
                      borderLeft: `3px solid ${col.color}`,
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                      (e.currentTarget as HTMLElement).style.borderColor = col.color;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
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
                          background: job.companyColor || "#e0e7ff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#4f46e5",
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
                          background: job.matchScore >= 80 ? "#dcfce7"
                            : job.matchScore >= 60 ? "#dbeafe"
                            : job.matchScore >= 40 ? "#fef3c7" : "#f1f5f9",
                          color: job.matchScore >= 80 ? "#16a34a"
                            : job.matchScore >= 60 ? "#2563eb"
                            : job.matchScore >= 40 ? "#d97706" : "#94a3b8",
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
