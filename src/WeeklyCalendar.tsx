// src/WeeklyCalendar.tsx
import { useState } from "react";
import type { Application, Job } from "./api";

interface WeeklyCalendarProps {
  applications: Application[];
  onSelectJob: (job: Job) => void;
}

const STATUS_ACCENT: Record<string, string> = {
  saved: "#818cf8",
  applied: "#c084fc",
  screening: "#fbbf58",
  interview: "#60a5fa",
  offer: "#6ee7a8",
  rejected: "#6e6a80",
};

const FOLLOW_UP_ICONS: Record<string, string> = {
  email: "\u{1F4E7}",
  call: "\u{1F4DE}",
  linkedin: "\u{1F4BC}",
  other: "\u{1F4CB}",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(offset: number): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function WeeklyCalendar({ applications, onSelectJob }: WeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const days = getWeekDays(weekOffset);
  const today = new Date();

  const appsByDay = days.map((day) => ({
    date: day,
    isToday: isSameDay(day, today),
    items: applications.filter((app) => {
      if (!app.followUpDate) return false;
      return isSameDay(new Date(app.followUpDate), day);
    }),
  }));

  const totalItems = appsByDay.reduce((sum, d) => sum + d.items.length, 0);

  const weekLabel = `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2013 ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      {/* Navigation bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "10px 16px",
        background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
      }}>
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          style={{
            padding: "6px 14px", border: "1px solid var(--border-light)",
            background: "var(--bg-surface)", color: "var(--text-muted)",
            borderRadius: "var(--radius-sm)", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          \u2190 Prev
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{
                padding: "5px 12px", border: "none",
                background: "var(--accent)", color: "white",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              }}
            >
              Today
            </button>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            {weekLabel}
          </span>
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          style={{
            padding: "6px 14px", border: "1px solid var(--border-light)",
            background: "var(--bg-surface)", color: "var(--text-muted)",
            borderRadius: "var(--radius-sm)", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          Next \u2192
        </button>
      </div>

      {/* Global empty state */}
      {totalItems === 0 && (
        <div style={{
          textAlign: "center", padding: "32px 20px", marginBottom: 16,
          background: "var(--glass-bg)", backdropFilter: "blur(var(--glass-blur))",
          border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)",
          color: "var(--text-muted)", fontSize: 13,
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"\u{1F4C5}"}</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No follow-ups this week</div>
          <div style={{ fontSize: 12, color: "#6e6a80" }}>
            Set follow-up dates on your tracked jobs to see them here
          </div>
        </div>
      )}

      {/* 7-column grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10,
      }}>
        {appsByDay.map(({ date, isToday, items }, colIdx) => (
          <div
            key={date.toISOString()}
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(var(--glass-blur))",
              border: isToday
                ? "1px solid rgba(129, 140, 248, 0.35)"
                : "1px solid var(--glass-border)",
              borderRadius: "var(--radius-lg)",
              padding: 10,
              minHeight: 180,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Day header */}
            <div style={{
              textAlign: "center", marginBottom: 10, paddingBottom: 8,
              borderBottom: "1px solid rgba(150, 170, 220, 0.08)",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.8,
                color: isToday ? "#a5b4fc" : "#6e6a80",
              }}>
                {DAY_NAMES[colIdx]}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 700, marginTop: 2,
                color: isToday ? "#818cf8" : "var(--text-primary)",
                ...(isToday ? {
                  background: "rgba(129, 140, 248, 0.12)",
                  borderRadius: "50%",
                  width: 34, height: 34,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                } : {}),
              }}>
                {date.getDate()}
              </div>
            </div>

            {/* Follow-up cards */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {items.length === 0 ? (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#4a4660", fontSize: 11, fontStyle: "italic",
                }}>
                  No follow-ups
                </div>
              ) : (
                items.map((app) => {
                  const accent = STATUS_ACCENT[app.status] || "#818cf8";
                  const isHovered = hoveredCard === app.id;
                  return (
                    <div
                      key={app.id}
                      onClick={() => app.job && onSelectJob(app.job)}
                      onMouseEnter={() => setHoveredCard(app.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        padding: "8px 10px",
                        background: isHovered
                          ? "rgba(200, 210, 240, 0.08)"
                          : "rgba(200, 210, 240, 0.03)",
                        borderRadius: "var(--radius-sm)",
                        borderLeft: `3px solid ${accent}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        transform: isHovered ? "translateY(-1px)" : "none",
                        boxShadow: isHovered
                          ? `0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px ${accent}33`
                          : "none",
                      }}
                    >
                      {/* Urgent badge */}
                      {app.followUpUrgent && (
                        <div style={{
                          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: 0.8, color: "#ef4444",
                          background: "rgba(239, 68, 68, 0.1)",
                          padding: "1px 6px", borderRadius: 8,
                          display: "inline-block", marginBottom: 4,
                        }}>
                          Urgent
                        </div>
                      )}

                      {/* Type icon + company */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 11, color: "var(--text-muted)", fontWeight: 600,
                        marginBottom: 2,
                      }}>
                        <span>{FOLLOW_UP_ICONS[app.followUpType] || "\u{1F4CB}"}</span>
                        <span style={{
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {app.job?.company || "Unknown"}
                        </span>
                      </div>

                      {/* Job title */}
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {app.job?.title || "Untitled"}
                      </div>

                      {/* Next step */}
                      {app.nextStep && (
                        <div style={{
                          fontSize: 10, color: "#6e6a80", marginTop: 3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {app.nextStep}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
