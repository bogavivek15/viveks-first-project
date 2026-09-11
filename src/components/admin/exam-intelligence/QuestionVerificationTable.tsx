import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  CheckCheck,
  Search,
  Filter,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { CanonicalTopic } from './CanonicalTopicManager';

export interface ExtractedQuestion {
  id: string;
  paper_id: string;
  subject_id: string;
  canonical_topic_id: string | null;
  exam_year: number;
  question_number: string;
  section: string | null;
  question_text: string;
  marks: number | null;
  unit_number: number | null;
  is_verified: boolean;
  confidence: number;
  raw_extracted_topic: string | null;
}

interface QuestionVerificationTableProps {
  subjectId: string;
  subjectName: string;
  canonicalTopics: CanonicalTopic[];
  onVerificationChange?: () => void;
}

export function QuestionVerificationTable({
  subjectId,
  subjectName,
  canonicalTopics,
  onVerificationChange,
}: QuestionVerificationTableProps) {
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filters
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add missing question dialog state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newNumber, setNewNumber] = useState('');
  const [newSection, setNewSection] = useState('Part A');
  const [newText, setNewText] = useState('');
  const [newMarks, setNewMarks] = useState('10');
  const [newUnit, setNewUnit] = useState('1');
  const [newTopicId, setNewTopicId] = useState<string>('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  useEffect(() => {
    if (subjectId) {
      fetchQuestions();
    }
  }, [subjectId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('extracted_questions')
        .select('*')
        .eq('subject_id', subjectId)
        .order('exam_year', { ascending: false })
        .order('question_number', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err: any) {
      console.error('Failed to fetch extracted questions:', err);
      toast.error('Failed to load extracted questions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async (id: string, updates: Partial<ExtractedQuestion>) => {
    try {
      setSavingId(id);
      const { error } = await supabase
        .from('extracted_questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
      );
      toast.success('Question updated');
      onVerificationChange?.();
    } catch (err: any) {
      console.error('Error updating question:', err);
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleVerified = async (q: ExtractedQuestion) => {
    const nextStatus = !q.is_verified;
    await handleUpdateQuestion(q.id, { is_verified: nextStatus });
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('extracted_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success('Question removed');
      onVerificationChange?.();
    } catch (err: any) {
      console.error('Delete question error:', err);
      toast.error('Failed to delete question');
    }
  };

  const handleVerifyAllVisible = async () => {
    const unverified = filteredQuestions.filter((q) => !q.is_verified);
    if (unverified.length === 0) {
      toast.info('All displayed questions are already verified');
      return;
    }

    try {
      const ids = unverified.map((q) => q.id);
      const { error } = await supabase
        .from('extracted_questions')
        .update({ is_verified: true })
        .in('id', ids);

      if (error) throw error;

      setQuestions((prev) =>
        prev.map((q) => (ids.includes(q.id) ? { ...q, is_verified: true } : q))
      );
      toast.success(`Verified ${ids.length} questions successfully`);
      onVerificationChange?.();
    } catch (err: any) {
      console.error('Verify all error:', err);
      toast.error('Failed to verify questions');
    }
  };

  const handleAutoAssignCanonicalTopics = async () => {
    if (canonicalTopics.length === 0) {
      toast.error('Please define canonical topics first in the syllabus manager.');
      return;
    }

    let matchCount = 0;
    const updatesToMake: { id: string; canonical_topic_id: string; unit_number: number }[] = [];

    for (const q of questions) {
      if (q.canonical_topic_id) continue; // Already assigned

      const textLower = q.question_text.toLowerCase();
      let matchedTopic: CanonicalTopic | null = null;

      // 1. Direct Topic Name Search
      for (const t of canonicalTopics) {
        if (textLower.includes(t.topic_name.toLowerCase())) {
          matchedTopic = t;
          break;
        }
      }

      // 2. Alias Search if not matched
      if (!matchedTopic) {
        for (const t of canonicalTopics) {
          if (t.aliases?.some((alias) => textLower.includes(alias.toLowerCase()))) {
            matchedTopic = t;
            break;
          }
        }
      }

      if (matchedTopic) {
        updatesToMake.push({
          id: q.id,
          canonical_topic_id: matchedTopic.id,
          unit_number: matchedTopic.unit_number,
        });
        matchCount++;
      }
    }

    if (updatesToMake.length === 0) {
      toast.info('No new automatic topic matches found based on current aliases.');
      return;
    }

    try {
      for (const item of updatesToMake) {
        await supabase
          .from('extracted_questions')
          .update({
            canonical_topic_id: item.canonical_topic_id,
            unit_number: item.unit_number,
          })
          .eq('id', item.id);
      }

      toast.success(`Automatically mapped ${matchCount} questions to canonical syllabus topics!`);
      fetchQuestions();
      onVerificationChange?.();
    } catch (err: any) {
      console.error('Auto match error:', err);
      toast.error('Error during auto topic mapping');
    }
  };

  const handleCreateMissingQuestion = async () => {
    if (!newNumber.trim() || !newText.trim()) {
      toast.error('Question number and text are required');
      return;
    }

    try {
      setIsSubmittingNew(true);

      // Find or create a placeholder paper_id for this year
      let { data: papers } = await supabase
        .from('exam_papers')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('exam_year', parseInt(newYear))
        .limit(1);

      let targetPaperId: string;
      if (papers && papers.length > 0) {
        targetPaperId = papers[0].id;
      } else {
        // Find courses
        const { data: subj } = await supabase
          .from('subjects')
          .select('course_id')
          .eq('id', subjectId)
          .single();

        const { data: newPaper, error: paperError } = await supabase
          .from('exam_papers')
          .insert({
            subject_id: subjectId,
            course_id: subj?.course_id || '',
            exam_year: parseInt(newYear),
            front_image_url: 'manual_entry',
            back_image_url: 'manual_entry',
            status: 'verified',
          })
          .select()
          .single();

        if (paperError) throw paperError;
        targetPaperId = newPaper.id;
      }

      const { error: qError } = await supabase.from('extracted_questions').insert({
        paper_id: targetPaperId,
        subject_id: subjectId,
        exam_year: parseInt(newYear),
        question_number: newNumber.trim(),
        section: newSection.trim() || null,
        question_text: newText.trim(),
        marks: parseInt(newMarks) || 10,
        unit_number: parseInt(newUnit) || 1,
        canonical_topic_id: newTopicId || null,
        is_verified: true,
        confidence: 1.0,
      });

      if (qError) throw qError;

      toast.success('Question added and verified');
      setIsAddModalOpen(false);
      setNewNumber('');
      setNewText('');
      fetchQuestions();
      onVerificationChange?.();
    } catch (err: any) {
      console.error('Add question error:', err);
      toast.error(`Failed to add question: ${err.message}`);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Distinct years present in dataset
  const availableYears = Array.from(new Set(questions.map((q) => q.exam_year))).sort((a, b) => b - a);

  // Filtered list
  const filteredQuestions = questions.filter((q) => {
    if (yearFilter !== 'all' && q.exam_year !== parseInt(yearFilter)) return false;
    if (statusFilter === 'verified' && !q.is_verified) return false;
    if (statusFilter === 'pending' && q.is_verified) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.question_text.toLowerCase().includes(query);
      const matchNum = q.question_number.toLowerCase().includes(query);
      const matchSection = q.section?.toLowerCase().includes(query);
      if (!matchText && !matchNum && !matchSection) return false;
    }
    return true;
  });

  const verifiedCount = questions.filter((q) => q.is_verified).length;
  const pendingCount = questions.length - verifiedCount;

  return (
    <Card className="border border-border shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Human Verification Workspace</CardTitle>
              <Badge variant="outline" className="text-xs">
                {questions.length} Extracted Questions
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Review, correct, and map questions to syllabus topics. Only verified questions are used for analytical forecasting.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoAssignCanonicalTopics}
              className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
              title="Automatically match questions to syllabus topics using keyword aliases"
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-Map Topics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyAllVisible}
              disabled={filteredQuestions.length === 0}
              className="gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Verify Visible ({filteredQuestions.filter((q) => !q.is_verified).length})
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Missing Question
            </Button>
          </div>
        </div>

        {/* Verification Status Summary Bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">Verified:</span>
            <Badge variant="default" className="bg-emerald-600 text-white text-[11px] h-5">
              {verifiedCount}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">Pending Review:</span>
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-amber-300 text-[11px] h-5">
              {pendingCount}
            </Badge>
          </div>
          {questions.length > 0 && (
            <span className="text-muted-foreground ml-auto text-[11px]">
              {Math.round((verifiedCount / questions.length) * 100)}% of historical dataset verified
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-lg bg-muted/40 border">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search question text, number (e.g. Q1), section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Year Filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={yr.toString()}>
                    Exam {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Questions Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading extracted questions...
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium">No questions match the current filters</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload and process question paper photographs above, or add a missing question manually.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((q) => {
              const assignedTopic = canonicalTopics.find((t) => t.id === q.canonical_topic_id);

              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-lg border transition-colors ${
                    q.is_verified
                      ? 'bg-card border-border/80'
                      : 'bg-amber-500/5 border-amber-400/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-2.5">
                    {/* Header: Year, Number, Section, Marks, Unit */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono font-bold text-xs bg-muted/60">
                        {q.exam_year}
                      </Badge>

                      <div className="w-20">
                        <Input
                          value={q.question_number}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, question_number: e.target.value } : item
                              )
                            )
                          }
                          onBlur={(e) => handleUpdateQuestion(q.id, { question_number: e.target.value })}
                          className="h-7 text-xs font-semibold px-2"
                          placeholder="Q1(a)"
                        />
                      </div>

                      <div className="w-24">
                        <Input
                          value={q.section || ''}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, section: e.target.value } : item
                              )
                            )
                          }
                          onBlur={(e) => handleUpdateQuestion(q.id, { section: e.target.value })}
                          className="h-7 text-xs px-2"
                          placeholder="Section"
                        />
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Marks:</span>
                        <Input
                          type="number"
                          value={q.marks || 10}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((item) =>
                                item.id === q.id ? { ...item, marks: parseInt(e.target.value) || 0 } : item
                              )
                            )
                          }
                          onBlur={(e) =>
                            handleUpdateQuestion(q.id, { marks: parseInt(e.target.value) || 0 })
                          }
                          className="h-7 w-16 text-xs px-2"
                        />
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Unit:</span>
                        <Select
                          value={q.unit_number ? q.unit_number.toString() : '1'}
                          onValueChange={(val) => handleUpdateQuestion(q.id, { unit_number: parseInt(val) })}
                        >
                          <SelectTrigger className="h-7 w-[90px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Unit 1</SelectItem>
                            <SelectItem value="2">Unit 2</SelectItem>
                            <SelectItem value="3">Unit 3</SelectItem>
                            <SelectItem value="4">Unit 4</SelectItem>
                            <SelectItem value="5">Unit 5</SelectItem>
                            <SelectItem value="6">Unit 6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {q.confidence < 0.9 && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          OCR Conf: {Math.round(q.confidence * 100)}%
                        </Badge>
                      )}
                    </div>

                    {/* Verification Toggle & Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Button
                        size="sm"
                        variant={q.is_verified ? 'default' : 'outline'}
                        onClick={() => handleToggleVerified(q)}
                        className={`h-7 text-xs px-2.5 gap-1 ${
                          q.is_verified
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'border-amber-400 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {q.is_verified ? 'Verified' : 'Mark Verified'}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete this question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Question Textarea (Editable) */}
                  <div className="space-y-2 mb-2.5">
                    <Textarea
                      value={q.question_text}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((item) =>
                            item.id === q.id ? { ...item, question_text: e.target.value } : item
                          )
                        )
                      }
                      onBlur={(e) => handleUpdateQuestion(q.id, { question_text: e.target.value })}
                      className="text-xs min-h-[56px] leading-relaxed resize-y font-normal"
                      placeholder="Question text..."
                    />
                  </div>

                  {/* Canonical Topic Selector */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
                    <span className="text-muted-foreground font-medium">Mapped Topic:</span>
                    <div className="flex-1 min-w-[220px] max-w-sm">
                      <Select
                        value={q.canonical_topic_id || 'unassigned'}
                        onValueChange={(val) =>
                          handleUpdateQuestion(q.id, {
                            canonical_topic_id: val === 'unassigned' ? null : val,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Assign Canonical Topic..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">-- Unassigned Topic --</SelectItem>
                          {canonicalTopics.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              [Unit {t.unit_number}] {t.topic_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {assignedTopic ? (
                      <Badge variant="secondary" className="text-[11px] h-5 bg-primary/10 text-primary border-primary/20">
                        Unit {assignedTopic.unit_number}: {assignedTopic.topic_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] h-5 text-amber-600 border-amber-300">
                        Topic Unassigned
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Missing Question Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Missing Historical Question</DialogTitle>
            <DialogDescription>
              Manually append a question from an exam paper that was not captured by OCR.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold block mb-1">Exam Year</label>
                <Input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Question #</label>
                <Input
                  placeholder="e.g. Q3(b)"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Section</label>
                <Input
                  placeholder="e.g. Part B"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Marks</label>
                <Input
                  type="number"
                  value={newMarks}
                  onChange={(e) => setNewMarks(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Syllabus Unit</label>
                <Select value={newUnit} onValueChange={setNewUnit}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Unit 1</SelectItem>
                    <SelectItem value="2">Unit 2</SelectItem>
                    <SelectItem value="3">Unit 3</SelectItem>
                    <SelectItem value="4">Unit 4</SelectItem>
                    <SelectItem value="5">Unit 5</SelectItem>
                    <SelectItem value="6">Unit 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Canonical Topic</label>
              <Select value={newTopicId} onValueChange={setNewTopicId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Topic..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Assign Later --</SelectItem>
                  {canonicalTopics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      [Unit {t.unit_number}] {t.topic_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Question Text</label>
              <Textarea
                placeholder="Write full examination question text..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="text-xs min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateMissingQuestion} disabled={isSubmittingNew}>
              {isSubmittingNew ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Add & Verify Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
