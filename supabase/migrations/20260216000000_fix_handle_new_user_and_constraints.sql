-- Fix handle_new_user() to extract 'branch' from auth.users raw_user_meta_data
-- Previously the trigger only saved name and email, missing branch.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, branch)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.raw_user_meta_data ->> 'branch'
  );
  RETURN NEW;
END;
$$;

-- Add updated_at column to contact_messages if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_messages'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.contact_messages
      ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add text length constraints on notes.title and contact_messages.message
DO $$
BEGIN
  -- notes.title max 500 chars
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'notes' AND constraint_name = 'notes_title_length'
  ) THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_title_length CHECK (char_length(title) <= 500);
  END IF;

  -- contact_messages.message max 2000 chars
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'contact_messages' AND constraint_name = 'contact_messages_message_length'
  ) THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_message_length CHECK (char_length(message) <= 2000);
  END IF;
END $$;

-- Index on notes.uploaded_by for admin queries
CREATE INDEX IF NOT EXISTS idx_notes_uploaded_by ON public.notes (uploaded_by);
