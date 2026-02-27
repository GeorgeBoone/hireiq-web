// src/JobDetail.tsx
import type { Job } from "./api";

interface JobDetailProps {
  job: Job;
  onEdit: () => void;
  onBack: () => void;
}

export default function JobDetail({ job, onEdit, onBack }: JobDetailProps) {
  return (
    <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(200, 210, 240, 0.06)",
            border: "1px solid rgba(150, 170, 220, 0.1)",
            borderRadius: "var(--radius-sm)", padding: "7px 16px", fontSize: 14,
            color: "#b0aac0", fontWeight: 500, fontFamily: "inherit",
          }}
        >
          ← Back to Tracker
        </button>
        <button
          onClick={onEdit}
          style={{
            padding: "7px 20px",
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            color: "white",
            border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 14,
            boxShadow: "0 2px 16px rgba(129, 140, 248, 0.2)",
            fontFamily: "inherit",
          }}
        >
          Edit
        </button>
      </div>

      {/* Main card */}
      <div style={{
        background: "rgba(200, 210, 240, 0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(150, 170, 220, 0.1)",
        padding: 32,
        boxShadow: "var(--shadow-sm)",
      }}>
        {/* Title section */}
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
            {job.job_type && ` · ${job.job_type}`}
          </p>
        </div>

        {/* Key details grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
          marginBottom: 24, padding: 20,
          background: "rgba(200, 210, 240, 0.04)",
          border: "1px solid rgba(150, 170, 220, 0.06)",
          borderRadius: "var(--radius-md)",
        }}>
          {job.salary_range && (
            <div>
              <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Salary</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>{job.salary_range}</div>
            </div>
          )}
          {job.source && (
            <div>
              <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Source</div>
              <div style={{ fontSize: 15, color: "#c8c2d4", marginTop: 4, textTransform: "capitalize" }}>{job.source}</div>
            </div>
          )}
          {job.match_score > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Match</div>
              <div style={{ marginTop: 4 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 4, fontWeight: 600, fontSize: 14,
                  background: job.match_score >= 80 ? "rgba(110, 231, 168, 0.08)"
                    : job.match_score >= 60 ? "rgba(129, 140, 248, 0.08)"
                    : "rgba(251, 191, 88, 0.08)",
                  color: job.match_score >= 80 ? "#6ee7a8"
                    : job.match_score >= 60 ? "#818cf8"
                    : "#fbbf58",
                }}>
                  {job.match_score}%
                </span>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: "#8a8498", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Saved</div>
            <div style={{ fontSize: 15, color: "#c8c2d4", marginTop: 4 }}>
              {new Date(job.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, color: "#8a8498", fontWeight: 600, marginBottom: 8 }}>Required Skills</h3>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {job.required_skills.map((skill) => (
                <span key={skill} style={{
                  padding: "4px 12px", background: "rgba(251, 191, 88, 0.08)",
                  color: "#fbbf58", borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: "1px solid rgba(251, 191, 88, 0.1)",
                }}>
                  {skill}
                </span>
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
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action links */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 20px",
                background: "linear-gradient(135deg, #6ee7a8, #34d399)",
                color: "#082f20",
                borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
                display: "inline-block", textDecoration: "none",
                boxShadow: "0 2px 12px rgba(110, 231, 168, 0.2)",
              }}
            >
              Apply →
            </a>
          )}
          {job.hiring_email && (
            <a
              href={`mailto:${job.hiring_email}`}
              style={{
                padding: "9px 20px",
                background: "rgba(200, 210, 240, 0.06)",
                color: "#b0aac0",
                borderRadius: "var(--radius-sm)",
                fontSize: 14, display: "inline-block", textDecoration: "none",
                border: "1px solid rgba(150, 170, 220, 0.1)",
              }}
            >
              Email Recruiter
            </a>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <h3 style={{ fontSize: 13, color: "#8a8498", fontWeight: 600, marginBottom: 8 }}>Description</h3>
            <div style={{
              padding: 20,
              background: "rgba(200, 210, 240, 0.04)",
              border: "1px solid rgba(150, 170, 220, 0.06)",
              borderRadius: "var(--radius-md)", whiteSpace: "pre-wrap",
              lineHeight: 1.7, fontSize: 14, color: "#c8c2d4",
            }}>
              {job.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
