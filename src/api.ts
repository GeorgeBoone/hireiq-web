// src/api.ts
// Centralized API client for the Go backend

const API_URL = "http://localhost:8080";

// Generic fetch wrapper that handles auth token and JSON
async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// ── Auth ──────────────────────────────────────────────
export async function syncUser(token: string) {
  const res = await apiFetch("/auth/google", token, { method: "POST" });
  if (!res.ok) throw new Error("Backend sync failed");
  return res.json();
}

// ── Profile ──────────────────────────────────────────
export async function getProfile(token: string) {
  const res = await apiFetch("/profile", token);
  if (!res.ok) throw new Error("Failed to get profile");
  return res.json();
}

export async function updateProfile(token: string, data: any) {
  const res = await apiFetch("/profile", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function updateSkills(token: string, skills: string[]) {
  const res = await apiFetch("/profile/skills", token, {
    method: "PUT",
    body: JSON.stringify({ skills }),
  });
  if (!res.ok) throw new Error("Failed to update skills");
  return res.json();
}

// ── Jobs ─────────────────────────────────────────────
export interface Job {
  id: string;
  user_id: string;
  external_id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  salary_range: string;
  job_type: string;
  description: string;
  tags: string[];
  required_skills: string[];
  preferred_skills: string[];
  apply_url: string;
  hiring_email: string;
  company_logo: string;
  company_color: string;
  match_score: number;
  bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobFilter {
  search?: string;
  location?: string; // "remote" | "onsite" | ""
  bookmarked?: boolean;
}

export async function listJobs(token: string, filter: JobFilter = {}): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.location) params.set("location", filter.location);
  if (filter.bookmarked) params.set("bookmarked", "true");

  const query = params.toString();
  const path = `/jobs${query ? `?${query}` : ""}`;

  const res = await apiFetch(path, token);
  if (!res.ok) throw new Error("Failed to list jobs");
  return res.json();
}

export async function getJob(token: string, id: string): Promise<Job> {
  const res = await apiFetch(`/jobs/${id}`, token);
  if (!res.ok) throw new Error("Failed to get job");
  return res.json();
}

export async function createJob(token: string, job: Partial<Job>): Promise<Job> {
  const res = await apiFetch("/jobs", token, {
    method: "POST",
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error("Failed to create job");
  return res.json();
}

export async function updateJob(token: string, id: string, job: Partial<Job>): Promise<Job> {
  const res = await apiFetch(`/jobs/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error("Failed to update job");
  return res.json();
}

export async function deleteJob(token: string, id: string): Promise<void> {
  const res = await apiFetch(`/jobs/${id}`, token, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete job");
}

export async function toggleBookmark(token: string, id: string): Promise<{ bookmarked: boolean }> {
  const res = await apiFetch(`/jobs/${id}/bookmark`, token, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle bookmark");
  return res.json();
}

// ── Job Parsing ──────────────────────────────────────
export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  salary_range: string;
  job_type: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  apply_url: string;
  hiring_email: string;
  tags: string[];
  source: string;
}

export async function parseJobPosting(
  token: string,
  input: { text?: string; url?: string }
): Promise<ParsedJob> {
  const res = await apiFetch("/jobs/parse", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Parse failed" }));
    throw new Error(err.error || "Failed to parse job posting");
  }
  return res.json();
}
