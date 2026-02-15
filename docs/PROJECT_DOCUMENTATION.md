# STUDENT DESK — Complete Project Documentation

> **A full-stack web application for B.Tech engineering students to access, download, and study subject-wise notes with an AI-powered doubt-solving chatbot.**

**Live URL:** [https://studentdesk.vercel.app](https://studentdesk.vercel.app)  
**GitHub:** [https://github.com/bogavivek15/viveks-first-project](https://github.com/bogavivek15/viveks-first-project)  
**Author:** Vivek Boga  
**Date:** February 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Solution](#3-proposed-solution)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [Features & Modules](#7-features--modules)
8. [AI Chatbot — Deep Dive](#8-ai-chatbot--deep-dive)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Security Implementation](#10-security-implementation)
11. [Performance Optimization](#11-performance-optimization)
12. [SEO & Accessibility](#12-seo--accessibility)
13. [DevOps & CI/CD](#13-devops--cicd)
14. [Project Structure](#14-project-structure)
15. [API Reference](#15-api-reference)
16. [Setup & Installation](#16-setup--installation)
17. [Environment Variables](#17-environment-variables)
18. [Screenshots & User Flows](#18-screenshots--user-flows)
19. [Future Enhancements](#19-future-enhancements)
20. [Conclusion](#20-conclusion)

---

## 1. Project Overview

**STUDENT DESK** is a production-grade, full-stack web application designed for B.Tech engineering students. It provides a centralized platform to:

- Browse and download **subject-wise study notes** and **previous year question papers**
- Navigate through a structured hierarchy: **Course → Year → Semester → Subject → Notes**
- Get instant doubt resolution using an **AI-powered chatbot** on every subject page
- Contact administrators through a **secure contact form**
- Manage content through a dedicated **Admin Panel**

The application supports **6 engineering branches** (CSE, ECE, EEE, MECH, CIVIL, IT), **4 years**, and **2 semesters per year**, covering the entire B.Tech curriculum.

---

## 2. Problem Statement

Engineering students face several challenges during exam preparation:

1. **Scattered Resources** — Notes are spread across WhatsApp groups, Google Drive links, and random websites. No single organized source exists.
2. **Supplementary Exam Stress** — Students clearing backlogs have no dedicated resource for supply exam-specific materials.
3. **No Instant Doubt Resolution** — Students studying late at night have no one to ask doubts. Waiting for faculty response causes delays.
4. **No Central Platform** — Each batch/branch maintains separate resources, leading to duplication and loss of materials across years.

---

## 3. Proposed Solution

STUDENT DESK addresses all four problems:

| Problem | Solution |
|---------|----------|
| Scattered Resources | Centralized platform with structured Course → Year → Semester → Subject hierarchy |
| Supply Exam Stress | Dedicated "Regular", "Supply", and "Both" tags on every note |
| No Instant Doubts | AI chatbot powered by Groq (LLaMA 3.3 70B) on every subject page |
| No Central Platform | Single web app accessible 24/7 from any device with download capability |

---

## 4. Tech Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI library (component-based SPA) | 18.3 |
| **TypeScript** | Type-safe JavaScript (strict mode enabled) | 5.8 |
| **Vite** | Build tool & dev server (ultra-fast HMR) | 5.4 |
| **Tailwind CSS** | Utility-first CSS framework | 3.4 |
| **shadcn/ui** | Pre-built accessible UI components (Radix-based) | Latest |
| **React Router** | Client-side routing with lazy loading | 6.30 |
| **React Hook Form** | Performant form state management | 7.61 |
| **Zod** | Runtime schema validation | 3.25 |
| **Lucide React** | Icon library | 0.462 |
| **React Markdown** | Render AI chatbot responses in Markdown | 10.1 |
| **react-helmet-async** | Dynamic per-page SEO meta tags | 2.0 |
| **Sonner** | Toast notifications | 1.7 |
| **@tanstack/react-query** | Data caching & synchronization (configured) | 5.83 |

### Backend

| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service (Auth, Database, Storage, Edge Functions) |
| **PostgreSQL** | Relational database (via Supabase) |
| **Supabase Auth** | Email/password authentication with JWT |
| **Supabase Storage** | File storage for PDF notes |
| **Supabase Edge Functions** | Serverless Deno runtime for AI chatbot API |
| **Row Level Security (RLS)** | Database-level access control policies |

### AI / LLM

| Technology | Purpose |
|------------|---------|
| **Groq API** | Ultra-fast LLM inference provider |
| **LLaMA 3.3 70B Versatile** | Primary AI model for chatbot |
| **LLaMA 3.1 8B Instant** | Fallback model #1 |
| **Mixtral 8x7B 32768** | Fallback model #2 |

### Hosting & DevOps

| Technology | Purpose |
|------------|---------|
| **Vercel** | Frontend hosting with CDN, auto-deploy from GitHub |
| **Supabase Cloud** | Database, Auth, Storage, and Edge Function hosting |
| **GitHub Actions** | CI pipeline (lint → typecheck → build) |
| **Terser** | JavaScript minification with dead code elimination |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React 18 SPA (TypeScript Strict Mode)                    │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐  │  │
│  │  │  Pages   │ │Components│ │Contexts │ │   Hooks      │  │  │
│  │  │(15 lazy) │ │(Navbar,  │ │(Auth,   │ │(useMobile,   │  │  │
│  │  │          │ │ChatBot,  │ │Theme)   │ │ useToast)    │  │  │
│  │  │          │ │Footer,   │ │         │ │              │  │  │
│  │  │          │ │Admin x4) │ │         │ │              │  │  │
│  │  └─────────┘ └──────────┘ └─────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│            │                    │                    │           │
│       React Router         Supabase JS          Fetch API       │
│            │                    │                    │           │
└────────────┼────────────────────┼────────────────────┼───────────┘
             │                    │                    │
             ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│    Vercel CDN    │  │   Supabase Cloud    │  │  Supabase Edge   │
│   (Frontend)     │  │                     │  │    Function      │
│                  │  │  ┌──────────────┐   │  │                  │
│  - Static files  │  │  │ PostgreSQL   │   │  │  ask-gemini/     │
│  - Security      │  │  │ (6 tables)   │   │  │  index.ts        │
│    headers       │  │  │              │   │  │                  │
│  - Asset caching │  │  ├──────────────┤   │  │  - JWT Auth      │
│  - SPA rewrites  │  │  │ Auth (JWT)   │   │  │  - Rate Limit    │
│                  │  │  ├──────────────┤   │  │  - 3-Model       │
│                  │  │  │ Storage      │   │  │    Fallback      │
│                  │  │  │ (PDF files)  │   │  │  - Groq API      │
│                  │  │  ├──────────────┤   │  │                  │
│                  │  │  │ RLS Policies │   │  │                  │
│                  │  │  └──────────────┘   │  │                  │
└─────────────────┘  └─────────────────────┘  └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │    Groq Cloud     │
                                              │  (LLM Inference)  │
                                              │                   │
                                              │  LLaMA 3.3 70B   │
                                              │  LLaMA 3.1 8B    │
                                              │  Mixtral 8x7B    │
                                              └──────────────────┘
```

### Data Flow

1. **User opens app** → Vercel serves the React SPA
2. **User signs up/in** → Supabase Auth issues a JWT
3. **User browses courses** → React queries Supabase PostgreSQL via the JS client (RLS enforced)
4. **User downloads a note** → Supabase Storage serves the PDF file
5. **User asks a doubt** → React calls Supabase Edge Function → Edge function validates JWT → Calls Groq API → Returns AI response
6. **Admin uploads notes** → React uploads PDF to Supabase Storage → Inserts metadata into `notes` table

---

## 6. Database Design

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  auth.users  │       │   profiles   │       │  user_roles  │
│──────────────│       │──────────────│       │──────────────│
│ id (PK)      │──────▶│ id (PK, FK)  │       │ id (PK)      │
│ email        │       │ name         │       │ user_id (FK) │◀──┐
│ raw_user_    │       │ email        │       │ role (enum)  │   │
│  meta_data   │       │ branch       │       │ created_at   │   │
│              │       │ created_at   │       └──────────────┘   │
│              │       │ updated_at   │                          │
│              │──────────────────────────────────────────────────┘
│              │       └──────────────┘
│              │
│              │       ┌──────────────────┐
│              │──────▶│      notes       │
│              │       │──────────────────│
│              │       │ id (PK)          │
└──────────────┘       │ title            │       ┌──────────────┐
                       │ description      │       │   courses    │
                       │ course_id (FK)───────────▶│──────────────│
                       │ subject_id (FK)──────┐   │ id (PK)      │
                       │ year (1-4)       │   │   │ name         │
                       │ semester (1-2)   │   │   │ short_name   │
                       │ resource_type    │   │   │ description  │
                       │ exam_type        │   │   │ created_at   │
                       │ file_url         │   │   └──────────────┘
                       │ file_name        │   │          │
                       │ uploaded_by (FK) │   │          │
                       │ created_at       │   │   ┌──────────────┐
                       │ updated_at       │   │   │   subjects   │
                       └──────────────────┘   │   │──────────────│
                                              └──▶│ id (PK)      │
                                                  │ name         │
┌───────────────────┐                             │ code         │
│ contact_messages  │                             │ course_id(FK)│
│───────────────────│                             │ year (1-4)   │
│ id (PK)           │                             │ semester(1-2)│
│ name              │                             │ created_at   │
│ email             │                             └──────────────┘
│ message           │
│ is_read           │
│ created_at        │
│ updated_at        │
└───────────────────┘
```

### Tables Summary

| Table | Rows (approx) | Purpose |
|-------|---------|---------|
| `profiles` | 1 per user | Extended user info (name, email, branch) |
| `user_roles` | 1 per user | Role assignment (admin / student) |
| `courses` | 6 | Engineering branches (CSE, ECE, etc.) |
| `subjects` | ~50+ per course | Academic subjects with year/semester |
| `notes` | Variable | PDF metadata (title, file_url, exam_type) |
| `contact_messages` | Variable | User-submitted contact form messages |

### Enums

| Enum | Values |
|------|--------|
| `app_role` | `admin`, `student` |
| `exam_type` | `regular`, `supply`, `both` |
| `resource_type` | `notes`, `question_papers` |

### Database Constraints

- `subjects.year` must be between 1 and 4
- `subjects.semester` must be between 1 and 2
- `subjects(code, course_id)` is unique
- `user_roles(user_id, role)` is unique
- `notes.title` max 500 characters (DB constraint)
- `contact_messages.message` max 2000 characters (DB constraint)

### Indexes (for Scalability)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_subjects_course_year_sem` | subjects | (course_id, year, semester) | Main browse query optimization |
| `idx_notes_subject_id` | notes | (subject_id) | Subject notes page |
| `idx_notes_course_id` | notes | (course_id) | Admin queries |
| `idx_notes_uploaded_by` | notes | (uploaded_by) | Admin queries |
| `idx_user_roles_user_id` | user_roles | (user_id) | RLS policy checks |
| `idx_contact_messages_created_at` | contact_messages | (created_at DESC) | Admin message listing |
| `idx_subjects_name_trgm` | subjects | name (GIN trigram) | Dashboard search |
| `idx_subjects_code_trgm` | subjects | code (GIN trigram) | Dashboard search |

### Row Level Security (RLS) Policies

| Table | Operation | Policy |
|-------|-----------|--------|
| profiles | SELECT | Own profile only (`auth.uid() = id`) |
| profiles | UPDATE | Own profile only |
| profiles | INSERT | Own profile only |
| user_roles | SELECT | Own roles only (`auth.uid() = user_id`) |
| user_roles | ALL | Admin only (via `has_role()`) |
| courses | SELECT | Public (anyone) |
| courses | ALL (CUD) | Admin only |
| subjects | SELECT | Public (anyone) |
| subjects | ALL (CUD) | Admin only |
| notes | SELECT | Public (anyone) |
| notes | INSERT/UPDATE/DELETE | Admin only |
| contact_messages | INSERT | Public (anyone — contact form) |
| contact_messages | SELECT/UPDATE/DELETE | Admin only |
| storage.objects (notes) | SELECT | Public |
| storage.objects (notes) | INSERT/UPDATE/DELETE | Admin only |

### Database Triggers

| Trigger | On | Function | Purpose |
|---------|----|----------|---------|
| `on_auth_user_created` | `auth.users` INSERT | `handle_new_user()` | Auto-creates profile + assigns 'student' role |
| `update_profiles_updated_at` | `profiles` UPDATE | `update_updated_at()` | Auto-updates `updated_at` timestamp |
| `update_notes_updated_at` | `notes` UPDATE | `update_updated_at()` | Auto-updates `updated_at` timestamp |

---

## 7. Features & Modules

### 7.1 Public Pages (No Login Required)

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Landing page with hero section, features grid, benefits, and CTA |
| **About** | `/about` | Mission statement, what we offer, community info |
| **Contact** | `/contact` | Contact form with Zod validation, honeypot spam protection |
| **Login** | `/login` | Email/password sign-in form |
| **Register** | `/register` | Sign-up with name, email, password, optional branch |
| **Forgot Password** | `/forgot-password` | Password reset email request |
| **Update Password** | `/update-password` | Set new password (from reset email link) |

### 7.2 Protected Pages (Login Required)

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/dashboard` | Course listing + subject search with debounced ILIKE query |
| **Profile** | `/profile` | View/edit name, branch; shows account info card |

### 7.3 Browse Pages (Public)

| Page | Route | Description |
|------|-------|-------------|
| **Course Years** | `/course/:courseId` | Select Year 1-4 for a course |
| **Year Semesters** | `/course/:courseId/year/:year` | Select Semester 1-2 |
| **Semester Subjects** | `/course/:courseId/year/:year/semester/:semester` | List subjects for that selection |
| **Subject Notes** | `/course/:courseId/year/.../subject/:subjectId` | Notes & question papers with View/Download + AI Chatbot |

### 7.4 Admin Panel (Admin Only)

| Tab | Features |
|-----|----------|
| **Upload Notes** | Upload PDF (max 10MB), select course/year/semester/subject, set resource type & exam type |
| **Manage Subjects** | Add/Edit/Delete subjects with course/year/semester assignment |
| **Manage Courses** | Add/Edit/Delete courses (engineering branches) |
| **Messages** | View contact form submissions with read/unread toggle, delete, pagination (20/page) |

### 7.5 AI Chatbot

Available on every **Subject Notes** page. Appears as a floating button in the bottom-right corner. Full details in [Section 8](#8-ai-chatbot--deep-dive).

### 7.6 Dark Mode

- Toggle in Navbar (Sun/Moon icon)
- Supports: Light, Dark, and System preference
- Persisted in `localStorage`
- Listens for `prefers-color-scheme` changes in real-time

---

## 8. AI Chatbot — Deep Dive

### Architecture

```
User types question
        │
        ▼
┌──────────────────────┐
│  ChatBot Component   │
│  (React Frontend)    │
│                      │
│  - 5s client-side    │
│    cooldown          │
│  - 2000 char limit   │
│  - Sends last 6      │
│    messages as        │
│    conversation       │
│    history            │
│  - ESC to close       │
│  - Markdown rendering │
└──────────┬───────────┘
           │ supabase.functions.invoke('ask-gemini')
           ▼
┌──────────────────────────────────────┐
│  Supabase Edge Function             │
│  (supabase/functions/ask-gemini/)   │
│                                      │
│  1. CORS preflight handling          │
│  2. JWT authentication               │
│  3. Server-side rate limit (3s/user) │
│  4. Input validation (2000 chars)    │
│  5. Build system prompt with context │
│  6. Call Groq API with 3-model       │
│     fallback cascade                 │
│  7. 10s timeout per model            │
│  8. Return AI response               │
└──────────┬───────────────────────────┘
           │ HTTPS POST
           ▼
┌──────────────────────┐
│      Groq API        │
│                      │
│  Model Priority:     │
│  1. llama-3.3-70b    │
│  2. llama-3.1-8b     │
│  3. mixtral-8x7b     │
│                      │
│  Params:             │
│  - temperature: 0.3  │
│  - max_tokens: 2048  │
└──────────────────────┘
```

### System Prompt (9 Behavior Rules)

The AI chatbot follows these rules:

1. **GREETINGS** — Short 1-2 line greeting for hi/hello messages
2. **PERSONAL MESSAGES** — Acknowledges names and personal info warmly
3. **CONVERSATIONAL** — Responds naturally to casual messages
4. **SIMPLE QUESTIONS** — Concise exam-focused answer (~200-300 words) with bold headings and bullet points
5. **DETAILED REQUESTS** — Comprehensive answer (500-1000 words) with Definition, Explanation, Key Points, Examples, Advantages/Disadvantages, and Exam-Important Points
6. **LANGUAGE REQUESTS** — Supports Telugu in English letters ("Tenglish") and other language requests
7. **OFF-TOPIC** — Politely redirects non-academic questions
8. **FORMATTING** — Always uses proper Markdown
9. **MEMORY** — Remembers conversation context from previous messages (last 6 messages sent)

### Security Features

- **JWT Authentication** — Only logged-in users can use the chatbot
- **Server-side Rate Limiting** — 3 seconds between requests per user (in-memory Map)
- **Client-side Cooldown** — 5 seconds between messages (UI-enforced)
- **Input Validation** — Max 2000 characters
- **CORS Restriction** — Only accepts requests from `studentdesk.vercel.app`
- **Model Fallback** — If primary model (LLaMA 3.3 70B) fails (rate limit/timeout), automatically tries 2 backup models
- **AbortController** — 10-second timeout per model to prevent hanging requests

---

## 9. Authentication & Authorization

### Authentication Flow

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│  User   │────▶│ Supabase Auth│────▶│  Database    │
│ Sign Up │     │              │     │             │
│         │     │ 1. Create    │     │ Trigger:     │
│ (email, │     │    auth.user │     │ handle_new_  │
│ password│     │              │     │ user()       │
│ name,   │     │ 2. Issue JWT │     │              │
│ branch) │     │              │     │ → profiles   │
│         │     │ 3. Send      │     │ → user_roles │
│         │     │    verify    │     │   (student)  │
│         │     │    email     │     │              │
└─────────┘     └──────────────┘     └─────────────┘
```

### Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| **Student** | View courses, subjects, notes; download PDFs; use AI chatbot; edit own profile; submit contact form |
| **Admin** | Everything a student can do + upload/edit/delete notes, manage subjects, manage courses, view/manage contact messages |

### Route Guards

```tsx
// Protected Route — requires authentication
<Route path="/dashboard" element={
  <ProtectedRoute><Dashboard /></ProtectedRoute>
} />

// Admin Route — requires admin role
<Route path="/admin" element={
  <AdminRoute><AdminPanel /></AdminRoute>
} />
```

- `ProtectedRoute` → Redirects to `/login` if not authenticated
- `AdminRoute` → Redirects to `/dashboard` if not admin
- Both show a loading spinner while auth state is being determined

### Password Policy

- Minimum **8 characters** (NIST SP 800-63B compliant)
- Maximum 100 characters
- Validated with Zod on frontend
- Supabase enforces on backend

---

## 10. Security Implementation

### 10.1 HTTP Security Headers (Vercel)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer info |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables device APIs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS (2 years) |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; ...` | Restricts resource loading |

### 10.2 Content Security Policy (CSP) Details

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://*.supabase.co;
font-src 'self';
connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

### 10.3 Input Validation

| Form | Validation Library | Rules |
|------|-------------------|-------|
| Register | Zod | name (1-100), email (valid format, 1-255), password (8-100), confirm match |
| Login | Zod | email (valid), password (required) |
| Contact | Zod | name (1-100), email (valid, 1-255), message (1-1000) |
| Upload Notes | Zod | title (3+), course/year/semester/subject (required), file (PDF only, ≤10MB) |
| Profile | Zod | name (1-100) |
| Chatbot | Manual | message (1-2000 chars) |

### 10.4 Anti-Spam (Contact Form)

1. **Honeypot Field** — Hidden input that bots auto-fill; submission silently rejected if filled
2. **Timing Check** — Form must be open for at least 2 seconds before submission
3. **Rate Limiting** — One submission per 30 seconds (client-side)
4. **Message Length** — Max 1000 characters (Zod) + 2000 at DB level

### 10.5 URL Validation

- Download URLs are validated to only allow `*.supabase.co` and `*.supabase.in` origins
- Route parameters (`courseId`, `subjectId`) are validated against UUID regex before querying the database
- ILIKE search characters (`%`, `_`, `\`) are escaped to prevent pattern injection

### 10.6 Error Handling Security

- `ErrorBoundary` hides raw error messages in production (`import.meta.env.DEV` check)
- `console.log` is stripped from production builds via Terser (`drop_console: true`)
- Edge function returns proper HTTP status codes (400, 401, 405, 429, 500) — never leaks stack traces

---

## 11. Performance Optimization

### 11.1 Code Splitting & Lazy Loading

All 15 page components are lazy-loaded using `React.lazy()` + `Suspense`:

```tsx
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
// ... all 15 pages
```

This means the browser only downloads the JavaScript for the page the user is viewing.

### 11.2 Bundle Splitting (Vite Rollup)

```typescript
manualChunks: {
  vendor: ["react", "react-dom", "react-router-dom"],
  supabase: ["@supabase/supabase-js"],
  ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", ...],
  utils: ["clsx", "tailwind-merge", "class-variance-authority", "zod"],
  markdown: ["react-markdown"],
}
```

### 11.3 Asset Caching

```json
{
  "source": "/assets/(.*)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
  ]
}
```

Hashed static assets are cached for 1 year.

### 11.4 Database Performance

- **Composite index** on `subjects(course_id, year, semester)` — the most common query
- **Trigram GIN indexes** for ILIKE text search on subject name and code
- **FK indexes** on all foreign key columns
- **Debounced search** (300ms) with `AbortController` to cancel stale requests

### 11.5 Network Optimization

- `<link rel="preconnect">` for Supabase domain (eliminates DNS + TLS handshake latency)
- `<link rel="dns-prefetch">` as fallback for older browsers
- Realtime events throttled to 2/second to prevent WebSocket flooding

### 11.6 Build Optimization

- **Terser** minification with `drop_console` and `drop_debugger`
- **Source maps disabled** in production (`sourcemap: false`)
- Build time: ~8.66 seconds

---

## 12. SEO & Accessibility

### 12.1 SEO

- **`react-helmet-async`** — Dynamic `<title>`, `<meta description>`, `<link canonical>`, and Open Graph tags on all 15 pages
- **JSON-LD** structured data on Home page (`WebSite` schema with `SearchAction`)
- **Static fallback** meta tags in `index.html` for crawlers that don't execute JavaScript
- **Open Graph** + **Twitter Card** meta tags for social sharing
- **`robots.txt`** — Allows all crawlers
- **Semantic HTML** — Proper heading hierarchy (h1-h3), `<nav>`, `<main>`, `<footer>`

### 12.2 Accessibility (a11y)

- **Skip to main content** link (visible on Tab focus)
- **`aria-label`** on icon-only buttons (chatbot toggle, menu, theme toggle)
- **`aria-label="Main navigation"`** on `<nav>` element
- **Form labels** — All inputs have associated `<Label>` with `htmlFor`
- **Keyboard navigation** — ESC closes chatbot; all interactive elements are focusable
- **Color scheme** — Dark mode support with system preference detection
- **Semantic landmarks** — `<main id="main-content">`, `<nav>`, `<footer>`

---

## 13. DevOps & CI/CD

### 13.1 CI Pipeline (GitHub Actions)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint        # ESLint
      - run: npx tsc --noEmit    # TypeScript strict check
      - run: npm run build       # Vite production build
```

### 13.2 Deployment Pipeline

```
Developer pushes to main
        │
        ├──▶ GitHub Actions CI (lint → typecheck → build)
        │
        ├──▶ Vercel auto-deploys frontend from main branch
        │
        └──▶ Manual: npx supabase functions deploy ask-gemini
             Manual: npx supabase db push (for new migrations)
```

### 13.3 Node Version

Locked to **Node 22** via `.nvmrc` for consistency across local dev, CI, and deployment.

---

## 14. Project Structure

```
viveks-first-project/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI pipeline
├── .nvmrc                            # Node 22
├── docs/
│   ├── Abstract_Chapter.md
│   └── PROJECT_DOCUMENTATION.md      # This file
├── public/
│   └── robots.txt                    # SEO crawler rules
├── src/
│   ├── App.tsx                       # Root component (providers, routes)
│   ├── main.tsx                      # Entry point (ReactDOM.createRoot)
│   ├── index.css                     # Global Tailwind imports
│   ├── vite-env.d.ts                 # Vite type definitions
│   │
│   ├── components/
│   │   ├── ChatBot.tsx               # AI chatbot (floating widget)
│   │   ├── ErrorBoundary.tsx         # Global error boundary
│   │   ├── Footer.tsx                # Site footer
│   │   ├── Navbar.tsx                # Navigation bar + dark mode toggle
│   │   ├── NavLink.tsx               # Reusable nav link component
│   │   ├── PageMeta.tsx              # Dynamic SEO meta tags
│   │   ├── ProtectedRoute.tsx        # Auth + Admin route guards
│   │   │
│   │   ├── admin/
│   │   │   ├── ManageCoursesTab.tsx   # CRUD for courses
│   │   │   ├── ManageMessagesTab.tsx  # View/manage contact messages
│   │   │   ├── ManageSubjectsTab.tsx  # CRUD for subjects
│   │   │   └── UploadNotesTab.tsx     # PDF upload form
│   │   │
│   │   └── ui/                       # shadcn/ui components (40+)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── toast.tsx
│   │       └── ... (40+ components)
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Auth state, signUp/In/Out, admin check
│   │   └── ThemeContext.tsx           # Dark mode (light/dark/system)
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx            # Responsive breakpoint hook
│   │   └── use-toast.ts              # Toast notification hook
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts             # Supabase client initialization
│   │       └── types.ts              # Auto-generated DB types
│   │
│   ├── lib/
│   │   ├── constants.ts              # Shared constants (BRANCHES, UUID_RE, etc.)
│   │   └── utils.ts                  # cn() utility for Tailwind class merging
│   │
│   └── pages/
│       ├── Home.tsx                   # Landing page
│       ├── About.tsx                  # About page
│       ├── Contact.tsx                # Contact form
│       ├── Login.tsx                  # Sign in
│       ├── Register.tsx               # Sign up
│       ├── ForgotPassword.tsx         # Password reset request
│       ├── UpdatePassword.tsx         # Set new password
│       ├── Dashboard.tsx              # Course listing + search
│       ├── Profile.tsx                # User profile
│       ├── CourseYears.tsx            # Year selection
│       ├── YearSemesters.tsx          # Semester selection
│       ├── SemesterSubjects.tsx       # Subject listing
│       ├── SubjectNotes.tsx           # Notes + chatbot
│       ├── AdminPanel.tsx             # Admin dashboard
│       └── NotFound.tsx               # 404 page
│
├── supabase/
│   ├── config.toml                   # Supabase local config
│   ├── functions/
│   │   └── ask-gemini/
│   │       └── index.ts              # Edge function (AI chatbot API)
│   └── migrations/
│       ├── 20251125..._initial.sql          # Schema, RLS, triggers, seed data
│       ├── 20251125..._fix_search_path.sql  # Security fix
│       ├── 20251125..._restrict_rls.sql     # Tighter RLS policies
│       ├── 20251125..._resource_type.sql    # Notes vs question papers
│       ├── 20251125..._contact_messages.sql # Contact form table
│       ├── 20260215..._add_indexes.sql      # Scalability indexes + trigrams
│       └── 20260216..._fix_user_trigger.sql # Branch fix + constraints
│
├── components.json                   # shadcn/ui configuration
├── eslint.config.js                  # ESLint flat config
├── index.html                        # HTML entry point with SEO meta
├── package.json                      # Dependencies & scripts
├── postcss.config.js                 # PostCSS (Tailwind + Autoprefixer)
├── tailwind.config.ts                # Tailwind theme configuration
├── tsconfig.json                     # Base TypeScript config
├── tsconfig.app.json                 # App TypeScript config (strict)
├── tsconfig.node.json                # Vite config TypeScript
├── vercel.json                       # Vercel deployment config + headers
└── vite.config.ts                    # Vite build configuration
```

---

## 15. API Reference

### Edge Function: `ask-gemini`

**Endpoint:** `POST /functions/v1/ask-gemini`

**Authentication:** Bearer token (Supabase JWT) in `Authorization` header — automatically sent by `supabase.functions.invoke()`.

#### Request Body

```json
{
  "message": "Explain binary search trees",
  "context": "Subject: Data Structures, Specific Topic: Trees",
  "history": [
    { "role": "user", "content": "What is a tree?" },
    { "role": "assistant", "content": "A tree is a hierarchical data structure..." }
  ]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `message` | string | Yes | 1-2000 characters |
| `context` | string | No | Subject/topic context |
| `history` | array | No | Max 6 messages (auto-trimmed) |

#### Response

```json
{
  "reply": "## Binary Search Tree (BST)\n\nA BST is a tree data structure where..."
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Invalid JSON body, empty message, message > 2000 chars |
| 401 | Missing or invalid Authorization header |
| 405 | Not a POST request |
| 429 | Rate limited (< 3s since last request) |
| 500 | All AI models failed or internal error |

---

## 16. Setup & Installation

### Prerequisites

- Node.js 22+ (use `.nvmrc`)
- npm 9+
- Supabase account (free tier works)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/bogavivek15/viveks-first-project.git
cd viveks-first-project

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Fill in your Supabase URL, Anon Key (see Section 17)

# 4. Start development server
npm run dev
# Opens at http://localhost:8080

# 5. (Optional) Run TypeScript check
npm run typecheck

# 6. (Optional) Run linter
npm run lint

# 7. Build for production
npm run build
```

### Supabase Setup

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Apply migrations
supabase db push

# 5. Set edge function secrets
supabase secrets set GROQ_API_KEY=your_groq_api_key
supabase secrets set ALLOWED_ORIGIN=https://your-domain.vercel.app

# 6. Deploy edge function
supabase functions deploy ask-gemini
```

---

## 17. Environment Variables

### Frontend (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIs...` |

### Supabase Edge Function Secrets

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for AI chatbot |
| `ALLOWED_ORIGIN` | Frontend domain for CORS (default: `https://studentdesk.vercel.app`) |
| `SUPABASE_URL` | Auto-set by Supabase |
| `SUPABASE_ANON_KEY` | Auto-set by Supabase |

---

## 18. Screenshots & User Flows

### User Flow 1: Student Browsing Notes

```
Home Page → "Get Started" → Register → Verify Email → Login
    → Dashboard → Select Course (e.g., CSE)
        → Select Year (e.g., Year 2)
            → Select Semester (e.g., Sem 1)
                → Select Subject (e.g., Data Structures)
                    → View/Download Notes
                    → Open AI Chatbot → Ask doubts
```

### User Flow 2: Subject Search

```
Dashboard → Type "Data Structures" in search bar
    → See instant results (debounced 300ms)
        → Click on subject → Directly opens Subject Notes page
```

### User Flow 3: Admin Uploading Notes

```
Dashboard → "Admin Panel" button → Upload Notes tab
    → Select Course → Year → Semester → Subject
        → Select Resource Type (Notes / Question Papers)
        → Select Exam Type (Regular / Supply / Both)
        → Enter Title & Description
        → Choose PDF file (max 10MB)
        → Click Upload → Progress bar → Success toast
```

### User Flow 4: AI Chatbot Interaction

```
Subject Notes Page → Click floating chat button (bottom-right)
    → Type "Explain binary search trees"
        → AI responds with Markdown-formatted answer
            → Type "Give more detail in Telugu"
                → AI responds in transliterated Telugu
                    → Type "What are the advantages?"
                        → AI remembers context and gives relevant answer
```

### User Flow 5: Contact Form

```
Contact Page → Fill Name, Email, Message
    → Submit (honeypot + timing check + rate limit)
        → Success toast → Admin sees message in Admin Panel → Messages tab
```

---

## 19. Future Enhancements

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| **Unit & E2E Tests** | Add Vitest + Playwright for automated testing | High |
| **React Query Migration** | Replace manual `useState`/`useEffect` fetching with `useQuery` hooks | High |
| **PWA Support** | Service worker for offline access to downloaded notes | Medium |
| **Notification System** | Email/push notifications when new notes are uploaded | Medium |
| **Analytics Dashboard** | Track downloads, popular subjects, user engagement | Medium |
| **User Contributions** | Allow students to upload their own notes (with admin moderation) | Medium |
| **Sitemap Generation** | Auto-generate `sitemap.xml` for better SEO indexing | Low |
| **Social Auth** | Google/GitHub OAuth login options | Low |
| **Note Previews** | In-browser PDF viewer instead of opening in new tab | Low |
| **Multi-language UI** | i18n support for Hindi, Telugu, and other regional languages | Low |

---

## 20. Conclusion

**STUDENT DESK** is a production-grade, full-stack web application that solves a real problem faced by engineering students — fragmented and inaccessible study materials. The platform provides:

- **Organized access** to notes and question papers through a structured Course → Year → Semester → Subject hierarchy
- **AI-powered learning** with a context-aware chatbot that provides instant doubt resolution on every subject page
- **Enterprise-grade security** with JWT authentication, RLS policies, CSP headers, input validation, and rate limiting
- **Optimized performance** with lazy loading, code splitting, database indexing, and asset caching
- **Modern developer experience** with TypeScript strict mode, ESLint, CI/CD pipeline, and modular architecture

The application demonstrates proficiency in modern web development practices including:

- React component architecture with Context API for state management
- TypeScript strict mode with zero compilation errors
- Serverless backend with Supabase (Auth, Database, Storage, Edge Functions)
- AI/LLM integration with multi-model fallback and conversation memory
- Security-first approach with 7+ security headers and database-level access control
- DevOps with automated CI pipeline and infrastructure-as-code (SQL migrations)

---

*Documentation authored for technical event presentation — February 2026*
