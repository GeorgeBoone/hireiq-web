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

// ── View types for simple client-side navigation ──────
type View =
  | { page: "jobs" }
  | { page: "job-detail"; job: Job }
  | { page: "job-add" }
  | { page: "job-edit"; job: Job }
  | { page: "profile" };

function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");

  // Navigation state
  const [view, setView] = useState<View>({ page: "jobs" });

  // ── Auth listener ────────────────────────────────────
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
      const data = await api.syncUser(t);
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
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

  // ── Loading state ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <p>Loading...</p>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────
  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        <h1>HireIQ</h1>
        <p style={{ color: "#6b7280" }}>Your AI-powered job search companion</p>
        <button
          onClick={handleSignIn}
          style={{
            marginTop: 20,
            padding: "12px 24px",
            fontSize: 16,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Sign in with Google
        </button>
        {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  // ── Signed in ────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>HireIQ</h1>
          {/* Tab navigation */}
          <nav style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setView({ page: "jobs" })}
              style={{
                padding: "6px 12px",
                background: view.page.startsWith("job") ? "#eff6ff" : "transparent",
                color: view.page.startsWith("job") ? "#2563eb" : "#6b7280",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: view.page.startsWith("job") ? 600 : 400,
              }}
            >
              Jobs
            </button>
            <button
              onClick={() => setView({ page: "profile" })}
              style={{
                padding: "6px 12px",
                background: view.page === "profile" ? "#eff6ff" : "transparent",
                color: view.page === "profile" ? "#2563eb" : "#6b7280",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: view.page === "profile" ? 600 : 400,
              }}
            >
              Profile
            </button>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>{user.displayName}</span>
          <button
            onClick={handleSignOut}
            style={{
              padding: "4px 12px",
              background: "none",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content area */}
      {view.page === "jobs" && (
        <JobList
          token={token}
          onSelectJob={(job) => setView({ page: "job-detail", job })}
          onAddJob={() => setView({ page: "job-add" })}
        />
      )}

      {view.page === "job-detail" && (
        <JobDetail
          job={view.job}
          onEdit={() => setView({ page: "job-edit", job: view.job })}
          onBack={() => setView({ page: "jobs" })}
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

      {view.page === "profile" && profile && (
        <ProfileEditor profile={profile} setProfile={setProfile} token={token} />
      )}
    </div>
  );
}

// ── Profile Editor (same as before) ────────────────────
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
    work_style: profile.work_style || "remote",
    salary_min: profile.salary_min || 0,
    salary_max: profile.salary_max || 0,
    github_url: profile.github_url || "",
  });
  const [saved, setSaved] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box" as const,
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
    <div>
      <h2>Profile</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Name</label>
          <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Bio</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Location</label>
            <input
              style={inputStyle}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Work Style</label>
            <select
              style={inputStyle}
              value={form.work_style}
              onChange={(e) => setForm({ ...form, work_style: e.target.value })}
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Salary Min</label>
            <input
              style={inputStyle}
              type="number"
              value={form.salary_min}
              onChange={(e) => setForm({ ...form, salary_min: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Salary Max</label>
            <input
              style={inputStyle}
              type="number"
              value={form.salary_max}
              onChange={(e) => setForm({ ...form, salary_max: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: 13 }}>GitHub URL</label>
          <input
            style={inputStyle}
            value={form.github_url}
            onChange={(e) => setForm({ ...form, github_url: e.target.value })}
          />
        </div>

        {/* Skills */}
        <div>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Skills</label>
          <input
            style={inputStyle}
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={addSkill}
            placeholder="Type a skill and press Enter"
          />
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(profile.skills || []).map((s: string) => (
              <span
                key={s}
                onClick={() => removeSkill(s)}
                style={{
                  cursor: "pointer",
                  padding: "2px 8px",
                  background: "#e0e0e0",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {s} ×
              </span>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={saveProfile}
            style={{
              padding: "10px 24px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Save Profile
          </button>
          {saved && <span style={{ color: "green", marginLeft: 10 }}>✓ Saved</span>}
        </div>
      </div>
    </div>
  );
}

export default App;
