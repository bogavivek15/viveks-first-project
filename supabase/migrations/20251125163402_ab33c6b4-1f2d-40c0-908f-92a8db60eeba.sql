-- Add resource_type enum to differentiate between notes and question papers
CREATE TYPE public.resource_type AS ENUM ('notes', 'question_papers');

-- Add resource_type column to notes table with default value
ALTER TABLE public.notes 
ADD COLUMN resource_type public.resource_type NOT NULL DEFAULT 'notes';

-- Update existing records to have 'notes' as resource_type (already default)
-- Future uploads can specify 'question_papers' as needed