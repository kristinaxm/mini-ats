### Mini ATS

An Applicant Tracking System built with Next.js, Supabase, and OpenAI. This platform helps recruitment teams manage job postings, track candidates, screen CVs with AI, schedule interviews, and make hiring decisions. The system features comprehensive AI assistance throughout the recruitment process, including an intelligent chatbot for instant support and guidance.

---

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Database & Auth:** Supabase (PostgreSQL)
- **AI:** OpenAI API (GPT-4o-mini)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **File Processing:** pdf2json, mammoth
---

### AI Screening Page
Dedicated page with multiple AI-powered recruitment tools:

- **Candidate Ranking:** Rank all candidates by AI match score for a selected job
- **Interview Questions Generator:** Generate custom technical, behavioral, and role-specific questions based on job title and description
- **Gap Analysis:** Analyze why a candidate doesn't match and get actionable suggestions including missing skills, weak areas, training suggestions, and recommendations
- **Job Description Optimizer:** AI-powered job description improvement for inclusivity, engagement, and clarity
- **Batch CV Screening:** Upload multiple CV files and/or paste CV texts for one-time analysis against a job

### AI Chatbot
- Floating chat button available on all pages
- Recruitment-specific assistant answering questions about:
    - Recruitment best practices
    - Interview question suggestions for specific roles
    - Tips for writing better job descriptions
    - Candidate evaluation methods
    - Screening and assessment advice
- Concise, professional responses (2-4 sentences)
- Chat history with clear option

### CV Analysis AI
- Automatically extracts and analyzes CV content from PDF, DOCX, and TXT files
- Provides match scores (0-100%) between candidate CV and job description
- Identifies strengths and gaps in candidate profiles
- Generates custom interview questions based on analysis

### Interview Notes AI
- Analyzes interview notes, strengths, and weaknesses
- Provides objective assessment of candidate fit
- Suggests hiring recommendations based on interview data

---

## Core Features

  
### User Management
- Admin and customer roles with different permissions
- Admin panel for user creation, editing, and deletion
- Secure authentication via Supabase

### Job Management
- Create, edit, and delete job postings
- View job details with associated candidates
- Filter jobs by customer (admin view)

### Candidate Management
- Add candidates manually or via CV upload (PDF, DOCX, TXT)
- AI-powered CV analysis against job descriptions
- Match scoring (0-100%)
- Strengths, gaps, and interview question suggestions
- Batch CV screening

### Kanban Pipeline
- Visual pipeline with columns: New, Reviewed, Interview, Hired, Rejected
- Drag-and-drop from New to Reviewed only
- Status updates propagate to calendar and interview notes

### Interview Calendar
- Schedule interviews with candidates
- Set interview type (online, phone, onsite)
- Add meeting links and notes
- Move candidates to Interview stage automatically

### Interview Notes
- Record interview notes, strengths, weaknesses, and ratings
- AI analysis of interview notes
- Make final decisions (Hire / Further Review / Reject)
- Decisions update candidate status and trigger notifications

### Notifications
- Real-time notifications for interview schedules and hiring decisions
- Bell icon with unread count indicator

---

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```
---
## Database Schema
Required tables (set up in Supabase):

| Table           | Description                                            |
|-----------------|--------------------------------------------------------|
| profiles        | User profiles with role, company name, etc.            |
| jobs            | Job postings with title, description, customer_id, etc. |
| candidates      | Candidate info with status, CV text/URL, AI analysis, etc. |
| interviews      | Scheduled interviews with date, type, meeting link, etc. |
| interview_notes | Notes, ratings, decisions from interviews, etc.        |
| notifications   | User notifications for events                          |
 

---

### Dependencies

Key packages used in this project:

| Package | Purpose |
|---------|--------|
| next | React framework |
| @supabase/supabase-js | Database and authentication |
| openai | AI-powered CV analysis and chatbot |
| pdf2json | PDF text extraction from CVs |
| mammoth | DOCX text extraction from CVs |
| tailwindcss | Styling |
| @dnd-kit/core | Drag-and-drop for Kanban board |
| @radix-ui/react-dialog | Modal dialogs |
| lucide-react | Icons |

---

### Live Demo

**URL:** https://mini-ats-kristina.vercel.app

> **For demo access, please request login credentials via email**

---

### Getting Started

1. Clone the repository

```bash
git clone https://github.com/kristinaxm/mini-ats.git
cd mini-ats
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables (see above)
4. Run the development server

```bash
npm run dev
```

5. Open http://localhost:3000/login

---

### Default Admin Account

The first admin user must be created manually in Supabase:

1. Go to your Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. After creation, update the user's role in the `profiles` table to `admin`

Alternatively, use the admin API endpoints if you have existing admin credentials.  
Subsequent admins can be created via the Admin panel.

---

### Project Structure

```text
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── create-user/route.ts
│   │   │   ├── delete-user/route.ts
│   │   │   ├── update-user-email/route.ts
│   │   │   └── update-user-password/route.ts
│   │   ├── ai/
│   │   │   ├── gap-analysis/route.ts
│   │   │   ├── generate-questions/route.ts
│   │   │   └── optimize-job/route.ts
│   │   ├── analyze-cv/route.ts
│   │   ├── analyze-interview-notes/route.ts
│   │   └── chatbot/route.ts
│   ├── dashboard/
│   │   ├── admin/page.tsx
│   │   ├── ai/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── candidates/page.tsx
│   │   ├── jobs/page.tsx
│   │   ├── kanban/page.tsx
│   │   ├── notes/page.tsx
│   │   └── page.tsx
│   ├── login/page.tsx
│   └── layout.tsx
├── components/
│   ├── Calendar.tsx
│   ├── ChatBot.tsx
│   └── NotificationBell.tsx
├── lib/
│   └── supabase/
│       └── client.ts
├── middleware.ts
└── package.json
```

### AI API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/analyze-cv` | Analyzes CV against job description, returns match score, strengths, gaps, and questions |
| `/api/analyze-interview-notes` | AI analysis of interview notes |
| `/api/chatbot` | AI recruitment assistant for general questions |
| `/api/ai/gap-analysis` | Provides detailed gap analysis with missing skills, weak areas, training suggestions |
| `/api/ai/generate-questions` | Generates technical, behavioral, and role-specific interview questions |
| `/api/ai/optimize-job` | Optimizes job descriptions for inclusivity and engagement |

---

### Authentication Flow

- Users sign in via email/password
- Admins can create new users via the Admin panel
- New users are created in Supabase Auth with email confirmation auto-enabled
- Profiles table stores role and additional user data

---

### Workflow Guide with AI Assistance

1. Admin creates customer accounts

2. Customer creates job postings  
   *(Use AI Job Description Optimizer for better results)*

3. Customer adds candidates  
   *(Manual or CV upload)*

4. AI analyzes CVs and provides:
    - Match scores (0–100%)
    - Identified strengths
    - Skill gaps
    - Suggested interview questions

5. Customer reviews ranked candidates and moves them from **New → Reviewed**

6. Customer schedules interviews via Calendar

7. Customer records interview notes and uses AI analysis for objective assessment

8. Customer makes final decision:
    - Hire
    - Further Review
    - Reject

9. Candidate status updates to **Hired** or **Rejected** with automatic notifications

AI Chatbot is available throughout the entire process for guidance and best practices

---

#### License

```text
Apache License 2.0
```
