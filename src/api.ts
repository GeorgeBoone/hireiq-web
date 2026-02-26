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

export const updateProfile = (token: string, data: Partial<Profile>) =>
  apiFetch("/profile", token, { method: "PUT", body: JSON.stringify(data) });

export const updateSkills = (token: string, skills: string[]) =>
  apiFetch("/profile/skills", token, {
    method: "PUT",
    body: JSON.stringify({ skills }),
  });

  export const syncUser = (token: string) =>
    apiFetch("/auth/google", token, { method: "POST" });

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
