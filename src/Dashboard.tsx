// src/Dashboard.tsx
import { useState, useEffect } from "react";
import type { Job, Application, FeedJob, Profile } from "./api";
import * as api from "./api";
import { feedJobToJob } from "./Discover";

interface DashboardProps {
  token: string;
  profile: Profile | null;
  onSelectJob: (job: Job) => void;
  onNavigate: (page: "jobs" | "discover") => void;
}

const PIPELINE_CARDS = [
  { id: "applied", label: "Applied", emoji: "\u{1F4E8}", color: "#c084fc" },
  { id: "screening", label: "Screening", emoji: "\u{1F4DE}", color: "#fbbf58" },
  { id: "interview", label: "Interview", emoji: "\u{1F3AF}", color: "#60a5fa" },
  { id: "offer", label: "Offer", emoji: "\u{1F389}", color: "#6ee7a8" },
  { id: "rejected", label: "Rejected", emoji: "\u2717", color: "#6e6a80" },
];

const STATUS_ACCENT: Record<string, string> = {
  saved: "#818cf8",
  applied: "#c084fc",
  screening: "#fbbf58",
  interview: "#60a5fa",
  offer: "#6ee7a8",
  rejected: "#6e6a80",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(): Date[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDueDate(dateStr: string): string {
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 7) return `In ${diff} days`;
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 80) return "#6ee7a8";
  if (score >= 60) return "#818cf8";
  if (score >= 40) return "#fbbf58";
  return "#6e6a80";
}

const sectionStyle: React.CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(var(--glass-blur))",
  WebkitBackdropFilter: "blur(var(--glass-blur))",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  padding: "20px 24px",
};

export default function Dashboard({ token, profile, onSelectJob, onNavigate }: DashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [feedJobs, setFeedJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [jobData, appData, feedData] = await Promise.all([
          api.getJobs(token),
          api.listApplications(token),
          api.getFeed(token),
        ]);
        setJobs(jobData);
        setApplications(appData);
        setFeedJobs(feedData.jobs || []);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const firstName = profile?.name?.split(" ")[0] || "there";

  // Pipeline counts
  const statusCounts = PIPELINE_CARDS.map((card) => ({
    ...card,
    count: jobs.filter((j) => (j.status || "saved") === card.id).length,
  }));

  // Compact calendar
  const weekDays = getWeekDays();
  const today = new Date();
  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2014 ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const dayData = weekDays.map((day, i) => ({
    date: day,
    dayName: DAY_NAMES[i],
    isToday: isSameDay(day, today),
    hasFollowUp: applications.some(
      (app) => app.followUpDate && isSameDay(new Date(app.followUpDate), day)
    ),
  }));

  // Needs attention
  const attentionItems = applications
    .filter((app) => app.followUpDate)
    .sort((a, b) => {
      if (a.followUpUrgent && !b.followUpUrgent) return -1;
      if (!a.followUpUrgent && b.followUpUrgent) return 1;
      return new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime();
    })
    .slice(0, 5);

  // Top matches
  const topMatches = [...feedJobs]
    .filter((fj) => !fj.dismissed && fj.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "var(--text-muted)" }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Welcome Header ──────────────────────── */}
      <div style={{ ...sectionStyle, padding: "28px 32px" }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: "var(--text-primary)",
          margin: 0, marginBottom: 4,
        }}>
          Welcome back, {firstName}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          Here's your job search at a glance &mdash; {dayName}, {dateStr}
        </p>
      </div>

      {/* ── Pipeline Status Cards ───────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {statusCounts.map((card) => (
          <div
            key={card.id}
            onClick={() => onNavigate("jobs")}
            style={{
              ...sectionStyle,
              textAlign: "center",
              cursor: "pointer",
              padding: "20px 12px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${card.color}44`;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{card.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {card.count}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
              marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── This Week (compact calendar) ────────── */}
      <div style={sectionStyle}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{"\u{1F4C5}"}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              This Week
            </span>
          </div>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{weekLabel}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {dayData.map(({ date, dayName: dn, isToday: td, hasFollowUp }) => (
            <div
              key={date.toISOString()}
              style={{
                textAlign: "center", padding: "12px 8px",
                background: td ? "rgba(129, 140, 248, 0.06)" : "rgba(200, 210, 240, 0.02)",
                borderRadius: "var(--radius-md)",
                border: td ? "1px solid rgba(129, 140, 248, 0.25)" : "1px solid rgba(150, 170, 220, 0.06)",
              }}
            >
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 0.8,
                color: td ? "#a5b4fc" : "#6e6a80",
                marginBottom: 6,
              }}>
                {dn}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: td ? "#818cf8" : "var(--text-primary)",
                ...(td ? {
                  background: "rgba(129, 140, 248, 0.15)",
                  borderRadius: "50%",
                  width: 36, height: 36,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                } : {}),
              }}>
                {date.getDate()}
              </div>
              {hasFollowUp && (
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#818cf8", margin: "6px auto 0",
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row: Needs Attention + Top Matches ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Needs Attention */}
        <div style={sectionStyle}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
          }}>
            <span style={{ fontSize: 18 }}>{"\u{1F525}"}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Needs Attention
            </span>
          </div>
          {attentionItems.length === 0 ? (
            <div style={{
              padding: "24px 0", textAlign: "center",
              color: "#6e6a80", fontSize: 13,
            }}>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>No follow-ups scheduled</div>
              <div style={{ fontSize: 12 }}>
                Set follow-up dates on your tracked applications
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {attentionItems.map((app) => {
                const accent = STATUS_ACCENT[app.status] || "#818cf8";
                const dueDateStr = app.followUpDate ? formatDueDate(app.followUpDate) : "";
                const isOverdue = app.followUpDate && new Date(app.followUpDate) < new Date();
                return (
                  <div
                    key={app.id}
                    onClick={() => app.job && onSelectJob(app.job)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      background: "rgba(200, 210, 240, 0.03)",
                      borderRadius: "var(--radius-md)",
                      cursor: app.job ? "pointer" : "default",
                      transition: "background 0.15s",
                      border: "1px solid rgba(150, 170, 220, 0.06)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200, 210, 240, 0.07)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(200, 210, 240, 0.03)"; }}
                  >
                    {/* Status dot */}
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: accent, flexShrink: 0,
                    }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {app.job?.company || "Unknown"} &mdash; {app.job?.title || "Untitled"}
                      </div>
                      {app.nextStep && (
                        <div style={{
                          fontSize: 11, color: "#6e6a80", marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {app.nextStep}
                        </div>
                      )}
                    </div>

                    {/* Due date + status */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: isOverdue ? "#ef4444" : app.followUpUrgent ? "#ef4444" : "#a5b4fc",
                      }}>
                        {dueDateStr}
                      </div>
                      <div style={{
                        fontSize: 10, color: accent, fontWeight: 500,
                        textTransform: "capitalize", marginTop: 2,
                      }}>
                        {app.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Matches */}
        <div style={sectionStyle}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{"\u2728"}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                Top Matches
              </span>
            </div>
            <button
              onClick={() => onNavigate("discover")}
              style={{
                background: "rgba(129, 140, 248, 0.08)", border: "1px solid rgba(129, 140, 248, 0.15)",
                color: "#a5b4fc", fontSize: 12, fontWeight: 600,
                padding: "4px 12px", borderRadius: 12,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              View All &rarr;
            </button>
          </div>
          {topMatches.length === 0 ? (
            <div style={{
              padding: "24px 0", textAlign: "center",
              color: "#6e6a80", fontSize: 13,
            }}>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>No matches yet</div>
              <div style={{ fontSize: 12 }}>
                Complete your profile to get AI-matched job recommendations
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topMatches.map((fj) => {
                const sc = scoreColor(fj.matchScore);
                const initial = (fj.company || "?")[0].toUpperCase();
                return (
                  <div
                    key={fj.id}
                    onClick={() => onSelectJob(feedJobToJob(fj))}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      background: "rgba(200, 210, 240, 0.03)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      border: "1px solid rgba(150, 170, 220, 0.06)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200, 210, 240, 0.07)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(200, 210, 240, 0.03)"; }}
                  >
                    {/* Company initial avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${sc}18`, color: sc,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800, flexShrink: 0,
                    }}>
                      {initial}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {fj.title}
                      </div>
                      <div style={{
                        fontSize: 11, color: "#6e6a80", marginTop: 2,
                      }}>
                        {fj.company} {fj.salaryText ? `\u00B7 ${fj.salaryText}` : ""}
                      </div>
                    </div>

                    {/* Match score */}
                    <div style={{
                      fontSize: 15, fontWeight: 800, color: sc, flexShrink: 0,
                    }}>
                      {fj.matchScore}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
