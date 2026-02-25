import { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const API_URL = "http://localhost:8080";

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

        {/* Profile Card */}
        <div style={{
          background: "rgba(255,255,255,0.8)",
          borderRadius: 20,
          padding: "24px 32px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Your Profile
          </h2>
          {profile ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Name", value: profile.name },
                { label: "Email", value: profile.email },
                { label: "User ID", value: profile.id },
                { label: "Created", value: new Date(profile.createdAt).toLocaleDateString() },
              ].map((field) => (
                <div key={field.label}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {field.label}
                  </div>
                  <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 500 }}>
                    {field.value || "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>
              Could not load profile from server.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;