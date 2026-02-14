# 🎓 Student Desk

**Student Desk** is a full-stack academic resource portal designed for B.Tech students.  
It centralizes study notes and question papers while providing an AI-powered tutor for instant doubt solving.

![Project Status](https://img.shields.io/badge/Status-Development-green)
![Tech Stack](https://img.shields.io/badge/Stack-React_|_Supabase_|_TypeScript-blue)

---

## 🌐 Live Demo

🔗 https://student-desk.online

---

## 🚀 Key Features

- **📂 Structured Repository:** Drill-down navigation (Course → Year → Semester → Subject).
- **🤖 AI Tutor:** Integrated chatbot powered by **Google Gemma 3 (12B)**.
- **📄 PDF Viewer:** View and download notes and question papers.
- **⚡ Real-time Search:** Instant subject search from dashboard.
- **🛡️ Admin Panel:** Secure interface for uploading and managing content.
- **🔐 Secure Auth:** Role-based access control using Supabase Auth.
- **🗄️ Database Security:** Row Level Security (RLS) enabled.

---

## 🛠️ Tech Stack

**Frontend**
- React 18
- Vite
- TypeScript
- Tailwind CSS
- Shadcn/UI
- TanStack React Query

**Backend**
- Supabase (PostgreSQL, Auth, Storage)

**AI Integration**
- Supabase Edge Functions (Deno)
- Google Gemini API (Gemma 3 – 12B)

---

## 🗄️ Database Schema

Primary Tables:

- `profiles` – User identity and roles  
- `user_roles` – Role-based access control  
- `courses` – Academic branches  
- `subjects` – Subject classification  
- `notes` – Metadata for PDF files  
- `contact_messages` – User inquiries  

Row Level Security (RLS) is enabled to protect sensitive data.

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/student-desk.git
cd student-desk

   
2. **Install dependencies**
   npm install
    # or
   bun install
3.**Environment Variables**
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key

4. **Run the Development Server**
    npm run dev

🧠 AI Implementation
The chatbot uses a Supabase Edge Function (ask-gemini) to communicate with the Google Gemma 3 model. It includes:

Context-aware prompting.

Markdown rendering for math and code responses.

Client-side rate limiting (5s cooldown).

📝 Future Enhancements
[ ] Dark Mode toggle.

[ ] Student note uploads (Community sourcing).

[ ] Bookmarking favorite subjects.
