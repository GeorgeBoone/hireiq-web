// Shared skill-matching utilities used by JobDetail and JobCompare

export type SkillStatus = "have" | "partial" | "missing";

export interface SkillGapItem {
  skill: string;
  status: SkillStatus;
  matchedWith?: string;
  isPreferred: boolean;
}

export interface SkillGapResult {
  items: SkillGapItem[];
  coverageRequired: number;
  coverageAll: number;
  haveCount: number;
  partialCount: number;
  missingCount: number;
}

// Skill alias groups — bidirectional matching within each group.
// e.g. "js" <-> "javascript", "react" <-> "reactjs"
const SKILL_ALIASES: Record<string, string[]> = {
  js: ["javascript"],
  ts: ["typescript"],
  py: ["python"],
  react: ["reactjs", "reactnative"],
  vue: ["vuejs"],
  angular: ["angularjs"],
  node: ["nodejs", "nodej"],
  postgres: ["postgresql", "psql"],
  mongo: ["mongodb"],
  k8s: ["kubernetes"],
  aws: ["amazonwebservices"],
  gcp: ["googlecloud", "googlecloudplatform"],
  ml: ["machinelearning"],
  ai: ["artificialintelligence"],
  css: ["css3"],
  html: ["html5"],
  cpp: ["c++", "cplusplus"],
  csharp: ["c#"],
  dotnet: [".net", "aspnet"],
};

/** Strip a skill name down to a comparable key (lowercase, no punctuation). */
export function normalizeSkill(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#]/g, "").trim();
}

/**
 * Check if two skills are a partial (but not exact) match.
 * Uses substring containment and alias groups.
 */
export function isPartialMatch(userSkill: string, jobSkill: string): boolean {
  const u = normalizeSkill(userSkill);
  const j = normalizeSkill(jobSkill);
  if (u === j) return false; // exact match handled separately
  // Substring containment: "React" matches "React.js"
  if (u.includes(j) || j.includes(u)) return true;
  // Alias group matching
  for (const [key, vals] of Object.entries(SKILL_ALIASES)) {
    const group = [key, ...vals];
    if (group.includes(u) && group.includes(j)) return true;
  }
  return false;
}

/**
 * Compare user skills against job required/preferred skills.
 * Returns coverage stats and per-skill match status.
 */
export function analyzeSkillGap(
  userSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
): SkillGapResult {
  const userNorm = userSkills.map((s) => ({ original: s, norm: normalizeSkill(s) }));
  const items: SkillGapItem[] = [];

  const processSkill = (skill: string, isPreferred: boolean) => {
    const norm = normalizeSkill(skill);
    // Exact match
    if (userNorm.some((u) => u.norm === norm)) {
      items.push({ skill, status: "have", isPreferred });
      return;
    }
    // Partial match
    const partial = userNorm.find((u) => isPartialMatch(u.original, skill));
    if (partial) {
      items.push({ skill, status: "partial", matchedWith: partial.original, isPreferred });
      return;
    }
    // Missing
    items.push({ skill, status: "missing", isPreferred });
  };

  requiredSkills.forEach((s) => processSkill(s, false));
  preferredSkills.forEach((s) => processSkill(s, true));

  const requiredItems = items.filter((i) => !i.isPreferred);
  const haveCount = items.filter((i) => i.status === "have").length;
  const partialCount = items.filter((i) => i.status === "partial").length;
  const missingCount = items.filter((i) => i.status === "missing").length;

  const requiredCovered = requiredItems.filter((i) => i.status === "have" || i.status === "partial").length;
  const coverageRequired = requiredItems.length > 0 ? Math.round((requiredCovered / requiredItems.length) * 100) : 100;

  const allCovered = items.filter((i) => i.status === "have" || i.status === "partial").length;
  const coverageAll = items.length > 0 ? Math.round((allCovered / items.length) * 100) : 100;

  return { items, coverageRequired, coverageAll, haveCount, partialCount, missingCount };
}

/** Application status badge colors (used in JobList + JobCompare). */
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  saved: { bg: "rgba(129,140,248,0.1)", text: "#818cf8" },
  applied: { bg: "rgba(192,132,252,0.1)", text: "#c084fc" },
  screening: { bg: "rgba(251,191,88,0.1)", text: "#fbbf58" },
  interview: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa" },
  offer: { bg: "rgba(110,231,168,0.1)", text: "#6ee7a8" },
  rejected: { bg: "rgba(110,106,128,0.1)", text: "#6e6a80" },
};
