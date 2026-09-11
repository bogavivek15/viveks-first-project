import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles,
  Upload,
  Layers,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Eye,
  Loader2,
  RefreshCw,
  Award,
} from 'lucide-react';
import { SubjectPaperSetup, SetupConfiguration } from './exam-intelligence/SubjectPaperSetup';
import { PaperUploadCard, PaperSlotData } from './exam-intelligence/PaperUploadCard';
import { CanonicalTopicManager, CanonicalTopic } from './exam-intelligence/CanonicalTopicManager';
import { QuestionVerificationTable, ExtractedQuestion } from './exam-intelligence/QuestionVerificationTable';
import { BacktestModal } from './exam-intelligence/BacktestModal';
import {
  computeSubjectTopicForecast,
  runWalkForwardBacktest,
  BacktestResult,
  ForecastRunOutput,
  RawVerifiedQuestion,
} from '@/lib/forecast-engine';

export function ExamIntelligenceTab() {
  const [activeSubTab, setActiveSubTab] = useState<'setup' | 'papers' | 'topics' | 'verify' | 'forecast'>('setup');
  const [config, setConfig] = useState<SetupConfiguration | null>(null);
  const [paperSlots, setPaperSlots] = useState<PaperSlotData[]>([]);
  const [canonicalTopics, setCanonicalTopics] = useState<CanonicalTopic[]>([]);

  // Processing & Forecasting States
  const [isProcessingVision, setIsProcessingVision] = useState(false);
  const [isComputingForecast, setIsComputingForecast] = useState(false);
  const [forecastOutput, setForecastOutput] = useState<ForecastRunOutput | null>(null);

  // Backtest State
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);

  // Setup handler
  const handleConfigured = (newConfig: SetupConfiguration) => {
    setConfig(newConfig);

    // Generate N initial paper slots with descending years
    const currentYear = new Date().getFullYear();
    const generatedSlots: PaperSlotData[] = Array.from({ length: newConfig.paperCount }, (_, i) => ({
      slotIndex: i,
      examYear: currentYear - (i + 1),
      frontFile: null,
      frontPreview: null,
      frontStats: null,
      backFile: null,
      backPreview: null,
      backStats: null,
      status: 'draft',
    }));

    setPaperSlots(generatedSlots);
    setActiveSubTab('papers');
    toast.success(`Generated ${newConfig.paperCount} paper collection modules for ${newConfig.subjectCode}`);
  };

  const handleSlotChange = (updatedSlot: PaperSlotData) => {
    setPaperSlots((prev) =>
      prev.map((s) => (s.slotIndex === updatedSlot.slotIndex ? updatedSlot : s))
    );
  };

  const handleUploadPaperSlot = async (slot: PaperSlotData) => {
    if (!config) return;
    if (!slot.frontFile || !slot.backFile) {
      toast.error(`Paper #${slot.slotIndex + 1} (${slot.examYear}): Both front and back photos are required`);
      return;
    }

    try {
      handleSlotChange({ ...slot, status: 'uploading', errorMessage: undefined });

      const user = (await supabase.auth.getUser()).data.user;
      const timestamp = Date.now();
      const frontPath = `${config.subjectId}/${slot.examYear}_front_${timestamp}.webp`;
      const backPath = `${config.subjectId}/${slot.examYear}_back_${timestamp}.webp`;

      // Upload Front
      const { error: frontUploadErr } = await supabase.storage
        .from('exam-papers')
        .upload(frontPath, slot.frontFile, { upsert: true });

      if (frontUploadErr) throw new Error(`Front upload failed: ${frontUploadErr.message}`);

      // Upload Back
      const { error: backUploadErr } = await supabase.storage
        .from('exam-papers')
        .upload(backPath, slot.backFile, { upsert: true });

      if (backUploadErr) throw new Error(`Back upload failed: ${backUploadErr.message}`);

      // Save or update exam_papers DB record
      const { data: paperRecord, error: dbErr } = await supabase
        .from('exam_papers')
        .insert({
          subject_id: config.subjectId,
          course_id: config.courseId,
          exam_year: slot.examYear,
          exam_type: config.examType,
          front_image_url: frontPath,
          back_image_url: backPath,
          status: 'uploaded',
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      handleSlotChange({
        ...slot,
        dbId: paperRecord.id,
        status: 'uploaded',
      });

      toast.success(`Paper #${slot.slotIndex + 1} (${slot.examYear}) saved to cloud storage!`);
    } catch (err: any) {
      console.error('Upload error:', err);
      handleSlotChange({
        ...slot,
        status: 'failed',
        errorMessage: err.message || 'Upload failed',
      });
      toast.error(`Upload error on Paper ${slot.slotIndex + 1}: ${err.message}`);
    }
  };

  const handleUploadAllPapers = async () => {
    const readySlots = paperSlots.filter((s) => s.frontFile && s.backFile && s.status !== 'uploaded');
    if (readySlots.length === 0) {
      toast.info('All complete papers are already uploaded');
      return;
    }

    toast.loading(`Uploading ${readySlots.length} papers...`, { id: 'bulk-upload' });
    for (const slot of readySlots) {
      await handleUploadPaperSlot(slot);
    }
    toast.dismiss('bulk-upload');
    toast.success('All valid papers uploaded to cloud storage!');
  };

  const handleRunVisionOCR = async (slot: PaperSlotData) => {
    if (!config) return;
    if (!slot.dbId) {
      toast.error('Please upload this paper before triggering Vision AI OCR');
      return;
    }

    try {
      handleSlotChange({ ...slot, status: 'processing_ocr' });
      setIsProcessingVision(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Authentication session expired');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/process-exam-paper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          paper_id: slot.dbId,
          front_storage_path: `${config.subjectId}/${slot.examYear}_front.webp`,
          back_storage_path: `${config.subjectId}/${slot.examYear}_back.webp`,
          subject_id: config.subjectId,
          exam_year: slot.examYear,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      handleSlotChange({ ...slot, status: 'review_required' });
      toast.success(`Vision OCR extracted ${result.extracted_count} questions for ${slot.examYear}! Review in Verification tab.`);
      setActiveSubTab('verify');
    } catch (err: any) {
      console.error('Vision OCR failed:', err);
      handleSlotChange({ ...slot, status: 'failed', errorMessage: err.message });
      toast.error(`OCR Extraction error: ${err.message}`);
    } finally {
      setIsProcessingVision(false);
    }
  };

  const handleComputeForecast = async () => {
    if (!config) {
      toast.error('Please configure academic subject first');
      return;
    }

    try {
      setIsComputingForecast(true);

      // Fetch all verified questions for this subject
      const { data: verifiedQuestions, error: qErr } = await supabase
        .from('extracted_questions')
        .select(`
          id, exam_year, question_number, section, question_text, marks, unit_number,
          canonical_topic_id,
          canonical_topics ( topic_name )
        `)
        .eq('subject_id', config.subjectId)
        .eq('is_verified', true);

      if (qErr) throw qErr;

      if (!verifiedQuestions || verifiedQuestions.length === 0) {
        toast.error('No verified questions found for this subject. Please verify questions in the Verification tab.');
        return;
      }

      // Fetch all canonical topics
      const { data: topics, error: tErr } = await supabase
        .from('canonical_topics')
        .select('id, topic_name, unit_number')
        .eq('subject_id', config.subjectId);

      if (tErr) throw tErr;

      if (!topics || topics.length === 0) {
        toast.error('No canonical topics defined. Please configure syllabus topics.');
        return;
      }

      // Transform to RawVerifiedQuestion format
      const rawList: RawVerifiedQuestion[] = verifiedQuestions.map((q: any) => ({
        id: q.id,
        exam_year: q.exam_year,
        question_number: q.question_number,
        section: q.section,
        question_text: q.question_text,
        marks: q.marks,
        unit_number: q.unit_number,
        canonical_topic_id: q.canonical_topic_id,
        topic_name: q.canonical_topics?.topic_name || 'Unassigned',
      }));

      // 1. Run client-side deterministic forecasting formula
      const output = computeSubjectTopicForecast(config.subjectId, rawList, topics);
      setForecastOutput(output);

      // 2. Persist to Supabase DB for student dashboard consumption
      const user = (await supabase.auth.getUser()).data.user;

      const { data: forecastRecord, error: fError } = await supabase
        .from('topic_forecasts')
        .insert({
          subject_id: config.subjectId,
          course_id: config.courseId,
          exam_type: config.examType,
          total_papers_analyzed: output.total_papers_analyzed,
          years_range: output.years_range,
          confidence_rating: output.confidence_rating,
          model_version: 'SD-Hybrid-v2.0',
          is_published: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (fError) throw fError;

      const forecastItems = output.items.map((item) => ({
        forecast_id: forecastRecord.id,
        subject_id: config.subjectId,
        canonical_topic_id: item.canonical_topic_id,
        forecast_score: item.forecast_score,
        priority_tier: item.priority_tier,
        historical_appearances: item.historical_appearances,
        total_papers: item.total_papers,
        appearance_years: item.appearance_years,
        trend: item.trend,
        evidence: item.evidence as any,
      }));

      const { error: itemErr } = await supabase
        .from('topic_forecast_items')
        .insert(forecastItems);

      if (itemErr) throw itemErr;

      toast.success(`Calculated and published forecast for ${output.items.length} topics!`);
      setActiveSubTab('forecast');
    } catch (err: any) {
      console.error('Forecast computation error:', err);
      toast.error(`Forecast error: ${err.message}`);
    } finally {
      setIsComputingForecast(false);
    }
  };

  const handleRunBacktest = async () => {
    if (!config) return;

    try {
      setIsRunningBacktest(true);

      const { data: verifiedQuestions } = await supabase
        .from('extracted_questions')
        .select(`
          id, exam_year, question_number, section, question_text, marks, unit_number,
          canonical_topic_id,
          canonical_topics ( topic_name )
        `)
        .eq('subject_id', config.subjectId)
        .eq('is_verified', true);

      const { data: topics } = await supabase
        .from('canonical_topics')
        .select('id, topic_name, unit_number')
        .eq('subject_id', config.subjectId);

      if (!verifiedQuestions || !topics) {
        toast.error('Insufficient data for backtest');
        return;
      }

      const rawList: RawVerifiedQuestion[] = verifiedQuestions.map((q: any) => ({
        id: q.id,
        exam_year: q.exam_year,
        question_number: q.question_number,
        section: q.section,
        question_text: q.question_text,
        marks: q.marks,
        unit_number: q.unit_number,
        canonical_topic_id: q.canonical_topic_id,
        topic_name: q.canonical_topics?.topic_name || 'Unassigned',
      }));

      const result = runWalkForwardBacktest(config.subjectId, rawList, topics, 5);

      if (!result) {
        toast.error('Requires at least 3 distinct historical exam years to perform walk-forward backtesting.');
        return;
      }

      setBacktestResult(result);

      // Save to backtest_evaluations table
      await supabase.from('backtest_evaluations').insert({
        subject_id: config.subjectId,
        course_id: config.courseId,
        test_year: result.test_year,
        training_years: result.training_years,
        top_k: result.top_k,
        hit_rate: result.hit_rate,
        precision_at_k: result.precision_at_k,
        recall_at_k: result.recall_at_k,
        unit_coverage_percent: result.unit_coverage_percent,
        evaluation_summary: result as any,
      });

      toast.success(`Backtest completed: ${result.hit_rate}% Top-5 Hit Rate on ${result.test_year} Exam!`);
    } catch (err: any) {
      console.error('Backtest error:', err);
      toast.error(`Backtest failed: ${err.message}`);
    } finally {
      setIsRunningBacktest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Exam Intelligence Studio
          </h2>
          <p className="text-sm text-muted-foreground">
            Previous-Year Question Paper Topic Forecasting Engine with Human-in-the-Loop Verification
          </p>
        </div>

        {config && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono font-semibold">
              {config.subjectCode} • {config.subjectName}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsBacktestModalOpen(true);
                if (!backtestResult) handleRunBacktest();
              }}
              className="gap-1.5 text-xs text-primary border-primary/30"
            >
              <Award className="h-3.5 w-3.5" /> Backtest Scorecard
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeSubTab} onValueChange={(val: any) => setActiveSubTab(val)} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="setup">1. Subject Setup</TabsTrigger>
          <TabsTrigger value="topics" disabled={!config}>2. Canonical Topics</TabsTrigger>
          <TabsTrigger value="papers" disabled={!config}>3. Paper Capture ({paperSlots.length})</TabsTrigger>
          <TabsTrigger value="verify" disabled={!config}>4. Verification</TabsTrigger>
          <TabsTrigger value="forecast" disabled={!config}>5. Topic Forecast</TabsTrigger>
        </TabsList>

        {/* STEP 1: SUBJECT SETUP */}
        <TabsContent value="setup" className="space-y-4">
          <SubjectPaperSetup onConfigure={handleConfigured} initialConfig={config} />
        </TabsContent>

        {/* STEP 2: CANONICAL TOPIC MANAGER */}
        <TabsContent value="topics" className="space-y-4">
          {config && (
            <CanonicalTopicManager
              subjectId={config.subjectId}
              subjectName={config.subjectName}
              onTopicsUpdated={setCanonicalTopics}
            />
          )}
        </TabsContent>

        {/* STEP 3: PAPER UPLOAD CARDS */}
        <TabsContent value="papers" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border">
            <div className="text-xs">
              <span className="font-semibold text-foreground">Active Subject:</span> {config?.subjectCode} — {config?.subjectName}
              <span className="mx-2">•</span>
              <span>{paperSlots.filter((s) => s.frontFile && s.backFile).length} of {paperSlots.length} papers ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleUploadAllPapers} className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" /> Upload All to Storage
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paperSlots.map((slot) => (
              <div key={slot.slotIndex} className="space-y-2">
                <PaperUploadCard
                  slot={slot}
                  onChange={handleSlotChange}
                  onRemove={
                    paperSlots.length > 2
                      ? () => setPaperSlots((prev) => prev.filter((s) => s.slotIndex !== slot.slotIndex))
                      : undefined
                  }
                />
                <div className="flex justify-end gap-2 px-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUploadPaperSlot(slot)}
                    disabled={!slot.frontFile || !slot.backFile || slot.status === 'uploaded'}
                    className="h-7 text-xs"
                  >
                    Save & Upload
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRunVisionOCR(slot)}
                    disabled={slot.status !== 'uploaded' || isProcessingVision}
                    className="h-7 text-xs gap-1 bg-primary"
                  >
                    {slot.status === 'processing_ocr' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Extract Questions (Vision AI)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* STEP 4: VERIFICATION WORKSPACE */}
        <TabsContent value="verify" className="space-y-4">
          {config && (
            <QuestionVerificationTable
              subjectId={config.subjectId}
              subjectName={config.subjectName}
              canonicalTopics={canonicalTopics}
              onVerificationChange={() => {}}
            />
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleComputeForecast}
              disabled={isComputingForecast}
              className="gap-2 bg-gradient-to-r from-primary to-accent"
            >
              {isComputingForecast ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              Run Multi-Factor Topic Forecasting & Backtesting
            </Button>
          </div>
        </TabsContent>

        {/* STEP 5: FORECAST OUTPUT */}
        <TabsContent value="forecast" className="space-y-4">
          {!forecastOutput ? (
            <Card className="text-center py-12">
              <CardContent>
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                <CardTitle className="text-base mb-1">No Active Forecast Generated</CardTitle>
                <CardDescription className="text-xs mb-4">
                  Verify historical questions in Step 4, then click "Run Multi-Factor Topic Forecasting".
                </CardDescription>
                <Button onClick={handleComputeForecast} disabled={isComputingForecast} size="sm">
                  {isComputingForecast ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Calculate Forecast Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Forecast Summary Header Card */}
              <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">
                          {config?.subjectCode} Topic Forecast ({forecastOutput.years_range})
                        </CardTitle>
                        <Badge
                          variant={
                            forecastOutput.data_state === 'ROBUST'
                              ? 'default'
                              : forecastOutput.data_state === 'LIMITED'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="text-xs"
                        >
                          {forecastOutput.data_state === 'ROBUST'
                            ? 'Robust Basis'
                            : forecastOutput.data_state === 'LIMITED'
                            ? 'Limited Sample'
                            : 'Insufficient Data'}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Synthesized across {forecastOutput.total_papers_analyzed} historical examination papers •
                        Data Confidence: <strong>{forecastOutput.confidence_rating}%</strong>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBacktestModalOpen(true)}
                        className="gap-1.5 text-xs text-primary"
                      >
                        <Award className="h-3.5 w-3.5" /> View Backtest Scorecard
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleComputeForecast}
                        disabled={isComputingForecast}
                        className="gap-1.5 text-xs"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isComputingForecast ? 'animate-spin' : ''}`} />
                        Re-Calculate
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {/* HIGH PRIORITY */}
                    <div className="p-3 rounded-lg border bg-background/80 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-600">HIGH PRIORITY TOPICS</span>
                        <Badge className="bg-emerald-600 text-white text-[10px] h-4">
                          {forecastOutput.items.filter((i) => i.priority_tier === 'HIGH').length}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Recurring high-frequency, high-marks exam questions.
                      </p>
                    </div>

                    {/* MEDIUM PRIORITY */}
                    <div className="p-3 rounded-lg border bg-background/80 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-600">MEDIUM PRIORITY TOPICS</span>
                        <Badge className="bg-amber-600 text-white text-[10px] h-4">
                          {forecastOutput.items.filter((i) => i.priority_tier === 'MEDIUM').length}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Alternating years, unit-balance candidates, moderate frequency.
                      </p>
                    </div>

                    {/* LOW PRIORITY */}
                    <div className="p-3 rounded-lg border bg-background/80 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-muted-foreground">LOW PRIORITY TOPICS</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {forecastOutput.items.filter((i) => i.priority_tier === 'LOW').length}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Infrequently examined; secondary concepts.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ranked Topic Cards */}
              <div className="space-y-3">
                {forecastOutput.items.map((item, idx) => (
                  <div
                    key={item.canonical_topic_id}
                    className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-muted-foreground w-6">
                          #{idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            {item.topic_name}
                            <Badge variant="outline" className="text-[10px] font-normal">
                              Unit {item.unit_number}
                            </Badge>
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Appeared in {item.historical_appearances} of {item.total_papers} papers (
                            {item.evidence.appearance_percentage}%) • Years: [{item.appearance_years.join(', ')}]
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Badge
                          variant={
                            item.priority_tier === 'HIGH'
                              ? 'default'
                              : item.priority_tier === 'MEDIUM'
                              ? 'secondary'
                              : 'outline'
                          }
                          className={`text-xs ${
                            item.priority_tier === 'HIGH'
                              ? 'bg-emerald-600 text-white'
                              : item.priority_tier === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-700 border-amber-300'
                              : ''
                          }`}
                        >
                          {item.priority_tier} PRIORITY
                        </Badge>

                        <div className="text-right">
                          <span className="text-xl font-bold text-primary">{item.forecast_score}</span>
                          <span className="text-xs text-muted-foreground">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Historical Evidence Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Evidence:</span>
                      <span className="p-1 rounded bg-muted/50 border">
                        Avg Marks: <strong>{item.evidence.marks_profile.average_marks}</strong>
                      </span>
                      <span className="p-1 rounded bg-muted/50 border">
                        Unit {item.unit_number} Standing: <strong>#{item.evidence.unit_standing.rank_in_unit}</strong> ({item.evidence.unit_standing.unit_question_share_percent}% share)
                      </span>
                      <span className="p-1 rounded bg-muted/50 border">
                        Last Appeared: <strong>{item.evidence.last_appeared_year || 'N/A'}</strong>
                      </span>
                      <span className="p-1 rounded bg-muted/50 border">
                        Trend: <strong>{item.trend}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Backtest Modal */}
      <BacktestModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        result={backtestResult}
        subjectName={config?.subjectName || 'Subject'}
        onRunBacktest={handleRunBacktest}
        isRunning={isRunningBacktest}
      />
    </div>
  );
}
export default ExamIntelligenceTab;
