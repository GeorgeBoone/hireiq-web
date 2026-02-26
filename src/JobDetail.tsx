// src/JobDetail.tsx
import type { Job } from "./api";

interface JobDetailProps {
  job: Job;
  onEdit: () => void;
  onBack: () => void;
}

export default function JobDetail({ job, onEdit, onBack }: JobDetailProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ← Back to Jobs
        </button>
        <button
          onClick={onEdit}
          style={{
            padding: "6px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Edit
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{job.title}</h2>
          {job.bookmarked && <span style={{ fontSize: 20 }}>★</span>}
        </div>
        <p style={{ color: "#6b7280", margin: "4px 0 0" }}>
          {job.company}
          {job.location && ` · ${job.location}`}
          {job.job_type && ` · ${job.job_type}`}
        </p>
      </div>

      {/* Key Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {job.salary_range && (
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>SALARY</div>
            <div>{job.salary_range}</div>
          </div>
        )}
        {job.source && (
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>SOURCE</div>
            <div>{job.source}</div>
          </div>
        )}
        {job.match_score > 0 && (
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>MATCH SCORE</div>
            <div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: job.match_score >= 80 ? "#dcfce7" : job.match_score >= 60 ? "#fef9c3" : "#fef2f2",
                  color: job.match_score >= 80 ? "#166534" : job.match_score >= 60 ? "#854d0e" : "#991b1b",
                  fontWeight: 600,
                }}
              >
                {job.match_score}%
              </span>
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>SAVED</div>
          <div>{new Date(job.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Skills */}
      {job.required_skills && job.required_skills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>Required Skills</h3>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {job.required_skills.map((skill) => (
              <span
                key={skill}
                style={{
                  padding: "2px 8px",
                  background: "#fef3c7",
                  color: "#92400e",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {job.tags && job.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>Tags</h3>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {job.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "2px 8px",
                  background: "#e0e7ff",
                  color: "#3730a3",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 16px",
              background: "#059669",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Apply →
          </a>
        )}
        {job.hiring_email && (
          <a
            href={`mailto:${job.hiring_email}`}
            style={{
              padding: "8px 16px",
              background: "#f3f4f6",
              color: "#374151",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Email Recruiter
          </a>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div>
          <h3 style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>Description</h3>
          <div
            style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              fontSize: 14,
              color: "#374151",
            }}
          >
            {job.description}
          </div>
        </div>
      )}
    </div>
  );
}
