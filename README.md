# HireIQ Web

React frontend for HireIQ — an AI-powered job search intelligence platform.

*You bring the talent. We bring the intel.*

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite
- **Auth:** Firebase Authentication (Google OAuth)
- **Styling:** Inline styles with CSS custom properties (Midnight Glassmorphism theme)
- **Font:** Plus Jakarta Sans

## Features

### Landing Page
Marketing landing page for unauthenticated visitors with hero section, feature showcase, how-it-works steps, and multiple sign-up CTAs. Google OAuth handles both sign-up and sign-in — new users are auto-created on first login.

### Discover (AI Job Feed)
Browse AI-matched jobs from a curated feed. Each card shows company logo, title, salary, match score, and required skills. Save jobs to your tracker or dismiss them. Click any card to view full details with company intel.

### Tracker (Pipeline Kanban)
Manage your job search pipeline. Jobs flow through statuses: Saved -> Applied -> Interview -> Offer -> Rejected. Features include:
- Status bar with color-coded counts and click-to-filter
- Drag-and-drop status updates
- Application tracking with follow-up dates and urgency flags
- Status change history with timestamps

### Resume Critique
Upload your resume (PDF/DOCX) and get AI-powered feedback:
- Overall score with severity-coded issues (critical/warning/info)
- Category breakdown (formatting, content, skills, impact)
- Target a specific saved job for tailored feedback
- AI-generated fix suggestions with before/after diffs

### Network
Two sub-views toggled via Companies/Contacts switcher:
- **Companies** — Grid of cards aggregated from saved jobs showing logo, job count, and contact count. Click to expand a detail panel with all jobs and contacts at that company.
- **Contacts** — Full CRUD contact management with search, company autocomplete, connection degree badges, and inline add/edit forms.

### Job Comparison
Select 2-3 jobs and get an AI-driven side-by-side comparison with dimension scoring (compensation, growth, culture, etc.), overall rankings, and a recommendation.

### Company Intel
Financial profiles for companies in your tracker. Public companies get real Yahoo Finance data (market cap, revenue, margins, analyst ratings, quarterly earnings). Private companies get AI-estimated profiles.

### Profile
Manage your skills, salary range, work style preference, location, and GitHub URL. These preferences power all AI matching and recommendations across the platform.

## Project Structure

```
src/
  App.tsx              -> Main app shell, auth flow, navigation
  LandingPage.tsx      -> Marketing landing page (unauthenticated)
  Discover.tsx         -> AI job feed with save/dismiss
  JobList.tsx          -> Tracker view with pipeline status bar
  JobDetail.tsx        -> Full job detail with company intel + application tracking
  JobForm.tsx          -> Add/edit job form
  JobCompare.tsx       -> AI job comparison
  ResumeCritique.tsx   -> Resume upload and AI critique
  Network.tsx          -> Companies grid + contacts CRUD
  HireIQLogo.tsx       -> SVG dot-burst logo component
  api.ts               -> API client (all backend calls)
  firebase.ts          -> Firebase auth config
  index.css            -> Midnight Glassmorphism theme (CSS variables)
```

## Design System

**Midnight Glassmorphism** — dark theme with glass-morphism cards, backdrop blur effects, and indigo/purple accent colors.

Key CSS variables:
- `--bg-deep: #080c14` — page background
- `--glass-bg: rgba(200, 210, 240, 0.03)` — glass card background
- `--glass-border: rgba(150, 170, 220, 0.08)` — glass card border
- `--accent: #818cf8` — primary accent (indigo)
- `--text-primary: #e8e4f0` — main text
- `--text-secondary: #9ca3af` — secondary text

## Local Development

### Prerequisites

- Node.js 18+
- HireIQ API running at `http://localhost:8080` (or set `VITE_API_URL`)

### Setup

```bash
# 1. Clone and enter directory
git clone https://github.com/GeorgeBoone/hireiq-web.git
cd hireiq-web

# 2. Install dependencies
npm install

# 3. Copy env file and fill in Firebase config
cp .env.example .env

# 4. Run dev server
npm run dev
```

Dev server starts at `http://localhost:5173`

### Build

```bash
npm run build
```

## Navigation

The app uses state-based SPA navigation (no router library). The `View` discriminated union type in `App.tsx` controls which page renders. Tab bar provides access to: Discover, Tracker, Resume, Network, and Profile.
