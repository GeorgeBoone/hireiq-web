// src/App.tsx
import { useState, useEffect, useRef } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import * as api from "./api";
import type { Job, Subscription, Experience, Education, Certification, Language, Volunteer, ParsedProfile } from "./api";
import JobList from "./JobList";
import JobForm from "./JobForm";
import JobDetail from "./JobDetail";
import Discover, { feedJobToJob } from "./Discover";
import JobCompare from "./JobCompare";
import ResumeCritique from "./ResumeCritique";
import Network from "./Network";
import HireIQLogo from "./HireIQLogo";
import LandingPage from "./LandingPage";

type View =
  | { page: "jobs" }
  | { page: "discover" }
  | { page: "job-detail"; job: Job }
  | { page: "job-add" }
  | { page: "job-edit"; job: Job }
  | { page: "resume"; preselectedJobId?: string }
  | { page: "network" }
  | { page: "profile" }
  | { page: "compare"; jobs: Job[]; source?: "tracker" | "discover"; feedJobIds?: string[] };

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<api.Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [view, setView] = useState<View>({ page: "discover" });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

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
      // Then fetch the full profile and subscription in parallel
      const [p, sub] = await Promise.all([
        api.getProfile(t),
        api.getSubscription(t).catch(() => ({ plan: "free", status: "active" } as Subscription)),
      ]);
      setProfile(p);
      setSubscription(sub);

      // Handle checkout success redirect
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        setCheckoutSuccess(true);
        // Refetch subscription (may take a moment for webhook to process)
        setTimeout(async () => {
          try {
            const freshSub = await api.getSubscription(t);
            setSubscription(freshSub);
          } catch {}
        }, 2000);
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
        // Auto-hide success message
        setTimeout(() => setCheckoutSuccess(false), 5000);
      }
    } catch (err) {
      console.error("Backend sync failed:", err instanceof Error ? err.message : err);
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
      setSubscription({ plan: "free", status: "active" });
    }
  }

  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  // After auth completes, if user selected a paid tier from landing page, auto-redirect to checkout
  useEffect(() => {
    if (pendingPlan && token && subscription?.plan === "free") {
      setPendingPlan(null);
      api.createCheckoutSession(token, pendingPlan, "month")
        .then(({ url }) => { window.location.href = url; })
        .catch((err) => console.error("Auto-checkout failed:", err instanceof Error ? err.message : err));
    }
  }, [pendingPlan, token, subscription]);

  async function handleSignIn(selectedPlan?: string) {
    try {
      // Store the selected plan so we can redirect to checkout after auth
      if (selectedPlan && selectedPlan !== "free" && selectedPlan !== "enterprise") {
        setPendingPlan(selectedPlan);
      }
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPendingPlan(null);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setProfile(null);
    setSubscription(null);
    setView({ page: "jobs" });
  }

  async function handleUpgrade(plan: string, interval: string) {
    if (!token) return;
    try {
      const { url } = await api.createCheckoutSession(token, plan, interval);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err instanceof Error ? err.message : err);
    }
  }

  async function handleManageBilling() {
    if (!token) return;
    try {
      const { url } = await api.createPortalSession(token);
      window.location.href = url;
    } catch (err) {
      console.error("Portal failed:", err instanceof Error ? err.message : err);
    }
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

  // ── Sign Up / Sign In (Landing Page) ─────────────────
  if (!user) {
    return <LandingPage onSignIn={handleSignIn} error={error} />;
  }

  // ── Tab styling ─────────────────────────────────────
  const isActive = (check: string) => {
    if (check === "discover") return view.page === "discover" || (view.page === "compare" && view.source === "discover");
    if (check === "tracker") return view.page.startsWith("job") || (view.page === "compare" && view.source !== "discover");
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
        {/* Checkout success banner */}
        {checkoutSuccess && (
          <div style={{
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ color: "#22c55e", fontWeight: 600, fontSize: 14 }}>
              Welcome to {subscription?.plan === "pro_plus" ? "Pro+" : "Pro"}! Your subscription is now active.
            </span>
          </div>
        )}
        {view.page === "jobs" && (
          <JobList
            token={token}
            onSelectJob={(job) => setView({ page: "job-detail", job })}
            onAddJob={() => setView({ page: "job-add" })}
            onCompare={(jobs) => setView({ page: "compare", jobs })}
          />
        )}

        {view.page === "discover" && (
          <Discover
            token={token}
            onSelectJob={(job) => setView({ page: "job-detail", job })}
            onCompare={(feedJobs) => setView({
              page: "compare",
              jobs: feedJobs.map(feedJobToJob),
              source: "discover",
              feedJobIds: feedJobs.map((fj) => fj.id),
            })}
          />
        )}

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
            onBack={() => setView({ page: view.source === "discover" ? "discover" : "jobs" })}
            compareFn={view.feedJobIds
              ? (t, _ids) => api.compareFeedJobs(t, view.feedJobIds!)
              : undefined}
            backLabel={view.source === "discover" ? "Discover" : "Tracker"}
          />
        )}

        {view.page === "network" && (
          <Network
            token={token}
            onViewJob={(job) => setView({ page: "job-detail", job })}
          />
        )}

        {view.page === "profile" && profile && (
          <ProfileEditor
            profile={profile}
            setProfile={setProfile}
            token={token}
            subscription={subscription}
            onUpgrade={handleUpgrade}
            onManageBilling={handleManageBilling}
          />
        )}
      </main>
    </div>
  );
}

// ── Profile Editor ─────────────────────────────────────

const EMPTY_EXPERIENCE: Experience = { title: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
const EMPTY_EDUCATION: Education = { school: "", degree: "", field: "", startDate: "", endDate: "" };
const EMPTY_CERTIFICATION: Certification = { name: "", issuer: "", dateObtained: "", expiryDate: "", credentialId: "" };
const EMPTY_LANGUAGE: Language = { language: "", proficiency: "conversational" };
const EMPTY_VOLUNTEER: Volunteer = { organization: "", role: "", startDate: "", endDate: "", description: "" };

const PROFICIENCY_OPTIONS = ["native", "fluent", "conversational", "basic"];

function ProfileEditor({
  profile,
  setProfile,
  token,
  subscription,
  onUpgrade,
  onManageBilling,
}: {
  profile: api.Profile;
  setProfile: (p: api.Profile) => void;
  token: string;
  subscription: Subscription | null;
  onUpgrade: (plan: string, interval: string) => void;
  onManageBilling: () => void;
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

  // Target roles
  const [targetRoles, setTargetRoles] = useState<string[]>(profile.targetRoles || []);
  const [roleInput, setRoleInput] = useState("");
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<string[]>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Fetch role suggestions once
  useEffect(() => {
    api.getRoleSuggestions(token).then((r) => setRoleSuggestions(r.roles || [])).catch(() => {});
  }, [token]);

  // Filter suggestions as user types
  useEffect(() => {
    if (!roleInput.trim()) {
      setFilteredRoles([]);
      return;
    }
    const q = roleInput.toLowerCase();
    const existing = new Set(targetRoles.map((r) => r.toLowerCase()));
    const matches = roleSuggestions
      .filter((r) => r.toLowerCase().includes(q) && !existing.has(r.toLowerCase()))
      .slice(0, 8);
    setFilteredRoles(matches);
  }, [roleInput, roleSuggestions, targetRoles]);

  // New profile sections
  const [experience, setExperience] = useState<Experience[]>(profile.experience || []);
  const [education, setEducation] = useState<Education[]>(profile.education || []);
  const [certifications, setCertifications] = useState<Certification[]>(profile.certifications || []);
  const [languages, setLanguages] = useState<Language[]>(profile.languages || []);
  const [volunteer, setVolunteer] = useState<Volunteer[]>(profile.volunteer || []);

  // Section add forms
  const [addingExp, setAddingExp] = useState(false);
  const [expForm, setExpForm] = useState<Experience>(EMPTY_EXPERIENCE);
  const [addingEdu, setAddingEdu] = useState(false);
  const [eduForm, setEduForm] = useState<Education>(EMPTY_EDUCATION);
  const [addingCert, setAddingCert] = useState(false);
  const [certForm, setCertForm] = useState<Certification>(EMPTY_CERTIFICATION);
  const [addingLang, setAddingLang] = useState(false);
  const [langForm, setLangForm] = useState<Language>(EMPTY_LANGUAGE);
  const [addingVol, setAddingVol] = useState(false);
  const [volForm, setVolForm] = useState<Volunteer>(EMPTY_VOLUNTEER);

  // Resume auto-fill
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillResult, setAutoFillResult] = useState<ParsedProfile | null>(null);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);

  const labelStyle: React.CSSProperties = {
    fontWeight: 600, fontSize: 13, color: "var(--text-secondary)",
    marginBottom: 4, display: "block",
  };

  const sectionHeader: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: "var(--text-primary)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--glass-border)",
    padding: 24,
    boxShadow: "var(--shadow-sm)",
    marginBottom: 16,
  };

  const addBtnStyle: React.CSSProperties = {
    padding: "5px 14px", background: "rgba(255,255,255,0.04)",
    color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: 12,
    fontFamily: "inherit", cursor: "pointer",
  };

  const entryCard: React.CSSProperties = {
    padding: 16, background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: "var(--radius-sm)",
    marginTop: 10,
  };

  async function saveProfile() {
    try {
      const updated = await api.updateProfile(token, {
        ...form,
        targetRoles,
        experience,
        education,
        certifications,
        languages,
        volunteer,
      });
      // Also save skills
      await api.updateSkills(token, profile.skills || []);
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

  function addRole(role: string) {
    const trimmed = role.trim();
    if (!trimmed || targetRoles.length >= 3) return;
    const existing = new Set(targetRoles.map((r) => r.toLowerCase()));
    if (existing.has(trimmed.toLowerCase())) return;
    setTargetRoles([...targetRoles, trimmed]);
    setRoleInput("");
    setShowRoleDropdown(false);
  }

  function removeRole(role: string) {
    setTargetRoles(targetRoles.filter((r) => r !== role));
  }

  function handleRoleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredRoles.length > 0) {
        addRole(filteredRoles[0]);
      } else if (roleInput.trim()) {
        addRole(roleInput);
      }
    }
    if (e.key === "Escape") {
      setShowRoleDropdown(false);
    }
  }

  // Resume auto-fill
  async function handleResumeAutoFill(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAutoFilling(true);
    setAutoFillError(null);
    setAutoFillResult(null);
    try {
      // Step 1: Upload PDF to extract text
      const { text } = await api.uploadResume(token, file);
      // Step 2: Parse resume text into profile structure
      const parsed = await api.parseResumeToProfile(token, text);
      setAutoFillResult(parsed);
    } catch (err) {
      setAutoFillError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutoFilling(false);
    }
  }

  function applyAutoFill() {
    if (!autoFillResult) return;
    const r = autoFillResult;
    // Merge basics — only fill empty fields
    setForm((prev) => ({
      name: prev.name || r.name || "",
      bio: prev.bio || r.bio || "",
      location: prev.location || r.location || "",
      workStyle: prev.workStyle,
      salaryMin: prev.salaryMin,
      salaryMax: prev.salaryMax,
      githubUrl: prev.githubUrl,
    }));
    // Merge skills — add new ones
    if (r.skills?.length) {
      const existing = new Set((profile.skills || []).map((s: string) => s.toLowerCase()));
      const newSkills = r.skills.filter((s) => !existing.has(s.toLowerCase()));
      if (newSkills.length) {
        const merged = [...(profile.skills || []), ...newSkills];
        setProfile({ ...profile, skills: merged });
        api.updateSkills(token, merged).catch(console.error);
      }
    }
    // Append to array sections
    if (r.experience?.length) setExperience((prev) => [...prev, ...r.experience!]);
    if (r.education?.length) setEducation((prev) => [...prev, ...r.education!]);
    if (r.certifications?.length) setCertifications((prev) => [...prev, ...r.certifications!]);
    if (r.languages?.length) setLanguages((prev) => [...prev, ...r.languages!]);
    if (r.volunteer?.length) setVolunteer((prev) => [...prev, ...r.volunteer!]);
    setAutoFillResult(null);
  }

  function removeEntry<T>(arr: T[], idx: number, setter: React.Dispatch<React.SetStateAction<T[]>>) {
    setter(arr.filter((_, i) => i !== idx));
  }

  const planLabel = subscription?.plan === "pro_plus" ? "Pro+" : subscription?.plan === "pro" ? "Pro" : "Free";
  const isPaid = subscription?.plan === "pro" || subscription?.plan === "pro_plus";
  const planColor = subscription?.plan === "pro_plus" ? "#c084fc" : subscription?.plan === "pro" ? "#818cf8" : "#9ca3af";

  return (
    <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Profile</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            Your skills and preferences power the job matching engine
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => resumeInputRef.current?.click()}
            disabled={autoFilling}
            style={{
              padding: "8px 18px",
              background: autoFilling ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #22c55e, #16a34a)",
              color: autoFilling ? "var(--text-muted)" : "white",
              border: "none", borderRadius: "var(--radius-sm)",
              fontWeight: 600, fontSize: 13, fontFamily: "inherit",
              cursor: autoFilling ? "wait" : "pointer",
              boxShadow: autoFilling ? "none" : "0 2px 12px rgba(34, 197, 94, 0.2)",
            }}
          >
            {autoFilling ? "Parsing Resume..." : "Auto-Fill from Resume"}
          </button>
          <input ref={resumeInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleResumeAutoFill} />
        </div>
      </div>

      {/* Auto-fill error */}
      {autoFillError && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: "12px 16px", border: "1px solid rgba(239, 68, 68, 0.15)", background: "rgba(239, 68, 68, 0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--danger)", fontSize: 13 }}>{autoFillError}</span>
            <button onClick={() => setAutoFillError(null)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>&times;</button>
          </div>
        </div>
      )}

      {/* Auto-fill preview */}
      {autoFillResult && (
        <div style={{ ...cardStyle, marginBottom: 16, border: "1px solid rgba(34, 197, 94, 0.2)", background: "rgba(34, 197, 94, 0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#22c55e", marginBottom: 8 }}>Resume Parsed Successfully</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Found: {autoFillResult.experience?.length || 0} experience entries,{" "}
            {autoFillResult.education?.length || 0} education,{" "}
            {autoFillResult.certifications?.length || 0} certifications,{" "}
            {autoFillResult.skills?.length || 0} skills,{" "}
            {autoFillResult.languages?.length || 0} languages
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={applyAutoFill}
              style={{
                padding: "7px 18px", background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "white", border: "none", borderRadius: "var(--radius-sm)",
                fontWeight: 600, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Apply to Profile
            </button>
            <button
              onClick={() => setAutoFillResult(null)}
              style={{ ...addBtnStyle }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Subscription Card ──────────────────── */}
      <div style={{ ...cardStyle }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Plan</span>
            <span style={{
              padding: "3px 12px", background: `${planColor}20`, color: planColor,
              borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${planColor}30`,
            }}>
              {planLabel}
            </span>
            {subscription?.cancelAtPeriodEnd && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Cancels {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "at period end"}
              </span>
            )}
            {isPaid && subscription?.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isPaid ? (
              <button onClick={onManageBilling} style={{ ...addBtnStyle, padding: "7px 18px" }}>Manage Billing</button>
            ) : (
              <button onClick={() => onUpgrade("pro", "month")} style={{
                padding: "7px 18px", background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "white", border: "none", borderRadius: "var(--radius-sm)",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                boxShadow: "0 2px 12px rgba(129, 140, 248, 0.2)",
              }}>
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Basics ──────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ ...sectionHeader, marginBottom: 16 }}>Basics</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea style={{ minHeight: 80, resize: "vertical" }} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Tampa, FL" />
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
        </div>
      </div>

      {/* ── Target Roles ──────────────────────────── */}
      <div style={{ ...cardStyle, border: "1px solid rgba(129, 140, 248, 0.15)", background: "rgba(129, 140, 248, 0.03)" }}>
        <div style={{ ...sectionHeader, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Target Roles</span>
            <span style={{
              padding: "2px 8px", background: "rgba(129, 140, 248, 0.12)",
              color: "#818cf8", borderRadius: 12, fontSize: 10, fontWeight: 700,
              letterSpacing: 0.5, textTransform: "uppercase",
            }}>Primary</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>
            {targetRoles.length}/3
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2, marginBottom: 12 }}>
          What roles are you targeting? These drive your Discover feed.
        </p>

        {/* Selected roles */}
        {targetRoles.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {targetRoles.map((role) => (
              <span key={role} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", background: "rgba(129, 140, 248, 0.1)",
                color: "#a5b4fc", borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: "1px solid rgba(129, 140, 248, 0.2)",
              }}>
                {role}
                <button onClick={() => removeRole(role)} style={{
                  background: "none", border: "none", color: "#818cf8",
                  cursor: "pointer", fontSize: 15, padding: 0, lineHeight: 1,
                  fontFamily: "inherit",
                }}>&times;</button>
              </span>
            ))}
          </div>
        )}

        {/* Typeahead input */}
        {targetRoles.length < 3 && (
          <div style={{ position: "relative" }}>
            <input
              ref={roleInputRef}
              value={roleInput}
              onChange={(e) => { setRoleInput(e.target.value); setShowRoleDropdown(true); }}
              onFocus={() => setShowRoleDropdown(true)}
              onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
              onKeyDown={handleRoleKeyDown}
              placeholder={targetRoles.length === 0 ? "e.g. Senior Software Engineer" : "Add another role..."}
              style={{
                borderColor: "rgba(129, 140, 248, 0.2)",
                background: "rgba(129, 140, 248, 0.04)",
              }}
            />
            {/* Dropdown */}
            {showRoleDropdown && filteredRoles.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                marginTop: 4, background: "var(--bg-surface)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 50, maxHeight: 240, overflow: "auto",
              }}>
                {filteredRoles.map((role) => (
                  <div
                    key={role}
                    onMouseDown={(e) => { e.preventDefault(); addRole(role); }}
                    style={{
                      padding: "10px 14px", cursor: "pointer",
                      fontSize: 13, color: "var(--text-primary)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(129, 140, 248, 0.08)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
                  >
                    {role}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {targetRoles.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8, fontStyle: "italic" }}>
            Adding target roles significantly improves job matching accuracy
          </p>
        )}
      </div>

      {/* ── Skills ──────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ ...sectionHeader, marginBottom: 12 }}>Skills</div>
        <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={addSkill} placeholder="Type a skill and press Enter" />
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(profile.skills || []).map((s: string) => (
            <span key={s} onClick={() => removeSkill(s)} style={{
              cursor: "pointer", padding: "4px 12px",
              background: "var(--accent-light)", color: "var(--accent-text)",
              borderRadius: 20, fontSize: 13, fontWeight: 500,
              border: "1px solid rgba(129, 140, 248, 0.1)",
            }}>
              {s} &times;
            </span>
          ))}
        </div>
      </div>

      {/* ── Experience ──────────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionHeader}>
          <span>Experience</span>
          {!addingExp && <button onClick={() => setAddingExp(true)} style={addBtnStyle}>+ Add</button>}
        </div>
        {addingExp && (
          <div style={{ ...entryCard, border: "1px solid rgba(129, 140, 248, 0.15)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Title *</label><input value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} /></div>
              <div><label style={labelStyle}>Company *</label><input value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} /></div>
              <div><label style={labelStyle}>Location</label><input value={expForm.location} onChange={(e) => setExpForm({ ...expForm, location: e.target.value })} /></div>
              <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Start</label><input type="month" value={expForm.startDate} onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>End</label><input type="month" value={expForm.endDate} disabled={expForm.current} onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })} /></div>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={expForm.current} onChange={(e) => setExpForm({ ...expForm, current: e.target.checked, endDate: e.target.checked ? "" : expForm.endDate })} />
              Current position
            </label>
            <div style={{ marginTop: 8 }}><label style={labelStyle}>Description</label><textarea style={{ minHeight: 60, resize: "vertical" }} value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="Key responsibilities and achievements" /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button disabled={!expForm.title || !expForm.company} onClick={() => { setExperience([...experience, expForm]); setExpForm(EMPTY_EXPERIENCE); setAddingExp(false); }} style={{ ...addBtnStyle, background: "rgba(129, 140, 248, 0.1)", color: "#818cf8", border: "1px solid rgba(129, 140, 248, 0.2)" }}>Save</button>
              <button onClick={() => { setExpForm(EMPTY_EXPERIENCE); setAddingExp(false); }} style={addBtnStyle}>Cancel</button>
            </div>
          </div>
        )}
        {experience.map((exp, i) => (
          <div key={i} style={entryCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{exp.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{exp.company}{exp.location ? ` \u00b7 ${exp.location}` : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {exp.startDate}{" \u2013 "}{exp.current ? "Present" : exp.endDate}
                </div>
                {exp.description && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, whiteSpace: "pre-line" }}>{exp.description}</div>}
              </div>
              <button onClick={() => removeEntry(experience, i, setExperience)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>&times;</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Education ──────────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionHeader}>
          <span>Education</span>
          {!addingEdu && <button onClick={() => setAddingEdu(true)} style={addBtnStyle}>+ Add</button>}
        </div>
        {addingEdu && (
          <div style={{ ...entryCard, border: "1px solid rgba(129, 140, 248, 0.15)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>School *</label><input value={eduForm.school} onChange={(e) => setEduForm({ ...eduForm, school: e.target.value })} /></div>
              <div><label style={labelStyle}>Degree</label><input value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} placeholder="B.S., M.S., Ph.D." /></div>
              <div><label style={labelStyle}>Field of Study</label><input value={eduForm.field} onChange={(e) => setEduForm({ ...eduForm, field: e.target.value })} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Start</label><input value={eduForm.startDate} onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })} placeholder="2014" /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>End</label><input value={eduForm.endDate} onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })} placeholder="2018" /></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button disabled={!eduForm.school} onClick={() => { setEducation([...education, eduForm]); setEduForm(EMPTY_EDUCATION); setAddingEdu(false); }} style={{ ...addBtnStyle, background: "rgba(129, 140, 248, 0.1)", color: "#818cf8", border: "1px solid rgba(129, 140, 248, 0.2)" }}>Save</button>
              <button onClick={() => { setEduForm(EMPTY_EDUCATION); setAddingEdu(false); }} style={addBtnStyle}>Cancel</button>
            </div>
          </div>
        )}
        {education.map((edu, i) => (
          <div key={i} style={entryCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{edu.degree ? `${edu.degree} ${edu.field}` : edu.field || edu.school}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{edu.school}</div>
                {(edu.startDate || edu.endDate) && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{edu.startDate}{edu.endDate ? ` \u2013 ${edu.endDate}` : ""}</div>}
              </div>
              <button onClick={() => removeEntry(education, i, setEducation)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>&times;</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Certifications ──────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionHeader}>
          <span>Certifications & Licenses</span>
          {!addingCert && <button onClick={() => setAddingCert(true)} style={addBtnStyle}>+ Add</button>}
        </div>
        {addingCert && (
          <div style={{ ...entryCard, border: "1px solid rgba(129, 140, 248, 0.15)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Name *</label><input value={certForm.name} onChange={(e) => setCertForm({ ...certForm, name: e.target.value })} /></div>
              <div><label style={labelStyle}>Issuer</label><input value={certForm.issuer} onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })} /></div>
              <div><label style={labelStyle}>Date Obtained</label><input type="month" value={certForm.dateObtained} onChange={(e) => setCertForm({ ...certForm, dateObtained: e.target.value })} /></div>
              <div><label style={labelStyle}>Expiry Date</label><input type="month" value={certForm.expiryDate || ""} onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 8 }}><label style={labelStyle}>Credential ID</label><input value={certForm.credentialId || ""} onChange={(e) => setCertForm({ ...certForm, credentialId: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button disabled={!certForm.name} onClick={() => { setCertifications([...certifications, certForm]); setCertForm(EMPTY_CERTIFICATION); setAddingCert(false); }} style={{ ...addBtnStyle, background: "rgba(129, 140, 248, 0.1)", color: "#818cf8", border: "1px solid rgba(129, 140, 248, 0.2)" }}>Save</button>
              <button onClick={() => { setCertForm(EMPTY_CERTIFICATION); setAddingCert(false); }} style={addBtnStyle}>Cancel</button>
            </div>
          </div>
        )}
        {certifications.map((cert, i) => (
          <div key={i} style={entryCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{cert.name}</div>
                {cert.issuer && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{cert.issuer}</div>}
                {cert.dateObtained && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{cert.dateObtained}{cert.expiryDate ? ` \u2013 ${cert.expiryDate}` : ""}</div>}
              </div>
              <button onClick={() => removeEntry(certifications, i, setCertifications)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>&times;</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Languages ──────────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionHeader}>
          <span>Languages</span>
          {!addingLang && <button onClick={() => setAddingLang(true)} style={addBtnStyle}>+ Add</button>}
        </div>
        {addingLang && (
          <div style={{ ...entryCard, border: "1px solid rgba(129, 140, 248, 0.15)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Language *</label><input value={langForm.language} onChange={(e) => setLangForm({ ...langForm, language: e.target.value })} /></div>
              <div><label style={labelStyle}>Proficiency</label>
                <select value={langForm.proficiency} onChange={(e) => setLangForm({ ...langForm, proficiency: e.target.value })}>
                  {PROFICIENCY_OPTIONS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button disabled={!langForm.language} onClick={() => { setLanguages([...languages, langForm]); setLangForm(EMPTY_LANGUAGE); setAddingLang(false); }} style={{ ...addBtnStyle, background: "rgba(129, 140, 248, 0.1)", color: "#818cf8", border: "1px solid rgba(129, 140, 248, 0.2)" }}>Save</button>
              <button onClick={() => { setLangForm(EMPTY_LANGUAGE); setAddingLang(false); }} style={addBtnStyle}>Cancel</button>
            </div>
          </div>
        )}
        {languages.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {languages.map((lang, i) => (
              <span key={i} onClick={() => removeEntry(languages, i, setLanguages)} style={{
                cursor: "pointer", padding: "5px 14px",
                background: "rgba(255,255,255,0.04)", borderRadius: 20,
                fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                {lang.language} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({lang.proficiency})</span> &times;
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Volunteer ──────────────────────────── */}
      <div style={cardStyle}>
        <div style={sectionHeader}>
          <span>Volunteer Work</span>
          {!addingVol && <button onClick={() => setAddingVol(true)} style={addBtnStyle}>+ Add</button>}
        </div>
        {addingVol && (
          <div style={{ ...entryCard, border: "1px solid rgba(129, 140, 248, 0.15)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>Organization *</label><input value={volForm.organization} onChange={(e) => setVolForm({ ...volForm, organization: e.target.value })} /></div>
              <div><label style={labelStyle}>Role</label><input value={volForm.role} onChange={(e) => setVolForm({ ...volForm, role: e.target.value })} /></div>
              <div><label style={labelStyle}>Start</label><input value={volForm.startDate} onChange={(e) => setVolForm({ ...volForm, startDate: e.target.value })} placeholder="2020" /></div>
              <div><label style={labelStyle}>End</label><input value={volForm.endDate} onChange={(e) => setVolForm({ ...volForm, endDate: e.target.value })} placeholder="Present" /></div>
            </div>
            <div style={{ marginTop: 8 }}><label style={labelStyle}>Description</label><textarea style={{ minHeight: 50, resize: "vertical" }} value={volForm.description} onChange={(e) => setVolForm({ ...volForm, description: e.target.value })} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button disabled={!volForm.organization} onClick={() => { setVolunteer([...volunteer, volForm]); setVolForm(EMPTY_VOLUNTEER); setAddingVol(false); }} style={{ ...addBtnStyle, background: "rgba(129, 140, 248, 0.1)", color: "#818cf8", border: "1px solid rgba(129, 140, 248, 0.2)" }}>Save</button>
              <button onClick={() => { setVolForm(EMPTY_VOLUNTEER); setAddingVol(false); }} style={addBtnStyle}>Cancel</button>
            </div>
          </div>
        )}
        {volunteer.map((vol, i) => (
          <div key={i} style={entryCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{vol.role || vol.organization}</div>
                {vol.role && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{vol.organization}</div>}
                {(vol.startDate || vol.endDate) && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{vol.startDate}{vol.endDate ? ` \u2013 ${vol.endDate}` : ""}</div>}
                {vol.description && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, whiteSpace: "pre-line" }}>{vol.description}</div>}
              </div>
              <button onClick={() => removeEntry(volunteer, i, setVolunteer)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>&times;</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Save Button ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4, paddingBottom: 40 }}>
        <button
          onClick={saveProfile}
          style={{
            padding: "10px 28px",
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            color: "white", border: "none",
            borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 14,
            boxShadow: "0 2px 16px rgba(129, 140, 248, 0.2)",
            fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Save Profile
        </button>
        {saved && <span style={{ color: "var(--success)", fontWeight: 500, fontSize: 14 }}>✓ Saved</span>}
      </div>
    </div>
  );
}

export default App;
