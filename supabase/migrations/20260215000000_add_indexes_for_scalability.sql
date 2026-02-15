-- ============================================================
-- Scalability indexes for STUDENT DESK
-- Covers all major FK columns, composite filters, and search
-- ============================================================

-- 1. subjects: composite index for the most common navigation query
--    (SemesterSubjects page: WHERE course_id = ? AND year = ? AND semester = ?)
CREATE INDEX IF NOT EXISTS idx_subjects_course_year_sem
  ON public.subjects (course_id, year, semester);

-- 2. notes: FK lookup used on SubjectNotes page
CREATE INDEX IF NOT EXISTS idx_notes_subject_id
  ON public.notes (subject_id);

-- 3. notes: FK lookup used in potential admin queries
CREATE INDEX IF NOT EXISTS idx_notes_course_id
  ON public.notes (course_id);

-- 4. user_roles: called on EVERY RLS check via has_role()
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles (user_id);

-- 5. contact_messages: ORDER BY created_at DESC in admin messages tab
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON public.contact_messages (created_at DESC);

-- 6. Enable trigram extension for text search (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 7. Trigram GIN indexes for ILIKE search on Dashboard
CREATE INDEX IF NOT EXISTS idx_subjects_name_trgm
  ON public.subjects USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subjects_code_trgm
  ON public.subjects USING gin (code gin_trgm_ops);
