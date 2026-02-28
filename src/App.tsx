// src/App.tsx
import { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import * as api from "./api";
import type { Job } from "./api";
import JobList from "./JobList";
import JobForm from "./JobForm";
import JobDetail from "./JobDetail";
import Discover from "./Discover";
import JobCompare from "./JobCompare";
import ResumeCritique from "./ResumeCritique";

type View =
  | { page: "jobs" }
  | { page: "discover" }
  | { page: "job-detail"; job: Job }
  | { page: "job-add" }
  | { page: "job-edit"; job: Job }
  | { page: "resume"; preselectedJobId?: string }
  | { page: "profile" }
  | { page: "compare"; jobs: Job[] };

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [view, setView] = useState<View>({ page: "discover" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const t = await firebaseUser.getIdToken();
        setToken(t);
        await syncWithBackend(firebaseUser);
      } else {
        setProfile(null);
        setToken("");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function syncWithBackend(firebaseUser: User) {
    try {
      const t = await firebaseUser.getIdToken();
      // Sync user record (creates if first login)
      await api.syncUser(t);
      // Then fetch the full profile
      const p = await api.getProfile(t);
      setProfile(p);
    } catch (err: any) {
      console.error("Backend sync failed:", err.message);
      // Even if sync fails, set a minimal profile so the editor renders
      setProfile({
        name: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
        bio: "",
        location: "",
        workStyle: "remote",
        salaryMin: 0,
        salaryMax: 0,
        skills: [],
        githubUrl: "",
      });
    }
  }

  async function handleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setProfile(null);
    setView({ page: "jobs" });
  }

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #818cf8, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: 20, margin: "0 auto 12px",
            boxShadow: "0 2px 20px rgba(129, 140, 248, 0.3)",
          }}>
            H
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ── Sign In ──────────────────────────────────────────
  if (!user) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh",
      }}>
        <div style={{
          textAlign: "center",
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "52px 60px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #818cf8, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: 24, margin: "0 auto 16px",
            boxShadow: "0 4px 24px rgba(129, 140, 248, 0.3)",
          }}>
            H
          </div>
          <div style={{
            fontSize: 28, fontWeight: 800, color: "var(--text-primary)",
            marginBottom: 4, letterSpacing: "-0.5px",
          }}>
            HireIQ
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 32 }}>
            Your AI-powered job search companion
          </p>
          <button
            onClick={handleSignIn}
            style={{
              padding: "12px 36px",
              fontSize: 15,
              background: "linear-gradient(135deg, #818cf8, #6366f1)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              boxShadow: "0 2px 16px rgba(129, 140, 248, 0.25)",
              letterSpacing: "-0.2px",
            }}
          >
            Sign in with Google
          </button>
          {error && <p style={{ color: "var(--danger)", marginTop: 16, fontSize: 13 }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Tab styling ─────────────────────────────────────
  const isActive = (check: string) => {
    if (check === "tracker") return view.page.startsWith("job") || view.page === "compare";
    if (check === "resume") return view.page === "resume";
    return view.page === check;
  };

  const tabStyle = (check: string): React.CSSProperties => ({
    padding: "7px 20px",
    fontSize: 13,
    fontWeight: 600,
    color: isActive(check) ? "var(--accent)" : "var(--text-muted)",
    background: isActive(check) ? "var(--accent-light)" : "transparent",
    border: isActive(check) ? "1px solid rgba(129, 140, 248, 0.1)" : "1px solid transparent",
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    transition: "all 0.2s",
    cursor: "pointer",
  });

  // ── Main App ─────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── Glassmorphism Nav ────────────────────── */}
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(28px) saturate(150%)",
        WebkitBackdropFilter: "blur(28px) saturate(150%)",
        background: "var(--bg-nav)",
        borderBottom: "1px solid var(--glass-border)",
        height: "var(--nav-height)",
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", maxWidth: "var(--content-max)", margin: "0 auto",
        }}>
          {/* Left: Logo + Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              onClick={() => setView({ page: "jobs" })}
              style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}
            >
              <div style={{
                width: 33, height: 33, borderRadius: 9,
                background: "linear-gradient(135deg, #818cf8, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 800, fontSize: 15,
                boxShadow: "0 2px 16px rgba(129, 140, 248, 0.2), 0 0 40px rgba(99, 102, 241, 0.08)",
              }}>
                H
              </div>
              <span style={{
                fontSize: 18, fontWeight: 800, color: "var(--text-primary)",
                letterSpacing: "-0.3px",
              }}>
                HireIQ
              </span>
            </div>

            <div style={{
              display: "flex", gap: 2,
              background: "rgba(200, 210, 240, 0.03)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10, padding: 3,
            }}>
              <button onClick={() => setView({ page: "discover" })} style={tabStyle("discover")}>Discover</button>
              <button onClick={() => setView({ page: "jobs" })} style={tabStyle("tracker")}>Tracker</button>
              <button onClick={() => setView({ page: "resume" })} style={tabStyle("resume")}>Resume</button>
              <button onClick={() => setView({ page: "profile" })} style={tabStyle("profile")}>Profile</button>
            </div>
          </div>

          {/* Right: User */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              {user.displayName}
            </span>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  border: "1px solid var(--glass-border)",
                }}
              />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "var(--accent-medium)",
                border: "1px solid rgba(129, 140, 248, 0.12)",
                color: "var(--accent)", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, fontSize: 12,
              }}>
                {user.displayName?.[0] || "?"}
              </div>
            )}
            <button
              onClick={handleSignOut}
              style={{
                padding: "5px 14px",
                background: "transparent",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13,
                color: "var(--text-muted)",
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────── */}
      <main style={{
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        padding: "28px 32px",
      }}>
        {view.page === "jobs" && (
          <JobList
            token={token}
            onSelectJob={(job) => setView({ page: "job-detail", job })}
            onAddJob={() => setView({ page: "job-add" })}
            onCompare={(jobs) => setView({ page: "compare", jobs })}
          />
        )}

        {view.page === "discover" && <Discover token={token} onSelectJob={(job) => setView({ page: "job-detail", job })} />}

        {view.page === "resume" && (
          <ResumeCritique
            token={token}
            preselectedJobId={view.preselectedJobId || null}
          />
        )}

        {view.page === "job-detail" && (
          <JobDetail
            job={view.job}
            token={token}
            profile={profile}
            onEdit={() => setView({ page: "job-edit", job: view.job })}
            onBack={() => setView({ page: "jobs" })}
            onBackToDiscover={() => setView({ page: "discover" })}
            onCritique={(jobId) => setView({ page: "resume", preselectedJobId: jobId })}
          />
        )}

        {view.page === "job-add" && (
          <JobForm
            token={token}
            onSaved={() => setView({ page: "jobs" })}
            onCancel={() => setView({ page: "jobs" })}
          />
        )}

        {view.page === "job-edit" && (
          <JobForm
            token={token}
            existingJob={view.job}
            onSaved={(updated) => setView({ page: "job-detail", job: updated })}
            onCancel={() => setView({ page: "job-detail", job: view.job })}
          />
        )}

        {view.page === "compare" && (
          <JobCompare
            jobs={view.jobs}
            token={token}
            profile={profile}
            onBack={() => setView({ page: "jobs" })}
          />
        )}

        {view.page === "profile" && profile && (
          <ProfileEditor profile={profile} setProfile={setProfile} token={token} />
        )}
      </main>
    </div>
  );
}

// ── Profile Editor ─────────────────────────────────────
function ProfileEditor({
  profile,
  setProfile,
  token,
}: {
  profile: any;
  setProfile: (p: any) => void;
  token: string;
}) {
  const [form, setForm] = useState({
    name: profile.name || "",
    bio: profile.bio || "",
    location: profile.location || "",
    workStyle: profile.workStyle || profile.work_style || "remote",
    salaryMin: profile.salaryMin || profile.salary_min || 0,
    salaryMax: profile.salaryMax || profile.salary_max || 0,
    githubUrl: profile.githubUrl || profile.github_url || "",
  });
  const [saved, setSaved] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const labelStyle: React.CSSProperties = {
    fontWeight: 600, fontSize: 13, color: "var(--text-secondary)",
    marginBottom: 4, display: "block",
  };

  async function saveProfile() {
    try {
      const updated = await api.updateProfile(token, form);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  async function addSkill(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !skillInput.trim()) return;
    const newSkills = [...(profile.skills || []), skillInput.trim()];
    try {
      await api.updateSkills(token, newSkills);
      setProfile({ ...profile, skills: newSkills });
      setSkillInput("");
    } catch (err) {
      console.error(err);
    }
  }

  async function removeSkill(skill: string) {
    const newSkills = (profile.skills || []).filter((s: string) => s !== skill);
    try {
      await api.updateSkills(token, newSkills);
      setProfile({ ...profile, skills: newSkills });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Profile</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
          Your skills and preferences power the job matching engine
        </p>
      </div>

      <div style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--glass-border)",
        padding: 32,
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              style={{ minHeight: 80, resize: "vertical" }}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Tampa, FL"
              />
            </div>
            <div>
              <label style={labelStyle}>Work Style</label>
              <select value={form.workStyle} onChange={(e) => setForm({ ...form, workStyle: e.target.value })}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Salary Min ($)</label>
              <input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>Salary Max ($)</label>
              <input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>GitHub URL</label>
            <input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder="https://github.com/username" />
          </div>

          <div>
            <label style={labelStyle}>Skills</label>
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={addSkill}
              placeholder="Type a skill and press Enter"
            />
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(profile.skills || []).map((s: string) => (
                <span
                  key={s}
                  onClick={() => removeSkill(s)}
                  style={{
                    cursor: "pointer", padding: "4px 12px",
                    background: "var(--accent-light)", color: "var(--accent-text)",
                    borderRadius: 20, fontSize: 13, fontWeight: 500,
                    border: "1px solid rgba(129, 140, 248, 0.1)",
                  }}
                >
                  {s} ×
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8 }}>
            <button
              onClick={saveProfile}
              style={{
                padding: "10px 28px",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "white", border: "none",
                borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
                boxShadow: "0 2px 16px rgba(129, 140, 248, 0.2)",
                fontFamily: "inherit",
              }}
            >
              Save Profile
            </button>
            {saved && <span style={{ color: "var(--success)", fontWeight: 500, fontSize: 14 }}>✓ Saved</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
