// src/JobForm.tsx
import { useState } from "react";
import type { Job } from "./api";
import * as api from "./api";

interface JobFormProps {
  token: string;
  existingJob?: Job | null; // null = create mode, Job = edit mode
  onSaved: (job: Job) => void;
  onCancel: () => void;
}

export default function JobForm({ token, existingJob, onSaved, onCancel }: JobFormProps) {
  const isEdit = !!existingJob;

  const [form, setForm] = useState({
    title: existingJob?.title || "",
    company: existingJob?.company || "",
    location: existingJob?.location || "",
    salary_range: existingJob?.salary_range || "",
    job_type: existingJob?.job_type || "full-time",
    description: existingJob?.description || "",
    apply_url: existingJob?.apply_url || "",
    hiring_email: existingJob?.hiring_email || "",
    source: existingJob?.source || "manual",
  });

  const [tags, setTags] = useState<string[]>(existingJob?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(existingJob?.required_skills || []);
  const [skillInput, setSkillInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Paste & Parse state ─────────────────────────────
  const [pasteInput, setPasteInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);

  // ── Paste & Parse handler ───────────────────────────
  async function handleParse() {
    const input = pasteInput.trim();
    if (!input) return;

    setParsing(true);
    setParseError(null);

    try {
      // Detect if it's a URL or raw text
      const isURL = input.startsWith("http://") || input.startsWith("https://");
      const payload = isURL ? { url: input } : { text: input };

      const result = await api.parseJobPosting(token, payload);

      // Auto-fill the form with parsed data
      setForm({
        title: result.title || form.title,
        company: result.company || form.company,
        location: result.location || form.location,
        salary_range: result.salary_range || form.salary_range,
        job_type: result.job_type || form.job_type,
        description: result.description || form.description,
        apply_url: result.apply_url || form.apply_url,
        hiring_email: result.hiring_email || form.hiring_email,
        source: result.source || form.source,
      });

      if (result.required_skills?.length > 0) {
        setRequiredSkills(result.required_skills);
      }
      if (result.tags?.length > 0) {
        setTags(result.tags);
      }

      setParsed(true);
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  // ── Form helpers ────────────────────────────────────
  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !tagInput.trim()) return;
    e.preventDefault();
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function addSkill(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !skillInput.trim()) return;
    e.preventDefault();
    if (!requiredSkills.includes(skillInput.trim())) {
      setRequiredSkills([...requiredSkills, skillInput.trim()]);
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.company.trim()) {
      setError("Title and company are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        tags,
        required_skills: requiredSkills,
      };

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

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box" as const,
    background: "#ffffff",
    color: "#1e293b",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 4,
    fontWeight: 600,
    fontSize: 13,
    color: "#374151",
  };

  // Highlight style for fields that were auto-filled by parse
  const parsedStyle = { borderColor: "#86efac", background: "#f0fdf4", color: "#1e293b" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{isEdit ? "Edit Job" : "Add Job"}</h2>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      {/* ── Paste & Parse Section ──────────────────────── */}
      {!isEdit && (
        <div
          style={{
            padding: 16,
            marginBottom: 24,
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: 8,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <label style={{ ...labelStyle, color: "#0369a1" }}>
              Quick Add — Paste a job URL or description
            </label>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px" }}>
              Paste a LinkedIn, Greenhouse, or any job posting URL — or copy the full job description text.
              AI will extract the details automatically.
            </p>
          </div>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
              borderColor: "#93c5fd",
            }}
            value={pasteInput}
            onChange={(e) => {
              setPasteInput(e.target.value);
              setParsed(false);
              setParseError(null);
            }}
            placeholder={"Paste a URL like https://www.linkedin.com/jobs/view/...\n\nOr paste the full job description text here"}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button
              onClick={handleParse}
              disabled={parsing || !pasteInput.trim()}
              style={{
                padding: "8px 20px",
                background: parsing ? "#93c5fd" : !pasteInput.trim() ? "#e5e7eb" : "#0284c7",
                color: parsing || !pasteInput.trim() ? "#9ca3af" : "white",
                border: "none",
                borderRadius: 6,
                cursor: parsing || !pasteInput.trim() ? "default" : "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {parsing ? "Parsing..." : "Parse with AI"}
            </button>
            {parsed && (
              <span style={{ color: "#059669", fontSize: 13, fontWeight: 600 }}>
                ✓ Parsed — review the fields below and save
              </span>
            )}
            {parseError && (
              <span style={{ color: "#dc2626", fontSize: 13 }}>{parseError}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Divider ──────────────────────────────────── */}
      {!isEdit && (
        <div
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 13,
            marginBottom: 16,
            position: "relative",
          }}
        >
          <span style={{ background: "white", padding: "0 12px", position: "relative", zIndex: 1 }}>
            {parsed ? "Review & edit parsed fields" : "Or enter details manually"}
          </span>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              borderTop: "1px solid #e5e7eb",
              zIndex: 0,
            }}
          />
        </div>
      )}

      {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}

      {/* ── Manual Form Fields ─────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Job Title *</label>
          <input
            style={{ ...inputStyle, ...(parsed && form.title ? parsedStyle : {}) }}
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
          />
        </div>

        {/* Company */}
        <div>
          <label style={labelStyle}>Company *</label>
          <input
            style={{ ...inputStyle, ...(parsed && form.company ? parsedStyle : {}) }}
            value={form.company}
            onChange={(e) => updateField("company", e.target.value)}
            placeholder="e.g. Stripe"
          />
        </div>

        {/* Location + Job Type row */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Location</label>
            <input
              style={{ ...inputStyle, ...(parsed && form.location ? parsedStyle : {}) }}
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. Remote, San Francisco, CA"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Job Type</label>
            <select
              style={inputStyle}
              value={form.job_type}
              onChange={(e) => updateField("job_type", e.target.value)}
            >
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
            style={{ ...inputStyle, ...(parsed && form.salary_range ? parsedStyle : {}) }}
            value={form.salary_range}
            onChange={(e) => updateField("salary_range", e.target.value)}
            placeholder="e.g. $150k - $200k"
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 100,
              resize: "vertical",
              ...(parsed && form.description ? parsedStyle : {}),
            }}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Paste the job description here..."
          />
        </div>

        {/* Apply URL + Hiring Email row */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Apply URL</label>
            <input
              style={{ ...inputStyle, ...(parsed && form.apply_url ? parsedStyle : {}) }}
              value={form.apply_url}
              onChange={(e) => updateField("apply_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Hiring Contact Email</label>
            <input
              style={{ ...inputStyle, ...(parsed && form.hiring_email ? parsedStyle : {}) }}
              value={form.hiring_email}
              onChange={(e) => updateField("hiring_email", e.target.value)}
              placeholder="recruiter@company.com"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags</label>
          <input
            style={inputStyle}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder="Type a tag and press Enter"
          />
          {tags.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => removeTag(tag)}
                  style={{
                    cursor: "pointer",
                    padding: "2px 8px",
                    background: "#e0e7ff",
                    color: "#3730a3",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
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
            style={inputStyle}
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={addSkill}
            placeholder="Type a skill and press Enter"
          />
          {requiredSkills.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {requiredSkills.map((skill) => (
                <span
                  key={skill}
                  onClick={() => removeSkill(skill)}
                  style={{
                    cursor: "pointer",
                    padding: "2px 8px",
                    background: "#fef3c7",
                    color: "#92400e",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  {skill} ×
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Source */}
        <div>
          <label style={labelStyle}>Source</label>
          <select
            style={inputStyle}
            value={form.source}
            onChange={(e) => updateField("source", e.target.value)}
          >
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

        {/* Submit */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "10px 24px",
              background: saving ? "#93c5fd" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "default" : "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {saving ? "Saving..." : isEdit ? "Update Job" : "Save Job"}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px",
              background: "white",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
