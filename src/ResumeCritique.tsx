// src/ResumeCritique.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import type { Job, CritiqueIssue, CritiqueResult, FixSuggestion } from "./api";
import { getJobs, uploadResume, aiCritique, aiFix } from "./api";

interface ResumeCritiqueProps {
  token: string;
  preselectedJobId?: string | null;
}

// ── Manual analysis engine ───────────────────────────
function runManualAnalysis(text: string, targetJob: Job | null): CritiqueResult {
  const issues: CritiqueIssue[] = [];
  const strengths: string[] = [];

  // Length
  const lines = text.split("\n").filter((l) => l.trim()).length;
  if (lines < 10)
    issues.push({ cat: "Length", sev: "warning", msg: "Resume appears too short. Aim for at least 15-20 substantive lines to cover experience adequately." });
  else if (lines > 60)
    issues.push({ cat: "Length", sev: "warning", msg: "Resume may be too long. Try to keep it to 1-2 pages for most roles." });
  else strengths.push("Good length — concise but substantive");

  // Quantifiable metrics
  const hasNumbers = /\d+%|\$\d|\d+ (users|customers|projects|teams|people|clients|requests|transactions|applications|endpoints|services)/i.test(text);
  if (!hasNumbers)
    issues.push({ cat: "Impact", sev: "critical", msg: "No quantifiable metrics found. Add numbers to show impact (e.g., 'Reduced load time by 40%', 'Served 50k users', 'Managed team of 8')." });
  else strengths.push("Includes quantifiable metrics — shows measurable impact");

  // Weak verbs
  const weakVerbs = ["worked", "helped", "used", "did", "made", "attended", "was responsible", "assisted", "participated"];
  const foundVerbs = weakVerbs.filter((v) => text.toLowerCase().includes(v));
  if (foundVerbs.length > 0)
    issues.push({ cat: "Language", sev: "critical", msg: `Weak verbs found: "${foundVerbs.join('", "')}". Replace with strong action verbs like "Architected", "Spearheaded", "Optimized", "Delivered", "Scaled".` });
  else strengths.push("Uses strong action verbs throughout");

  // Clichés
  const fillers = ["fast-paced", "team player", "hard worker", "go-getter", "looking for a challenging role", "passionate", "detail-oriented", "self-starter", "results-driven"];
  const foundFillers = fillers.filter((f) => text.toLowerCase().includes(f));
  if (foundFillers.length > 0)
    issues.push({ cat: "Clarity", sev: "warning", msg: `Cliché phrases found: "${foundFillers.join('", "')}". Replace with specific examples that demonstrate these qualities.` });

  // Contact info
  if (!/@/.test(text))
    issues.push({ cat: "Formatting", sev: "warning", msg: "No email address detected. Ensure contact info is clearly visible at the top." });
  else strengths.push("Contact information is present");

  // Summary section
  if (/summary|objective|profile|about/i.test(text))
    strengths.push("Has a summary/profile section");
  else
    issues.push({ cat: "Structure", sev: "info", msg: "Consider adding a professional summary at the top — a 2-3 sentence elevator pitch tailored to your target roles." });

  // Skills section
  if (/skills|technologies|tech stack/i.test(text))
    strengths.push("Includes a skills/technologies section");
  else
    issues.push({ cat: "Structure", sev: "info", msg: "Consider adding a dedicated skills section to make it easy for ATS systems and recruiters to spot your technical abilities." });

  // Bullet usage
  const bullets = text.match(/^[•\-\*]/gm) || [];
  if (bullets.length > 0) strengths.push("Uses bullet points for readability");
  else
    issues.push({ cat: "Formatting", sev: "info", msg: "Consider using bullet points for experience items — they're easier to scan than paragraphs." });

  // Punctuation consistency
  const bulletLines = text.split("\n").filter((l) => /^[•\-\*]/.test(l.trim()));
  const endsWithPeriod = bulletLines.filter((l) => l.trim().endsWith("."));
  if (bulletLines.length > 2 && endsWithPeriod.length > 0 && endsWithPeriod.length < bulletLines.length)
    issues.push({ cat: "Punctuation", sev: "warning", msg: `Inconsistent punctuation: ${endsWithPeriod.length}/${bulletLines.length} bullets end with periods. Pick one style and apply consistently.` });

  // Education
  if (/education|university|degree|bachelor|master|phd|b\.s\.|m\.s\./i.test(text))
    strengths.push("Education section is present");

  // Role alignment
  if (targetJob) {
    const reqSkills = targetJob.requiredSkills || [];
    const textLower = text.toLowerCase();
    const mentioned = reqSkills.filter((s) => textLower.includes(s.toLowerCase()));
    const missing = reqSkills.filter((s) => !textLower.includes(s.toLowerCase()));
    if (missing.length > 0)
      issues.push({ cat: "Alignment", sev: "critical", msg: `Missing key skills for ${targetJob.title}: ${missing.join(", ")}. Add these if you have experience with them.` });
    if (mentioned.length > 0)
      strengths.push(`Mentions ${mentioned.length}/${reqSkills.length} required skills for ${targetJob.title}`);
  }

  // Score
  const criticals = issues.filter((i) => i.sev === "critical").length;
  const warnings = issues.filter((i) => i.sev === "warning").length;
  const score = Math.max(15, Math.min(100, 100 - criticals * 18 - warnings * 8));

  return { issues, strengths, score, targetJob };
}

// ── Component ────────────────────────────────────────
export default function ResumeCritique({ token, preselectedJobId }: ResumeCritiqueProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [targetJobId, setTargetJobId] = useState<string | null>(preselectedJobId || null);
  const [resumeText, setResumeText] = useState("");
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [results, setResults] = useState<CritiqueResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [issueFixes, setIssueFixes] = useState<Record<string, { suggestions: FixSuggestion[] }>>({});
  const [issueFixLoading, setIssueFixLoading] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's tracked jobs for role alignment
  useEffect(() => {
    getJobs(token).then(setJobs).catch(console.error);
  }, [token]);

  // Auto-select preselected job
  useEffect(() => {
    if (preselectedJobId) setTargetJobId(preselectedJobId);
  }, [preselectedJobId]);

  const targetJob = targetJobId ? jobs.find((j) => j.id === targetJobId) || null : null;

  // ── PDF Upload ──────────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Max 10MB.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setResults(null);
    try {
      const data = await uploadResume(token, file);
      setResumeText(data.text);
      setResumeFilename(data.filename || file.name);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }, [token]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // ── Manual Analysis ─────────────────────────────────
  const handleManualAnalysis = () => {
    if (!resumeText.trim()) return;
    const result = runManualAnalysis(resumeText, targetJob);
    setResults(result);
    setExpandedIssue(null);
    setIssueFixes({});
  };

  // ── AI Deep Critique ────────────────────────────────
  const handleAiCritique = async () => {
    if (!resumeText.trim()) return;
    setAiLoading(true);
    setResults(null);
    setExpandedIssue(null);
    setIssueFixes({});
    try {
      const result = await aiCritique(token, resumeText, targetJobId || undefined);
      setResults({ ...result, targetJob, aiPowered: true });
    } catch {
      // Fallback to manual
      const result = runManualAnalysis(resumeText, targetJob);
      setResults(result);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Per-issue AI fix ────────────────────────────────
  const fetchFix = async (issue: CritiqueIssue, index: number) => {
    const fixKey = `${issue.cat}-${index}`;
    if (issueFixes[fixKey]) return; // already loaded
    setIssueFixLoading(fixKey);
    try {
      const result = await aiFix(token, resumeText, issue, targetJobId || undefined);
      setIssueFixes((prev) => ({ ...prev, [fixKey]: result }));
    } catch {
      // Fallback
      setIssueFixes((prev) => ({
        ...prev,
        [fixKey]: {
          suggestions: [
            {
              before: "Current text needs improvement",
              after: "Improved version with stronger language and metrics",
              explanation: "AI fix unavailable — try the AI Deep Critique for detailed suggestions.",
            },
          ],
        },
      }));
    } finally {
      setIssueFixLoading(null);
    }
  };

  // ── Severity colors (midnight palette) ──────────────
  const sevStyle = (sev: string) => {
    if (sev === "critical") return { color: "#f87171", bg: "rgba(248, 113, 113, 0.06)", border: "rgba(248, 113, 113, 0.1)" };
    if (sev === "warning") return { color: "#fbbf58", bg: "rgba(251, 191, 88, 0.06)", border: "rgba(251, 191, 88, 0.1)" };
    return { color: "#818cf8", bg: "rgba(129, 140, 248, 0.06)", border: "rgba(129, 140, 248, 0.1)" };
  };

  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const lineCount = resumeText.split("\n").filter((l) => l.trim()).length;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: "rgba(129, 140, 248, 0.04)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(129, 140, 248, 0.1)",
        borderRadius: "var(--radius-lg)",
        padding: "32px 40px", marginBottom: 28, textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
        <h2 style={{
          fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #818cf8, #c084fc, #60a5fa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Resume Critique
        </h2>
        <p style={{ fontSize: 14, color: "#8a8498", maxWidth: 520, margin: "0 auto" }}>
          Get actionable feedback on your resume. We analyze structure, impact, language, and alignment to your target roles — without rewriting it for you.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── LEFT PANEL ─────────────────────────── */}
        <div>
          {/* Upload Zone */}
          <div style={{
            background: "rgba(200, 210, 240, 0.06)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(150, 170, 220, 0.1)",
            borderRadius: "var(--radius-lg)",
            padding: 24, marginBottom: 16,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ opacity: 0.5 }}>📎</span> Your Resume
              </h3>
              {resumeFilename && (
                <span style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                  background: "rgba(110, 231, 168, 0.08)", color: "#6ee7a8",
                  border: "1px solid rgba(110, 231, 168, 0.12)",
                }}>
                  ✓ {resumeFilename}
                </span>
              )}
            </div>

            {/* Drop zone or preview */}
            {!resumeText ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: "2px dashed rgba(129, 140, 248, 0.15)",
                  borderRadius: "var(--radius-md)",
                  padding: "48px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.25s",
                  background: "rgba(129, 140, 248, 0.02)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(129, 140, 248, 0.3)";
                  e.currentTarget.style.background = "rgba(129, 140, 248, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(129, 140, 248, 0.15)";
                  e.currentTarget.style.background = "rgba(129, 140, 248, 0.02)";
                }}
              >
                {uploading ? (
                  <>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", margin: "0 auto 12px",
                      border: "3px solid rgba(129, 140, 248, 0.12)", borderTopColor: "#818cf8",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <div style={{ fontSize: 14, color: "#b0aac0", fontWeight: 600 }}>Extracting text from PDF...</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📄</div>
                    <div style={{ fontSize: 14, color: "#b0aac0", fontWeight: 600, marginBottom: 4 }}>
                      Drop your PDF resume here
                    </div>
                    <div style={{ fontSize: 12, color: "#6e6a80" }}>
                      or click to browse · PDF only · Max 10MB
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div>
                <div style={{
                  maxHeight: 380, overflow: "auto", padding: 16, borderRadius: "var(--radius-md)",
                  background: "rgba(200, 210, 240, 0.04)", border: "1px solid rgba(150, 170, 220, 0.06)",
                  fontSize: 12, fontFamily: "'Plus Jakarta Sans', monospace", lineHeight: 1.7,
                  color: "#c8c2d4", whiteSpace: "pre-wrap",
                }}>
                  {resumeText}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8,
                }}>
                  <span style={{ fontSize: 10, color: "#6e6a80" }}>
                    {lineCount} lines · {wordCount} words
                  </span>
                  <button
                    onClick={() => { setResumeText(""); setResumeFilename(null); setResults(null); }}
                    style={{
                      fontSize: 11, color: "#8a8498", background: "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />

            {uploadError && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>{uploadError}</div>
            )}
          </div>

          {/* Target Role Selector */}
          <div style={{
            background: "rgba(200, 210, 240, 0.06)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(150, 170, 220, 0.1)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#8a8498", marginBottom: 12,
              letterSpacing: "0.7px", textTransform: "uppercase",
            }}>
              Align to a specific role (optional)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
              <button
                onClick={() => setTargetJobId(null)}
                style={{
                  padding: "6px 14px", borderRadius: 10,
                  background: !targetJobId ? "linear-gradient(135deg, #818cf8, #6366f1)" : "rgba(200, 210, 240, 0.04)",
                  color: !targetJobId ? "#fff" : "#8a8498",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  border: !targetJobId ? "none" : "1px solid rgba(150, 170, 220, 0.08)",
                }}
              >
                General
              </button>
              {jobs.slice(0, 8).map((j) => (
                <button
                  key={j.id}
                  onClick={() => setTargetJobId(j.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 10,
                    background: targetJobId === j.id ? "linear-gradient(135deg, #818cf8, #6366f1)" : "rgba(200, 210, 240, 0.04)",
                    color: targetJobId === j.id ? "#fff" : "#8a8498",
                    fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                    border: targetJobId === j.id ? "none" : "1px solid rgba(150, 170, 220, 0.08)",
                    maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {j.company} — {j.title.split(" ").slice(0, 3).join(" ")}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleManualAnalysis}
                disabled={!resumeText.trim()}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: "var(--radius-sm)",
                  background: !resumeText.trim() ? "rgba(200, 210, 240, 0.04)" : "linear-gradient(135deg, #818cf8, #6366f1)",
                  color: !resumeText.trim() ? "#6e6a80" : "#fff",
                  fontSize: 13, fontWeight: 700, cursor: !resumeText.trim() ? "default" : "pointer",
                  fontFamily: "inherit", border: "none",
                  opacity: !resumeText.trim() ? 0.5 : 1,
                  boxShadow: resumeText.trim() ? "0 2px 16px rgba(129, 140, 248, 0.2)" : "none",
                }}
              >
                Quick Analysis
              </button>
              <button
                onClick={handleAiCritique}
                disabled={!resumeText.trim() || aiLoading}
                style={{
                  flex: 1, padding: "12px 20px", borderRadius: "var(--radius-sm)",
                  background: "rgba(96, 165, 250, 0.06)",
                  color: !resumeText.trim() || aiLoading ? "#6e6a80" : "#60a5fa",
                  fontSize: 13, fontWeight: 700,
                  cursor: !resumeText.trim() || aiLoading ? "default" : "pointer",
                  fontFamily: "inherit",
                  border: "1px solid rgba(96, 165, 250, 0.12)",
                  opacity: !resumeText.trim() || aiLoading ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <span>✦</span> {aiLoading ? "Analyzing..." : "AI Deep Critique"}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────── */}
        <div>
          {/* Loading */}
          {aiLoading && (
            <div style={{
              background: "rgba(200, 210, 240, 0.06)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(150, 170, 220, 0.1)",
              borderRadius: "var(--radius-lg)",
              padding: 48, textAlign: "center",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", margin: "0 auto 16px",
                border: "3px solid rgba(129, 140, 248, 0.12)", borderTopColor: "#818cf8",
                animation: "spin 0.8s linear infinite",
              }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "#b0aac0" }}>Analyzing your resume...</div>
              <div style={{ fontSize: 12, color: "#6e6a80", marginTop: 4 }}>Checking impact, language, structure, and alignment</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Empty State */}
          {!results && !aiLoading && (
            <div style={{
              background: "rgba(200, 210, 240, 0.06)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(150, 170, 220, 0.1)",
              borderRadius: "var(--radius-lg)",
              padding: 48, textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#6e6a80" }}>Upload your resume and click Analyze</div>
              <div style={{ fontSize: 12, color: "#454058", marginTop: 4 }}>We'll identify issues and suggest improvements</div>
            </div>
          )}

          {/* Results */}
          {results && !aiLoading && (
            <div>
              {/* Score summary */}
              <div style={{
                background: "rgba(200, 210, 240, 0.06)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(150, 170, 220, 0.1)",
                borderRadius: "var(--radius-lg)",
                padding: 24, marginBottom: 16, textAlign: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
                  {/* Score number */}
                  <div style={{
                    fontSize: 42, fontWeight: 800, letterSpacing: "-1px",
                    color: results.score >= 80 ? "#6ee7a8" : results.score >= 60 ? "#fbbf58" : results.score >= 40 ? "#fb923c" : "#f87171",
                  }}>
                    {results.score}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
                      {results.score >= 80 ? "Strong Resume" : results.score >= 60 ? "Good Foundation" : results.score >= 40 ? "Needs Work" : "Major Issues"}
                    </div>
                    <div style={{ fontSize: 12, color: "#8a8498" }}>
                      {results.issues.filter((i) => i.sev === "critical").length} critical · {results.issues.filter((i) => i.sev === "warning").length} warnings · {results.strengths.length} strengths
                    </div>
                    {results.aiPowered && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 6,
                        background: "rgba(96, 165, 250, 0.08)", color: "#60a5fa",
                        fontSize: 10, fontWeight: 600, marginTop: 6,
                      }}>
                        ✦ AI-Powered Analysis
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Tip (AI only) */}
              {results.topTip && (
                <div style={{
                  background: "rgba(129, 140, 248, 0.04)",
                  border: "1px solid rgba(129, 140, 248, 0.1)",
                  borderRadius: "var(--radius-lg)",
                  padding: 16, marginBottom: 16,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", marginBottom: 3, letterSpacing: "1px", textTransform: "uppercase" }}>
                        Top Priority
                      </div>
                      <div style={{ fontSize: 12, color: "#c8c2d4", lineHeight: 1.6 }}>{results.topTip}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              <div style={{
                background: "rgba(200, 210, 240, 0.06)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(150, 170, 220, 0.1)",
                borderRadius: "var(--radius-lg)",
                padding: 20, marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)",
                }}>
                  <span style={{ opacity: 0.5 }}>⚠</span> Issues Found
                  <span style={{
                    padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                    background: "rgba(248, 113, 113, 0.08)", color: "#f87171",
                  }}>
                    {results.issues.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {results.issues.map((issue, i) => {
                    const s = sevStyle(issue.sev);
                    const isExpanded = expandedIssue === i;
                    const fixKey = `${issue.cat}-${i}`;
                    const fix = issueFixes[fixKey];
                    const fixLoading = issueFixLoading === fixKey;

                    return (
                      <div key={i}>
                        <div
                          onClick={() => {
                            const newIdx = isExpanded ? null : i;
                            setExpandedIssue(newIdx);
                            if (newIdx !== null && !issueFixes[fixKey]) fetchFix(issue, i);
                          }}
                          style={{
                            padding: "12px 14px",
                            borderRadius: isExpanded ? "var(--radius-md) var(--radius-md) 0 0" : "var(--radius-md)",
                            background: s.bg, border: `1px solid ${s.border}`,
                            borderBottom: isExpanded ? "none" : undefined,
                            cursor: "pointer", transition: "all 0.2s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{
                                padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700,
                                background: s.bg, color: s.color,
                              }}>
                                {issue.sev.toUpperCase()}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#6e6a80" }}>{issue.cat}</span>
                            </div>
                            <span style={{ fontSize: 10, color: "#818cf8", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                              {isExpanded ? "Hide fixes" : "✦ Show fixes"}
                              <span style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none", fontSize: 9 }}>▸</span>
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#c8c2d4", lineHeight: 1.6 }}>{issue.msg}</div>
                        </div>

                        {/* Expanded fix panel */}
                        {isExpanded && (
                          <div style={{
                            padding: 14,
                            borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                            background: "rgba(129, 140, 248, 0.03)",
                            border: `1px solid ${s.border}`, borderTop: "none",
                          }}>
                            {fixLoading && (
                              <div style={{ textAlign: "center", padding: "16px 0" }}>
                                <div style={{
                                  width: 24, height: 24, borderRadius: "50%", margin: "0 auto 8px",
                                  border: "2px solid rgba(129, 140, 248, 0.12)", borderTopColor: "#818cf8",
                                  animation: "spin 0.8s linear infinite",
                                }} />
                                <div style={{ fontSize: 11, color: "#6e6a80" }}>Getting AI suggestions...</div>
                              </div>
                            )}
                            {fix && !fixLoading && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{
                                  fontSize: 10, fontWeight: 700, color: "#818cf8",
                                  letterSpacing: "1px", textTransform: "uppercase",
                                  display: "flex", alignItems: "center", gap: 4,
                                }}>
                                  <span>✦</span> AI Suggestions
                                </div>
                                {fix.suggestions.map((sg, si) => (
                                  <div key={si} style={{
                                    padding: 12, borderRadius: "var(--radius-md)",
                                    background: "rgba(200, 210, 240, 0.04)",
                                    border: "1px solid rgba(150, 170, 220, 0.06)",
                                  }}>
                                    {/* Before */}
                                    <div style={{ marginBottom: 8 }}>
                                      <div style={{ fontSize: 9, fontWeight: 700, color: "#f87171", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 3 }}>Before</div>
                                      <div style={{
                                        padding: "8px 10px", borderRadius: 6,
                                        background: "rgba(248, 113, 113, 0.04)", border: "1px solid rgba(248, 113, 113, 0.08)",
                                        fontSize: 11, color: "#8a8498", lineHeight: 1.6,
                                        textDecoration: "line-through", textDecorationColor: "rgba(248, 113, 113, 0.3)",
                                      }}>
                                        {sg.before}
                                      </div>
                                    </div>
                                    {/* After */}
                                    <div style={{ marginBottom: 8 }}>
                                      <div style={{ fontSize: 9, fontWeight: 700, color: "#6ee7a8", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 3 }}>After</div>
                                      <div style={{
                                        padding: "8px 10px", borderRadius: 6,
                                        background: "rgba(110, 231, 168, 0.04)", border: "1px solid rgba(110, 231, 168, 0.1)",
                                        fontSize: 11, color: "#c8c2d4", lineHeight: 1.6, fontWeight: 500,
                                      }}>
                                        {sg.after}
                                      </div>
                                    </div>
                                    {/* Explanation */}
                                    <div style={{ fontSize: 11, color: "#8a8498", lineHeight: 1.5, fontStyle: "italic" }}>
                                      💡 {sg.explanation}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths */}
              <div style={{
                background: "rgba(200, 210, 240, 0.06)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(150, 170, 220, 0.1)",
                borderRadius: "var(--radius-lg)",
                padding: 20, marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)",
                }}>
                  <span style={{ opacity: 0.5 }}>✓</span> Strengths
                  <span style={{
                    padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
                    background: "rgba(110, 231, 168, 0.08)", color: "#6ee7a8",
                  }}>
                    {results.strengths.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {results.strengths.map((s, i) => (
                    <div key={i} style={{
                      padding: "10px 12px", borderRadius: "var(--radius-sm)",
                      background: "rgba(110, 231, 168, 0.04)",
                      border: "1px solid rgba(110, 231, 168, 0.08)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ color: "#6ee7a8", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 12, color: "#b0aac0", lineHeight: 1.5 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Alignment */}
              {results.targetJob && (
                <div style={{
                  background: "rgba(200, 210, 240, 0.06)",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(129, 140, 248, 0.1)",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, marginBottom: 12,
                    display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)",
                  }}>
                    <span style={{ opacity: 0.5 }}>🎯</span> Role Alignment — {results.targetJob.title}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(results.targetJob.requiredSkills || []).map((skill) => {
                      const mentioned = resumeText.toLowerCase().includes(skill.toLowerCase());
                      return (
                        <span key={skill} style={{
                          padding: "5px 11px", borderRadius: 14, fontSize: 11, fontWeight: 500,
                          background: mentioned ? "rgba(110, 231, 168, 0.08)" : "rgba(248, 113, 113, 0.06)",
                          color: mentioned ? "#6ee7a8" : "#f87171",
                          border: mentioned ? "1px solid rgba(110, 231, 168, 0.15)" : "1px dashed rgba(248, 113, 113, 0.15)",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <span style={{ fontSize: 10 }}>{mentioned ? "✓" : "✕"}</span> {skill}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10, color: "#6e6a80" }}>
                    Skills found in resume are marked green. Add missing skills to improve alignment.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
