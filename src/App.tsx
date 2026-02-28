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
import Network from "./Network";
import HireIQLogo from "./HireIQLogo";

type View =
  | { page: "jobs" }
  | { page: "discover" }
  | { page: "job-detail"; job: Job }
  | { page: "job-add" }
  | { page: "job-edit"; job: Job }
  | { page: "resume"; preselectedJobId?: string }
  | { page: "network" }
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
          <div style={{ margin: "0 auto 12px", width: 48 }}>
            <HireIQLogo size={48} />
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
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-deep)",
      }}>
        {/* ── Left Panel: Brand ────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #1e1145 0%, #2a1463 30%, #3b1d8e 60%, #4f46e5 100%)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Ambient glow orbs */}
          <div style={{
            position: "absolute",
            top: "15%",
            left: "20%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(129, 140, 248, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            bottom: "10%",
            right: "15%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Logo */}
          <div style={{
            marginBottom: 32,
            position: "relative",
            zIndex: 1,
            filter: "drop-shadow(0 8px 40px rgba(79, 70, 229, 0.35))",
          }}>
            <HireIQLogo size={120} color="rgba(255, 255, 255, 0.85)" />
          </div>

          {/* Brand text */}
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-1px",
            marginBottom: 8,
            position: "relative",
            zIndex: 1,
          }}>
            HireIQ
          </div>
          <div style={{
            fontSize: 16,
            color: "rgba(255, 255, 255, 0.55)",
            fontWeight: 500,
            position: "relative",
            zIndex: 1,
          }}>
            You bring the talent. We bring the intel.
          </div>
        </div>

        {/* ── Right Panel: Sign In Form ────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 60px",
          position: "relative",
        }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            {/* Header */}
            <div style={{ marginBottom: 40 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 32,
              }}>
                <HireIQLogo size={36} />
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.3px",
                }}>
                  HireIQ
                </span>
              </div>

              <h1 style={{
                fontSize: 26,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 8,
                letterSpacing: "-0.5px",
              }}>
                Welcome back
              </h1>
              <p style={{
                color: "var(--text-muted)",
                fontSize: 15,
              }}>
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleSignIn}
              style={{
                width: "100%",
                padding: "13px 24px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "rgba(200, 210, 240, 0.06)",
                color: "var(--text-primary)",
                border: "1px solid rgba(150, 170, 220, 0.12)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: 20,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77z" transform="translate(0.84, 0)"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(150, 170, 220, 0.08)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(150, 170, 220, 0.08)" }} />
            </div>

            {/* Email/password fields (visual, disabled) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <input
                placeholder="Email address"
                disabled
                style={{
                  opacity: 0.4,
                  cursor: "not-allowed",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                disabled
                style={{
                  opacity: 0.4,
                  cursor: "not-allowed",
                }}
              />
              <button
                disabled
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  background: "linear-gradient(135deg, #818cf8, #6366f1)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  opacity: 0.3,
                  cursor: "not-allowed",
                }}
              >
                Sign in
              </button>
              <p style={{
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
              }}>
                Email sign-in coming soon
              </p>
            </div>

            {error && (
              <div style={{
                padding: "10px 16px",
                background: "rgba(248, 113, 113, 0.08)",
                border: "1px solid rgba(248, 113, 113, 0.15)",
                borderRadius: "var(--radius-sm)",
                color: "var(--danger)",
                fontSize: 13,
                textAlign: "center",
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            position: "absolute",
            bottom: 32,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-muted)",
          }}>
            © 2026 HireIQ. All rights reserved.
          </div>
        </div>
      </div>
    );
  }

  // ── Tab styling ─────────────────────────────────────
  const isActive = (check: string) => {
    if (check === "tracker") return view.page.startsWith("job") || view.page === "compare";
    if (check === "resume") return view.page === "resume";
    if (check === "network") return view.page === "network";
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
              style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
            >
              <HireIQLogo size={30} />
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
              <button onClick={() => setView({ page: "network" })} style={tabStyle("network")}>Network</button>
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

        {view.page === "network" && (
          <Network
            token={token}
            onViewJob={(job) => setView({ page: "job-detail", job })}
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
