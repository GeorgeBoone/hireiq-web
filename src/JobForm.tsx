// src/JobForm.tsx
import { useState } from "react";
import type { Job } from "./api";
import * as api from "./api";

interface JobFormProps {
  token: string;
  existingJob?: Job | null;
  onSaved: (job: Job) => void;
  onCancel: () => void;
}

export default function JobForm({ token, existingJob, onSaved, onCancel }: JobFormProps) {
  const isEdit = !!existingJob;

  const [form, setForm] = useState({
    title: existingJob?.title || "",
    company: existingJob?.company || "",
    location: existingJob?.location || "",
    salaryRange: existingJob?.salaryRange || "",
    jobType: existingJob?.jobType || "full-time",
    description: existingJob?.description || "",
    applyUrl: existingJob?.applyUrl || "",
    hiringEmail: existingJob?.hiringEmail || "",
    source: existingJob?.source || "manual",
  });

  const [tags, setTags] = useState<string[]>(existingJob?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(existingJob?.requiredSkills || []);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paste & Parse state
  const [pasteInput, setPasteInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);

  async function handleParse() {
    const input = pasteInput.trim();
    if (!input) return;
    setParsing(true);
    setParseError(null);
    try {
      const result = await api.parseJobPosting(token, input);
      setForm({
        title: result.title || form.title,
        company: result.company || form.company,
        location: result.location || form.location,
        salaryRange: result.salaryRange || form.salaryRange,
        jobType: result.jobType || form.jobType,
        description: result.description || form.description,
        applyUrl: result.applyUrl || form.applyUrl,
        hiringEmail: result.hiringEmail || form.hiringEmail,
        source: result.source || form.source,
      });
      if (result.requiredSkills?.length > 0) setRequiredSkills(result.requiredSkills);
      if (result.tags?.length > 0) setTags(result.tags);
      setParsed(true);
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !tagInput.trim()) return;
    e.preventDefault();
    if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
    setTagInput("");
  }

  function addSkill(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !skillInput.trim()) return;
    e.preventDefault();
    if (!requiredSkills.includes(skillInput.trim())) setRequiredSkills([...requiredSkills, skillInput.trim()]);
    setSkillInput("");
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.company.trim()) {
      setError("Title and company are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, tags, required_skills: requiredSkills };
      let saved: Job;
      if (isEdit && existingJob) {
        saved = await api.updateJob(token, existingJob.id, payload);
      } else {
        saved = await api.createJob(token, payload);
      }
      onSaved(saved);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block", marginBottom: 4, fontWeight: 600,
    fontSize: 13, color: "#b0aac0",
  };

  const parsedHighlight: React.CSSProperties = {
    borderColor: "rgba(110, 231, 168, 0.3)",
    background: "rgba(110, 231, 168, 0.05)",
    boxShadow: "0 0 12px rgba(110, 231, 168, 0.06)",
  };

  return (
    <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          {isEdit ? "Edit Job" : "Add Job"}
        </h1>
        <button
          onClick={onCancel}
          style={{
            background: "rgba(200, 210, 240, 0.06)",
            border: "1px solid rgba(150, 170, 220, 0.1)",
            borderRadius: "var(--radius-sm)", padding: "7px 16px", fontSize: 14,
            color: "#b0aac0", fontWeight: 500, fontFamily: "inherit",
          }}
        >
          ← Back
        </button>
      </div>

      {/* Quick Add / Parse section */}
      {!isEdit && (
        <div style={{
          padding: 24, marginBottom: 24,
          background: "rgba(129, 140, 248, 0.06)",
          border: "1px solid rgba(129, 140, 248, 0.14)",
          borderRadius: "var(--radius-lg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}>
          <label style={{ ...labelStyle, color: "#a5b4fc", fontSize: 14 }}>
            Quick Add — Paste a job URL or description
          </label>
          <p style={{ fontSize: 13, color: "#8a8498", margin: "0 0 10px" }}>
            Paste a LinkedIn, Greenhouse, or any job posting URL — or copy the full job description text.
          </p>
          <textarea
            style={{ minHeight: 80, resize: "vertical", borderColor: "rgba(129, 140, 248, 0.15)" }}
            value={pasteInput}
            onChange={(e) => { setPasteInput(e.target.value); setParsed(false); setParseError(null); }}
            placeholder={"Paste a URL like https://www.linkedin.com/jobs/view/...\n\nOr paste the full job description text here"}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button
              onClick={handleParse}
              disabled={parsing || !pasteInput.trim()}
              style={{
                padding: "9px 22px",
                background: parsing ? "rgba(129, 140, 248, 0.2)"
                  : !pasteInput.trim() ? "rgba(200, 210, 240, 0.06)"
                  : "linear-gradient(135deg, #818cf8, #6366f1)",
                color: parsing || !pasteInput.trim() ? "#6e6a80" : "white",
                border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 14,
                fontFamily: "inherit",
                boxShadow: !parsing && pasteInput.trim() ? "0 2px 16px rgba(129, 140, 248, 0.2)" : "none",
              }}
            >
              {parsing ? "Parsing..." : "Parse with AI"}
            </button>
            {parsed && <span style={{ color: "#6ee7a8", fontSize: 13, fontWeight: 600 }}>✓ Parsed — review below</span>}
            {parseError && <span style={{ color: "#f87171", fontSize: 13 }}>{parseError}</span>}
          </div>
        </div>
      )}

      {/* Divider */}
      {!isEdit && (
        <div style={{ textAlign: "center", color: "#6e6a80", fontSize: 13, marginBottom: 20, position: "relative" }}>
          <span style={{ background: "var(--bg-body)", padding: "0 14px", position: "relative", zIndex: 1 }}>
            {parsed ? "Review & edit parsed fields" : "Or enter details manually"}
          </span>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px solid rgba(150, 170, 220, 0.08)", zIndex: 0 }} />
        </div>
      )}

      {/* Main form card */}
      <div style={{
        background: "rgba(200, 210, 240, 0.07)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(150, 170, 220, 0.12)",
        padding: 32,
        boxShadow: "var(--shadow-sm)",
      }}>
        {error && (
          <div style={{
            padding: "12px 16px", background: "rgba(248, 113, 113, 0.06)",
            border: "1px solid rgba(248, 113, 113, 0.15)", borderRadius: "var(--radius-sm)",
            color: "#f87171", fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Job Title *</label>
            <input
              style={parsed && form.title ? parsedHighlight : undefined}
              value={form.title} onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          {/* Company */}
          <div>
            <label style={labelStyle}>Company *</label>
            <input
              style={parsed && form.company ? parsedHighlight : undefined}
              value={form.company} onChange={(e) => updateField("company", e.target.value)}
              placeholder="e.g. Stripe"
            />
          </div>

          {/* Location + Job Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                style={parsed && form.location ? parsedHighlight : undefined}
                value={form.location} onChange={(e) => updateField("location", e.target.value)}
                placeholder="e.g. Remote, San Francisco, CA"
              />
            </div>
            <div>
              <label style={labelStyle}>Job Type</label>
              <select value={form.jobType} onChange={(e) => updateField("jobType", e.target.value)}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          {/* Salary */}
          <div>
            <label style={labelStyle}>Salary Range</label>
            <input
              style={parsed && form.salaryRange ? parsedHighlight : undefined}
              value={form.salaryRange} onChange={(e) => updateField("salaryRange", e.target.value)}
              placeholder="e.g. $150k - $200k"
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ minHeight: 120, resize: "vertical", ...(parsed && form.description ? parsedHighlight : {}) }}
              value={form.description} onChange={(e) => updateField("description", e.target.value)}
              placeholder="Paste the job description here..."
            />
          </div>

          {/* Apply URL + Email */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Apply URL</label>
              <input
                style={parsed && form.applyUrl ? parsedHighlight : undefined}
                value={form.applyUrl} onChange={(e) => updateField("applyUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label style={labelStyle}>Hiring Contact Email</label>
              <input
                style={parsed && form.hiringEmail ? parsedHighlight : undefined}
                value={form.hiringEmail} onChange={(e) => updateField("hiringEmail", e.target.value)}
                placeholder="recruiter@company.com"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <input
              value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag} placeholder="Type a tag and press Enter"
            />
            {tags.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tags.map((tag) => (
                  <span key={tag} onClick={() => setTags(tags.filter((t) => t !== tag))} style={{
                    cursor: "pointer", padding: "4px 12px",
                    background: "rgba(129, 140, 248, 0.08)", color: "#a5b4fc",
                    borderRadius: 20, fontSize: 13, fontWeight: 500,
                    border: "1px solid rgba(129, 140, 248, 0.1)",
                  }}>
                    {tag} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Required Skills */}
          <div>
            <label style={labelStyle}>Required Skills</label>
            <input
              value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={addSkill} placeholder="Type a skill and press Enter"
            />
            {requiredSkills.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {requiredSkills.map((skill) => (
                  <span key={skill} onClick={() => setRequiredSkills(requiredSkills.filter((s) => s !== skill))} style={{
                    cursor: "pointer", padding: "4px 12px",
                    background: "rgba(251, 191, 88, 0.08)", color: "#fbbf58",
                    borderRadius: 20, fontSize: 13, fontWeight: 500,
                    border: "1px solid rgba(251, 191, 88, 0.1)",
                  }}>
                    {skill} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Source */}
          <div>
            <label style={labelStyle}>Source</label>
            <select value={form.source} onChange={(e) => updateField("source", e.target.value)}>
              <option value="manual">Manual Entry</option>
              <option value="linkedin">LinkedIn</option>
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="indeed">Indeed</option>
              <option value="glassdoor">Glassdoor</option>
              <option value="angellist">AngelList / Wellfound</option>
              <option value="workday">Workday</option>
              <option value="ashby">Ashby</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: "10px 28px",
                background: saving ? "rgba(129, 140, 248, 0.2)" : "linear-gradient(135deg, #818cf8, #6366f1)",
                color: saving ? "#6e6a80" : "white",
                border: "none",
                borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
                fontFamily: "inherit",
                boxShadow: saving ? "none" : "0 2px 16px rgba(129, 140, 248, 0.2)",
              }}
            >
              {saving ? "Saving..." : isEdit ? "Update Job" : "Save Job"}
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: "10px 24px",
                background: "rgba(200, 210, 240, 0.06)",
                color: "#b0aac0",
                border: "1px solid rgba(150, 170, 220, 0.1)",
                borderRadius: "var(--radius-sm)", fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
