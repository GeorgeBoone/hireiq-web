// src/api.ts
// HireIQ API client

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Profile ────────────────────────────────────────
export interface Profile {
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
}

export const getProfile = (token: string): Promise<Profile> =>
  apiFetch("/profile", token);

export const syncUser = (token: string) =>
  apiFetch("/auth/sync", token, { method: "POST" });

export const updateProfile = (token: string, data: Partial<Profile>) =>
  apiFetch("/profile", token, { method: "PUT", body: JSON.stringify(data) });

export const updateSkills = (token: string, skills: string[]) =>
  apiFetch("/profile/skills", token, {
    method: "PUT",
    body: JSON.stringify({ skills }),
  });

// ─── Jobs ───────────────────────────────────────────
export interface Job {
  id: string;
  userId: string;
  externalId?: string;
  source: string;
  title: string;
  company: string;
  location: string;
  salaryRange: string;
  jobType: string;
  description: string;
  tags: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  applyUrl?: string;
  hiringEmail?: string;
  companyLogo?: string;
  companyColor?: string;
  matchScore: number;
  bookmarked: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const getJobs = (token: string, params?: Record<string, string>): Promise<Job[]> => {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch(`/jobs${query}`, token);
};

export const getJob = (token: string, id: string): Promise<Job> =>
  apiFetch(`/jobs/${id}`, token);

export const createJob = (token: string, data: Partial<Job>): Promise<Job> =>
  apiFetch("/jobs", token, { method: "POST", body: JSON.stringify(data) });

export const updateJob = (token: string, id: string, data: Partial<Job>): Promise<Job> =>
  apiFetch(`/jobs/${id}`, token, { method: "PUT", body: JSON.stringify(data) });

export const deleteJob = (token: string, id: string) =>
  apiFetch(`/jobs/${id}`, token, { method: "DELETE" });

export const toggleBookmark = (token: string, id: string) =>
  apiFetch(`/jobs/${id}/bookmark`, token, { method: "POST" });

export const updateJobStatus = (token: string, id: string, status: string) =>
  apiFetch(`/jobs/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ─── Parse ──────────────────────────────────────────
export const parseJobPosting = (token: string, text: string) =>
  apiFetch("/jobs/parse", token, {
    method: "POST",
    body: JSON.stringify({ text }),
  });

// ─── Feed ───────────────────────────────────────────
export interface FeedJob {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  salaryText: string;
  jobType: string;
  description: string;
  requiredSkills: string[];
  applyUrl: string;
  companyLogo: string;
  postedAt: string | null;
  fetchedAt: string;
  matchScore: number;
  dismissed: boolean;
  saved: boolean;
  savedJobId?: string;
}

export const getFeed = (token: string): Promise<{ jobs: FeedJob[]; count: number }> =>
  apiFetch("/feed", token);

export const refreshFeed = (token: string): Promise<{ fetched: number; new: number }> =>
  apiFetch("/feed/refresh", token, { method: "POST" });

export const dismissFeedJob = (token: string, id: string) =>
  apiFetch(`/feed/${id}/dismiss`, token, { method: "POST" });

export const saveFeedJob = (token: string, id: string) =>
  apiFetch(`/feed/${id}/save`, token, { method: "POST" });

// ─── Resume Critique ────────────────────────────────
export interface CritiqueIssue {
  cat: string;
  sev: "critical" | "warning" | "info";
  msg: string;
}

export interface CritiqueResult {
  score: number;
  issues: CritiqueIssue[];
  strengths: string[];
  topTip?: string;
  targetJob?: Job | null;
  aiPowered?: boolean;
}

export interface FixSuggestion {
  before: string;
  after: string;
  explanation: string;
}

export const uploadResume = async (token: string, file: File): Promise<{ text: string; filename: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/resume/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to upload resume");
  }
  return res.json();
};

export const aiCritique = (
  token: string,
  resumeText: string,
  jobId?: string
): Promise<CritiqueResult> =>
  apiFetch("/resume/critique", token, {
    method: "POST",
    body: JSON.stringify({ resumeText, jobId }),
  });

export const aiFix = (
  token: string,
  resumeText: string,
  issue: CritiqueIssue,
  jobId?: string
): Promise<{ suggestions: FixSuggestion[] }> =>
  apiFetch("/resume/fix", token, {
    method: "POST",
    body: JSON.stringify({ resumeText, issue, jobId }),
  });

// ─── Company Intel ─────────────────────────────────
export interface CompanyProfile {
  industry: string;
  sector: string;
  fullTimeEmployees: number;
  website: string;
  city: string;
  country: string;
  summary: string;
  founded: number;
}

export interface CompanyFinance {
  marketCap: number;
  marketCapFmt: string;
  enterpriseValue: number;
  enterpriseValueFmt: string;
  totalRevenue: number;
  totalRevenueFmt: string;
  revenueGrowth: number;
  grossMargins: number;
  operatingMargins: number;
  profitMargins: number;
  trailingPE: number;
  forwardPE: number;
  currentPrice: number;
  targetMeanPrice: number;
  dividendYield: number;
  debtToEquity: number;
  freeCashflow: number;
  freeCashflowFmt: string;
}

export interface CompanyRatings {
  overallRisk: number;
  auditRisk: number;
  boardRisk: number;
  compensationRisk: number;
  shareholderRisk: number;
  recommendationMean: number;
  recommendationKey: string;
  numberOfAnalysts: number;
  targetHighPrice: number;
  targetLowPrice: number;
  // AI-estimated Glassdoor-style (private companies)
  glassdoorRating?: number;
  glassdoorCulture?: number;
  glassdoorCompensation?: number;
  glassdoorWorkLifeBalance?: number;
  glassdoorCareerGrowth?: number;
}

export interface QuarterData {
  quarter: string;
  revenue: number;
  earnings: number;
}

export interface CompanyOfficer {
  name: string;
  title: string;
  age?: number;
}

export interface CompanyIntel {
  company: string;
  ticker?: string;
  isPublic: boolean;
  source: "yahoo_finance" | "ai_estimated";
  fetchedAt: string;
  profile: CompanyProfile;
  financials: CompanyFinance;
  ratings: CompanyRatings;
  earnings: QuarterData[];
  officers: CompanyOfficer[];
}

export const getCompanyIntel = (
  token: string,
  company: string,
  ticker?: string
): Promise<CompanyIntel> => {
  const params = new URLSearchParams({ company });
  if (ticker) params.set("ticker", ticker);
  return apiFetch(`/company/intel?${params.toString()}`, token);
};
