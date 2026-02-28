// src/LandingPage.tsx
// HireIQ marketing landing page for unauthenticated visitors

import { useState } from "react";
import HireIQLogo from "./HireIQLogo";

interface LandingPageProps {
  onSignIn: () => void;
  error: string | null;
}

const FEATURES = [
  {
    icon: "🔍",
    title: "Discover",
    headline: "AI Job Feed",
    description:
      "Jobs matched to your skills, preferences, and career goals. No more scrolling through irrelevant listings.",
    accent: "#818cf8",
  },
  {
    icon: "📋",
    title: "Tracker",
    headline: "Pipeline Kanban",
    description:
      "Drag-and-drop your applications from Saved to Offer. See your entire job search at a glance.",
    accent: "#c084fc",
  },
  {
    icon: "📝",
    title: "Resume",
    headline: "AI Resume Critique",
    description:
      "Upload your resume and get instant, actionable feedback. Match it against specific jobs for targeted improvements.",
    accent: "#6ee7a8",
  },
  {
    icon: "🏢",
    title: "Network",
    headline: "Company Intel & Contacts",
    description:
      "Track companies you're targeting with financial profiles and manage your professional contacts.",
    accent: "#60a5fa",
  },
  {
    icon: "👤",
    title: "Profile",
    headline: "Smart Matching",
    description:
      "Your skills, preferences, and salary expectations power every AI recommendation across the platform.",
    accent: "#fbbf58",
  },
];

const TIERS = [
  {
    name: "Free",
    price: 0,
    annualPrice: 0,
    description: "Get organized",
    accent: "#9ca3af",
    popular: false,
    cta: "Get Started Free",
    features: [
      "Up to 10 saved jobs",
      "Full pipeline tracking",
      "Profile & preferences",
      "Contacts & network",
      "View discover feed",
    ],
    excluded: [
      "AI resume critique",
      "AI job parsing",
      "Job comparison",
      "Company intel",
    ],
  },
  {
    name: "Pro",
    price: 19,
    annualPrice: 149,
    description: "For active job seekers",
    accent: "#818cf8",
    popular: true,
    cta: "Start Pro",
    features: [
      "Unlimited saved jobs",
      "Full discover feed — save & dismiss",
      "AI job parsing (URL & text)",
      "3 AI resume critiques/month",
      "Job comparison (up to 3)",
      "Company intel & financials",
      "Email support",
    ],
    excluded: [],
  },
  {
    name: "Pro+",
    price: 39,
    annualPrice: 299,
    description: "All-in job search",
    accent: "#c084fc",
    popular: false,
    cta: "Start Pro+",
    features: [
      "Everything in Pro",
      "Unlimited AI resume critiques",
      "Compare up to 5 jobs",
      "Unlimited AI job parsing",
      "Priority feed matching",
      "Pipeline & resume exports",
    ],
    excluded: [],
  },
  {
    name: "Enterprise",
    price: -1,
    annualPrice: -1,
    description: "Outplacement & transition",
    accent: "#60a5fa",
    popular: false,
    cta: "Contact Sales",
    features: [
      "Everything in Pro+",
      "Centralized team billing",
      "Admin dashboard & analytics",
      "Bulk employee onboarding",
      "Custom transition packages",
      "SSO integration",
      "Co-branding option",
      "Dedicated account manager",
    ],
    excluded: [],
  },
];

const STEPS = [
  {
    num: 1,
    title: "Sign up in seconds",
    description: "Connect your Google account. No forms, no friction.",
  },
  {
    num: 2,
    title: "Set your preferences",
    description:
      "Tell us your skills, target salary, and work style. Takes about 2 minutes.",
  },
  {
    num: 3,
    title: "Let AI do the heavy lifting",
    description:
      "Get matched jobs, resume feedback, and company intel — updated daily.",
  },
];

export default function LandingPage({ onSignIn, error }: LandingPageProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredCta, setHoveredCta] = useState<string | null>(null);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);
  const [annual, setAnnual] = useState(false);

  const primaryBtn = (
    label: string,
    size: "sm" | "lg" = "sm"
  ): React.CSSProperties => ({
    padding: size === "lg" ? "14px 36px" : "9px 22px",
    background: "linear-gradient(135deg, #818cf8, #6366f1)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: size === "lg" ? 16 : 14,
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow:
      hoveredCta === label
        ? "0 4px 28px rgba(129, 140, 248, 0.45)"
        : "0 2px 16px rgba(129, 140, 248, 0.25)",
    transform: hoveredCta === label ? "translateY(-1px)" : "none",
    transition: "all 0.2s",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-deep)",
        color: "var(--text-primary)",
      }}
    >
      {/* ── A. Sticky Nav ──────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(28px) saturate(150%)",
          WebkitBackdropFilter: "blur(28px) saturate(150%)",
          background: "rgba(8, 12, 20, 0.75)",
          borderBottom: "1px solid var(--glass-border)",
          height: 60,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <HireIQLogo size={30} />
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.3px",
              }}
            >
              HireIQ
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() =>
                document
                  .getElementById("pricing")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                padding: "7px 18px",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              Pricing
            </button>
            <button
              onClick={onSignIn}
              style={{
                padding: "7px 18px",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              Sign In
            </button>
            <button
              onClick={onSignIn}
              onMouseEnter={() => setHoveredCta("nav")}
              onMouseLeave={() => setHoveredCta(null)}
              style={primaryBtn("nav")}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── B. Hero Section ────────────────────────────────── */}
      <section
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "5%",
            left: "15%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(129, 140, 248, 0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Faint logo watermark */}
        <div
          style={{
            position: "absolute",
            opacity: 0.035,
            pointerEvents: "none",
          }}
        >
          <HireIQLogo size={450} color="#818cf8" />
        </div>

        {/* Badge */}
        <div
          style={{
            padding: "5px 16px",
            borderRadius: 20,
            background: "rgba(129, 140, 248, 0.08)",
            border: "1px solid rgba(129, 140, 248, 0.12)",
            fontSize: 13,
            fontWeight: 600,
            color: "#818cf8",
            marginBottom: 28,
            position: "relative",
            zIndex: 1,
          }}
        >
          AI-Powered Job Intelligence
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-2px",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            maxWidth: 720,
            margin: "0 0 20px",
            position: "relative",
            zIndex: 1,
          }}
        >
          You bring the talent.
          <br />
          We bring the{" "}
          <span style={{ color: "#818cf8" }}>intel</span>.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 18,
            color: "var(--text-secondary)",
            maxWidth: 600,
            lineHeight: 1.6,
            margin: "0 0 36px",
            position: "relative",
            zIndex: 1,
          }}
        >
          HireIQ uses AI to surface the right jobs, track your pipeline,
          critique your resume, and map your professional network — so you
          can focus on landing the role, not managing the search.
        </p>

        {/* CTA cluster */}
        <div
          style={{
            display: "flex",
            gap: 14,
            position: "relative",
            zIndex: 1,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onSignIn}
            onMouseEnter={() => setHoveredCta("hero")}
            onMouseLeave={() => setHoveredCta(null)}
            style={primaryBtn("hero", "lg")}
          >
            Get Started Free
          </button>
          <button
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            onMouseEnter={() => setHoveredCta("how")}
            onMouseLeave={() => setHoveredCta(null)}
            style={{
              padding: "14px 32px",
              background:
                hoveredCta === "how"
                  ? "rgba(200, 210, 240, 0.1)"
                  : "rgba(200, 210, 240, 0.06)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            See How It Works
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(248, 113, 113, 0.08)",
              border: "1px solid rgba(248, 113, 113, 0.15)",
              borderRadius: "var(--radius-sm)",
              color: "var(--danger)",
              fontSize: 13,
              textAlign: "center",
              marginTop: 16,
              maxWidth: 400,
              position: "relative",
              zIndex: 1,
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* ── C. Feature Showcase ────────────────────────────── */}
      <section
        id="features"
        style={{
          padding: "80px 32px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-1px",
              marginBottom: 12,
              color: "var(--text-primary)",
            }}
          >
            Everything you need to land your next role
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--text-secondary)",
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            Five AI-powered tools working together to give you an unfair
            advantage.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                background:
                  hoveredFeature === i
                    ? "rgba(200, 210, 240, 0.06)"
                    : "var(--glass-bg)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border:
                  hoveredFeature === i
                    ? `1px solid ${f.accent}33`
                    : "1px solid var(--glass-border)",
                borderRadius: "var(--radius-lg)",
                padding: "28px 24px",
                transition: "all 0.25s",
                transform:
                  hoveredFeature === i ? "translateY(-2px)" : "none",
              }}
            >
              {/* Accent bar */}
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  background: f.accent,
                  marginBottom: 16,
                }}
              />

              {/* Icon */}
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>

              {/* Category label */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                {f.title}
              </div>

              {/* Headline */}
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {f.headline}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── D. How It Works ────────────────────────────────── */}
      <section style={{ padding: "80px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-1px",
              marginBottom: 12,
              color: "var(--text-primary)",
            }}
          >
            Up and running in minutes
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 40,
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          {STEPS.map((s) => (
            <div key={s.num}>
              {/* Number badge */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(129, 140, 248, 0.08)",
                  border: "1px solid rgba(129, 140, 248, 0.15)",
                  color: "#818cf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 800,
                  margin: "0 auto 16px",
                }}
              >
                {s.num}
              </div>

              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {s.title}
              </h3>

              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── E. Trust Line ──────────────────────────────────── */}
      <section
        style={{
          padding: "60px 32px",
          textAlign: "center",
          borderTop: "1px solid var(--glass-border)",
          borderBottom: "1px solid var(--glass-border)",
        }}
      >
        <p
          style={{
            fontSize: 16,
            color: "var(--text-muted)",
            maxWidth: 600,
            margin: "0 auto",
            fontStyle: "italic",
            lineHeight: 1.6,
          }}
        >
          Built for engineers, designers, and product managers who want to
          spend less time searching and more time interviewing.
        </p>
      </section>

      {/* ── F. Pricing ─────────────────────────────────────── */}
      <section
        id="pricing"
        style={{ padding: "80px 32px", maxWidth: 1200, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-1px",
              marginBottom: 12,
              color: "var(--text-primary)",
            }}
          >
            Simple, transparent pricing
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--text-secondary)",
              maxWidth: 500,
              margin: "0 auto 28px",
            }}
          >
            Start free. Upgrade when you're ready.
          </p>

          {/* Monthly / Annual toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(200, 210, 240, 0.03)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10,
              padding: 3,
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: "7px 20px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                color: !annual ? "#818cf8" : "var(--text-muted)",
                background: !annual
                  ? "rgba(129, 140, 248, 0.1)"
                  : "transparent",
                border: !annual
                  ? "1px solid rgba(129, 140, 248, 0.1)"
                  : "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: "7px 20px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                color: annual ? "#818cf8" : "var(--text-muted)",
                background: annual
                  ? "rgba(129, 140, 248, 0.1)"
                  : "transparent",
                border: annual
                  ? "1px solid rgba(129, 140, 248, 0.1)"
                  : "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Annual
            </button>
            {annual && (
              <span
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(110, 231, 168, 0.12)",
                  color: "#6ee7a8",
                  borderRadius: 12,
                  marginLeft: 4,
                }}
              >
                Save 35%
              </span>
            )}
          </div>
        </div>

        {/* Tier cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {TIERS.map((tier, i) => {
            const isPopular = tier.popular;
            const isHovered = hoveredTier === i;
            const isEnterprise = tier.price === -1;
            const monthlyFromAnnual = tier.annualPrice > 0
              ? Math.round(tier.annualPrice / 12)
              : 0;

            return (
              <div
                key={tier.name}
                onMouseEnter={() => setHoveredTier(i)}
                onMouseLeave={() => setHoveredTier(null)}
                style={{
                  background: isHovered
                    ? "rgba(200, 210, 240, 0.06)"
                    : "var(--glass-bg)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: isPopular
                    ? `1px solid rgba(129, 140, 248, ${isHovered ? "0.4" : "0.25"})`
                    : isHovered
                      ? `1px solid ${tier.accent}33`
                      : "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "32px 24px",
                  transition: "all 0.25s",
                  transform: isHovered ? "translateY(-2px)" : "none",
                  position: "relative",
                }}
              >
                {/* Accent bar */}
                <div
                  style={{
                    width: 40,
                    height: 3,
                    borderRadius: 2,
                    background: tier.accent,
                    marginBottom: 16,
                  }}
                />

                {/* Popular badge */}
                {isPopular && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      padding: "4px 14px",
                      borderRadius: 20,
                      background: tier.accent,
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Tier name */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {tier.name}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 4 }}>
                  {isEnterprise ? (
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                      }}
                    >
                      Custom
                    </span>
                  ) : tier.price === 0 ? (
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                      }}
                    >
                      $0
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          fontSize: 36,
                          fontWeight: 800,
                          color: "var(--text-primary)",
                        }}
                      >
                        ${annual ? monthlyFromAnnual : tier.price}
                      </span>
                      <span
                        style={{
                          fontSize: 15,
                          color: "var(--text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        /mo
                      </span>
                    </>
                  )}
                </div>

                {/* Billing note */}
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 12,
                    minHeight: 18,
                  }}
                >
                  {isEnterprise
                    ? "Per-seat pricing"
                    : tier.price === 0
                      ? "Free forever"
                      : annual
                        ? `Billed $${tier.annualPrice}/yr`
                        : "Billed monthly"}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    marginBottom: 20,
                  }}
                >
                  {tier.description}
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: "var(--glass-border)",
                    marginBottom: 20,
                  }}
                />

                {/* Feature list */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {tier.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                      }}
                    >
                      <span
                        style={{
                          color: "#6ee7a8",
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        ✓
                      </span>
                      {f}
                    </div>
                  ))}
                  {tier.excluded.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                        opacity: 0.5,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        —
                      </span>
                      {f}
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                <button
                  onClick={onSignIn}
                  onMouseEnter={() => setHoveredCta(`tier-${i}`)}
                  onMouseLeave={() => setHoveredCta(null)}
                  style={{
                    width: "100%",
                    padding: "11px 24px",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    ...(isPopular
                      ? {
                          background: "linear-gradient(135deg, #818cf8, #6366f1)",
                          color: "white",
                          border: "none",
                          boxShadow:
                            hoveredCta === `tier-${i}`
                              ? "0 4px 24px rgba(129, 140, 248, 0.4)"
                              : "0 2px 12px rgba(129, 140, 248, 0.2)",
                        }
                      : {
                          background:
                            hoveredCta === `tier-${i}`
                              ? "rgba(200, 210, 240, 0.08)"
                              : "rgba(200, 210, 240, 0.04)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--glass-border)",
                        }),
                  }}
                >
                  {tier.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── G. Final CTA ───────────────────────────────────── */}
      <section
        style={{
          padding: "100px 32px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(129, 140, 248, 0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <h2
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-1px",
            marginBottom: 12,
            position: "relative",
          }}
        >
          Ready to job search smarter?
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            marginBottom: 32,
            position: "relative",
          }}
        >
          Join HireIQ for free and let AI handle the busywork.
        </p>
        <button
          onClick={onSignIn}
          onMouseEnter={() => setHoveredCta("final")}
          onMouseLeave={() => setHoveredCta(null)}
          style={{
            ...primaryBtn("final", "lg"),
            padding: "16px 44px",
            fontSize: 17,
            position: "relative",
          }}
        >
          Get Started Free
        </button>
      </section>

      {/* ── G. Footer ──────────────────────────────────────── */}
      <footer
        style={{
          padding: "32px",
          textAlign: "center",
          borderTop: "1px solid var(--glass-border)",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        © 2026 HireIQ. All rights reserved.
      </footer>
    </div>
  );
}
