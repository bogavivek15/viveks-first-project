-- ==============================================================================
-- AI EXAM INTELLIGENCE SYSTEM MIGRATION
-- Tables: canonical_topics, exam_papers, extracted_questions,
--         topic_forecasts, topic_forecast_items, backtest_evaluations
-- Storage: exam-papers bucket with RLS
-- ==============================================================================

-- 1. Create storage bucket for exam papers if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-papers', 'exam-papers', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exam-papers bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can manage exam papers storage'
  ) THEN
    CREATE POLICY "Admins can manage exam papers storage"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'exam-papers' AND public.has_role(auth.uid(), 'admin'))
      WITH CHECK (bucket_id = 'exam-papers' AND public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can read exam papers storage'
  ) THEN
    CREATE POLICY "Authenticated users can read exam papers storage"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'exam-papers');
  END IF;
END $$;

-- 2. CANONICAL TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.canonical_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL CHECK (unit_number BETWEEN 1 AND 6),
  topic_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, topic_name)
);

ALTER TABLE public.canonical_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view canonical topics"
  ON public.canonical_topics FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert canonical topics"
  ON public.canonical_topics FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update canonical topics"
  ON public.canonical_topics FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete canonical topics"
  ON public.canonical_topics FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for canonical_topics updated_at
CREATE TRIGGER update_canonical_topics_updated_at
  BEFORE UPDATE ON public.canonical_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 3. EXAM PAPERS TABLE
CREATE TABLE IF NOT EXISTS public.exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_year INTEGER NOT NULL CHECK (exam_year >= 2000 AND exam_year <= 2100),
  exam_type public.exam_type NOT NULL DEFAULT 'regular',
  front_image_url TEXT NOT NULL,
  back_image_url TEXT NOT NULL,
  image_hash TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('draft', 'uploading', 'uploaded', 'processing_ocr', 'review_required', 'verified', 'failed')),
  error_message TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view exam papers"
  ON public.exam_papers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert exam papers"
  ON public.exam_papers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exam papers"
  ON public.exam_papers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exam papers"
  ON public.exam_papers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_exam_papers_updated_at
  BEFORE UPDATE ON public.exam_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 4. EXTRACTED QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.extracted_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  canonical_topic_id UUID REFERENCES public.canonical_topics(id) ON DELETE SET NULL,
  exam_year INTEGER NOT NULL,
  question_number TEXT NOT NULL,
  section TEXT,
  question_text TEXT NOT NULL,
  marks INTEGER DEFAULT 10,
  unit_number INTEGER CHECK (unit_number BETWEEN 1 AND 6),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  raw_extracted_topic TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.extracted_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins or students can view verified extracted questions"
  ON public.extracted_questions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR is_verified = true);

CREATE POLICY "Admins can insert extracted questions"
  ON public.extracted_questions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update extracted questions"
  ON public.extracted_questions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete extracted questions"
  ON public.extracted_questions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_extracted_questions_updated_at
  BEFORE UPDATE ON public.extracted_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 5. TOPIC FORECASTS TABLE
CREATE TABLE IF NOT EXISTS public.topic_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_type public.exam_type NOT NULL DEFAULT 'regular',
  total_papers_analyzed INTEGER NOT NULL DEFAULT 0,
  years_range TEXT NOT NULL,
  confidence_rating INTEGER NOT NULL DEFAULT 0 CHECK (confidence_rating BETWEEN 0 AND 100),
  model_version TEXT NOT NULL DEFAULT 'SD-Hybrid-v2.0',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.topic_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published topic forecasts"
  ON public.topic_forecasts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR is_published = true);

CREATE POLICY "Admins can insert topic forecasts"
  ON public.topic_forecasts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update topic forecasts"
  ON public.topic_forecasts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete topic forecasts"
  ON public.topic_forecasts FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_topic_forecasts_updated_at
  BEFORE UPDATE ON public.topic_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 6. TOPIC FORECAST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.topic_forecast_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES public.topic_forecasts(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  canonical_topic_id UUID NOT NULL REFERENCES public.canonical_topics(id) ON DELETE CASCADE,
  forecast_score INTEGER NOT NULL CHECK (forecast_score BETWEEN 0 AND 100),
  priority_tier TEXT NOT NULL CHECK (priority_tier IN ('HIGH', 'MEDIUM', 'LOW')),
  historical_appearances INTEGER NOT NULL DEFAULT 0,
  total_papers INTEGER NOT NULL DEFAULT 0,
  appearance_years INTEGER[] NOT NULL DEFAULT '{}',
  trend TEXT NOT NULL DEFAULT 'CONSISTENT' CHECK (trend IN ('RISING', 'CONSISTENT', 'SPORADIC', 'DECLINING')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.topic_forecast_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published topic forecast items"
  ON public.topic_forecast_items FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (
      SELECT 1 FROM public.topic_forecasts tf 
      WHERE tf.id = forecast_id AND tf.is_published = true
    )
  );

CREATE POLICY "Admins can insert topic forecast items"
  ON public.topic_forecast_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update topic forecast items"
  ON public.topic_forecast_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete topic forecast items"
  ON public.topic_forecast_items FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. BACKTEST EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS public.backtest_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  test_year INTEGER NOT NULL,
  training_years INTEGER[] NOT NULL DEFAULT '{}',
  top_k INTEGER NOT NULL DEFAULT 5,
  hit_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  precision_at_k NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  recall_at_k NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  unit_coverage_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  evaluation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.backtest_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view backtest evaluations"
  ON public.backtest_evaluations FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert backtest evaluations"
  ON public.backtest_evaluations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backtest evaluations"
  ON public.backtest_evaluations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete backtest evaluations"
  ON public.backtest_evaluations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_canonical_topics_subject ON public.canonical_topics (subject_id);
CREATE INDEX IF NOT EXISTS idx_canonical_topics_unit ON public.canonical_topics (subject_id, unit_number);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject_year ON public.exam_papers (subject_id, exam_year);
CREATE INDEX IF NOT EXISTS idx_exam_papers_course ON public.exam_papers (course_id);
CREATE INDEX IF NOT EXISTS idx_extracted_questions_paper ON public.extracted_questions (paper_id);
CREATE INDEX IF NOT EXISTS idx_extracted_questions_subject_verified ON public.extracted_questions (subject_id, is_verified);
CREATE INDEX IF NOT EXISTS idx_extracted_questions_topic ON public.extracted_questions (canonical_topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_forecasts_subject_published ON public.topic_forecasts (subject_id, is_published);
CREATE INDEX IF NOT EXISTS idx_topic_forecast_items_forecast ON public.topic_forecast_items (forecast_id);
CREATE INDEX IF NOT EXISTS idx_topic_forecast_items_topic ON public.topic_forecast_items (canonical_topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_forecast_items_priority ON public.topic_forecast_items (subject_id, priority_tier);
CREATE INDEX IF NOT EXISTS idx_backtest_evaluations_subject_year ON public.backtest_evaluations (subject_id, test_year);
