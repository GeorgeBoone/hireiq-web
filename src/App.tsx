import { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const API_URL = "http://localhost:8080";


interface Profile {
  id: string;
  email: string;
  name: string;
  bio: string;
  location: string;
  workStyle: string;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  githubUrl: string;
  createdAt: string;
  updatedAt: string;
}

function ProfileEditor({ profile, user, onUpdate }: {
  profile: Profile;
  user: User;
  onUpdate: (p: Profile) => void;
}) {
  const [form, setForm] = useState<Profile>({ ...profile });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  // Reset form when profile changes externally
  useEffect(() => {
    setForm({ ...profile });
  }, [profile]);

  const updateField = (key: keyof Profile, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
    setSaving(false);
  };

  const addSkill = async () => {
    if (!newSkill.trim() || form.skills.includes(newSkill.trim())) return;
    const updatedSkills = [...form.skills, newSkill.trim()];
    setForm(prev => ({ ...prev, skills: updatedSkills }));
    setNewSkill("");
    setSaved(false);

    // Save skills immediately
    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/profile/skills`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skills: updatedSkills }),
      });
    } catch (err) {
      console.error("Skill save error:", err);
    }
  };

  const removeSkill = async (skill: string) => {
    const updatedSkills = form.skills.filter(s => s !== skill);
    setForm(prev => ({ ...prev, skills: updatedSkills }));

    try {
      const token = await user.getIdToken();
      await fetch(`${API_URL}/profile/skills`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skills: updatedSkills }),
      });
    } catch (err) {
      console.error("Skill remove error:", err);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.8)",
    fontSize: 13,
    color: "#1e293b",
    fontFamily: "inherit",
    outline: "none",
  };

  const labelStyle = {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 600 as const,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    display: "block",
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.8)",
      borderRadius: 20,
      padding: "28px 32px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      border: "1px solid rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Profile</h2>
        <button onClick={handleSave} disabled={saving} style={{
          padding: "10px 24px",
          borderRadius: 10,
          border: "none",
          background: saved ? "#16a34a" : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
          transition: "all 0.2s ease",
        }}>
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Profile"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            value={form.name}
            onChange={e => updateField("name", e.target.value)}
            placeholder="Your name"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input value={form.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <input
            value={form.location}
            onChange={e => updateField("location", e.target.value)}
            placeholder="e.g. San Francisco, CA"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Work Style</label>
          <select
            value={form.workStyle}
            onChange={e => updateField("workStyle", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">Select...</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Salary Min ($)</label>
          <input
            type="number"
            value={form.salaryMin || ""}
            onChange={e => updateField("salaryMin", parseInt(e.target.value) || 0)}
            placeholder="120000"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Salary Max ($)</label>
          <input
            type="number"
            value={form.salaryMax || ""}
            onChange={e => updateField("salaryMax", parseInt(e.target.value) || 0)}
            placeholder="180000"
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={form.bio}
            onChange={e => updateField("bio", e.target.value)}
            placeholder="Tell us about yourself and what you're looking for..."
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>GitHub URL</label>
          <input
            value={form.githubUrl}
            onChange={e => updateField("githubUrl", e.target.value)}
            placeholder="https://github.com/yourusername"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Skills */}
      <div>
        <label style={labelStyle}>Skills</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {form.skills.map(skill => (
            <span key={skill} style={{
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              background: "rgba(79,70,229,0.08)",
              color: "#4f46e5",
              border: "1px solid rgba(79,70,229,0.15)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}>
              {skill}
              <span onClick={() => removeSkill(skill)} style={{
                cursor: "pointer",
                opacity: 0.5,
                fontSize: 14,
                lineHeight: 1,
              }}>×</span>
            </span>
          ))}
          {form.skills.length === 0 && (
            <span style={{ fontSize: 12, color: "#94a3b8" }}>No skills added yet</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addSkill(); }}
            placeholder="Add a skill (press Enter)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addSkill} style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: newSkill.trim() ? "rgba(79,70,229,0.1)" : "rgba(0,0,0,0.02)",
            color: newSkill.trim() ? "#4f46e5" : "#94a3b8",
            fontSize: 12,
            fontWeight: 600,
            cursor: newSkill.trim() ? "pointer" : "default",
          }}>Add</button>
        </div>
      </div>

      {/* Meta info */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.04)", display: "flex", gap: 24 }}>
        <div style={{ fontSize: 11, color: "#cbd5e1" }}>ID: {profile.id}</div>
        <div style={{ fontSize: 11, color: "#cbd5e1" }}>Joined: {new Date(profile.createdAt).toLocaleDateString()}</div>
      </div>
    </div>
  );
}


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes (persists across refreshes)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncWithBackend(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Firebase user with our Go backend
  const syncWithBackend = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: firebaseUser.displayName || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync with backend");
      }

      const data = await response.json();
      setProfile(data);
      setError(null);
    } catch (err) {
      console.error("Backend sync error:", err);
      setError("Connected to Google but couldn't reach the server. Is it running?");
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Sign in was cancelled or failed. Try again.");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setProfile(null);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8f9fc, #eef1f8)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <p style={{ color: "#64748b", fontSize: 16 }}>Loading...</p>
      </div>
    );
  }

  // Signed out — show login
  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8f9fc, #eef1f8, #f3eef8)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.8)",
          borderRadius: 24,
          padding: "48px 40px",
          textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
          maxWidth: 400,
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 8,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>HireIQ</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>
            Your job search command center
          </p>

          {error && (
            <div style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(220,38,38,0.06)",
              color: "#dc2626",
              fontSize: 12,
              marginBottom: 20,
              border: "1px solid rgba(220,38,38,0.1)",
            }}>{error}</div>
          )}

          <button onClick={handleSignIn} style={{
            width: "100%",
            padding: "14px 24px",
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(79,70,229,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  
 // Signed in — show dashboard
 return (
  <div style={{
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8f9fc, #eef1f8, #f3eef8)",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 32,
  }}>
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.8)",
        borderRadius: 20,
        padding: "24px 32px",
        marginBottom: 24,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 4,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>HireIQ</h1>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Welcome, {user.displayName || user.email}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user.photoURL && (
            <img src={user.photoURL} alt="" style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "2px solid rgba(79,70,229,0.2)",
            }} />
          )}
          <button onClick={handleSignOut} style={{
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.8)",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}>Sign Out</button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "12px 20px",
          borderRadius: 12,
          background: "rgba(220,38,38,0.06)",
          color: "#dc2626",
          fontSize: 13,
          marginBottom: 20,
          border: "1px solid rgba(220,38,38,0.1)",
        }}>{error}</div>
      )}

      {/* Profile Editor */}
      {profile && (
        <ProfileEditor
          profile={profile}
          user={user}
          onUpdate={setProfile}
        />
      )}
    </div>
  </div>
);
}

export default App;