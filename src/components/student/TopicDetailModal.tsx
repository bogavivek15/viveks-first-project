import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
  Download,
  Eye,
  BookOpen,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';

export interface DisplayTopicItem {
  canonical_topic_id: string;
  topic_name: string;
  unit_number?: number;
  forecast_score: number;
  priority_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  historical_appearances: number;
  total_papers: number;
  appearance_years: number[];
  trend: string;
  evidence: {
    appearance_percentage: number;
    appearance_years: number[];
    last_appeared_year: number;
    is_recent: boolean;
    marks_profile: {
      min_marks: number;
      max_marks: number;
      average_marks: number;
      total_historical_marks: number;
    };
    unit_standing: {
      unit_number: number;
      rank_in_unit: number;
      unit_question_share_percent: number;
    };
    verified_question_samples: {
      year: number;
      question_number: string;
      marks: number;
      text_snippet: string;
    }[];
  };
}

interface NoteMatch {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
}

interface TopicDetailModalProps {
  topic: DisplayTopicItem | null;
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  onViewNote?: (fileUrl: string) => void;
  onDownloadNote?: (fileUrl: string, fileName: string) => void;
}

export function TopicDetailModal({
  topic,
  subjectId,
  subjectName,
  onClose,
  onViewNote,
  onDownloadNote,
}: TopicDetailModalProps) {
  const [matchedNotes, setMatchedNotes] = useState<NoteMatch[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (topic && subjectId) {
      fetchRelatedNotes();
    } else {
      setMatchedNotes([]);
    }
  }, [topic, subjectId]);

  const fetchRelatedNotes = async () => {
    if (!topic) return;

    try {
      setLoadingNotes(true);
      // Query existing notes for this subject
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, description, file_url, file_name')
        .eq('subject_id', subjectId)
        .eq('resource_type', 'notes');

      if (error) throw error;

      if (!data || data.length === 0) {
        setMatchedNotes([]);
        return;
      }

      // Safe matching: Look for keyword in title/description or unit keyword
      const topicNameLower = topic.topic_name.toLowerCase();
      const topicKeywords = topicNameLower.split(/\s+/).filter((w) => w.length > 3);

      const relevant = data.filter((note) => {
        const titleLower = note.title.toLowerCase();
        const descLower = (note.description || '').toLowerCase();

        // 1. Direct topic name in note
        if (titleLower.includes(topicNameLower) || descLower.includes(topicNameLower)) {
          return true;
        }

        // 2. Unit match (e.g. "Unit 3" or "Unit III")
        const unitNum = topic.unit_number || topic.evidence?.unit_standing?.unit_number;
        if (unitNum) {
          const romanNumerals = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi'];
          const unitStr1 = `unit ${unitNum}`;
          const unitStr2 = `unit ${romanNumerals[unitNum]}`;
          if (titleLower.includes(unitStr1) || titleLower.includes(unitStr2)) {
            return true;
          }
        }

        // 3. Keyword match
        return topicKeywords.some((k) => titleLower.includes(k));
      });

      setMatchedNotes(relevant);
    } catch (err) {
      console.error('Failed to load related study notes:', err);
      setMatchedNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  if (!topic) return null;

  const allRecordedYears = Array.from(
    new Set([...topic.appearance_years, topic.evidence?.last_appeared_year])
  ).filter((y) => y > 0).sort((a, b) => a - b);

  return (
    <Dialog open={!!topic} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge
              variant={
                topic.priority_tier === 'HIGH'
                  ? 'default'
                  : topic.priority_tier === 'MEDIUM'
                  ? 'secondary'
                  : 'outline'
              }
              className={
                topic.priority_tier === 'HIGH'
                  ? 'bg-emerald-600 text-white'
                  : topic.priority_tier === 'MEDIUM'
                  ? 'bg-amber-500/15 text-amber-700 border-amber-300'
                  : ''
              }
            >
              {topic.priority_tier} PRIORITY
            </Badge>

            <div className="flex items-center gap-1.5 text-right">
              <span className="text-2xl font-bold text-primary">{topic.forecast_score}</span>
              <span className="text-xs text-muted-foreground">/100 Score</span>
            </div>
          </div>

          <DialogTitle className="text-xl mt-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {topic.topic_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Syllabus Unit {topic.unit_number || topic.evidence?.unit_standing?.unit_number || 1} • {subjectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg border bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Frequency</p>
              <p className="text-lg font-bold text-foreground">{topic.evidence?.appearance_percentage || 0}%</p>
              <p className="text-[10px] text-muted-foreground">
                {topic.historical_appearances} of {topic.total_papers} papers
              </p>
            </div>

            <div className="p-2.5 rounded-lg border bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Avg Marks</p>
              <p className="text-lg font-bold text-foreground">{topic.evidence?.marks_profile?.average_marks || 10}</p>
              <p className="text-[10px] text-muted-foreground">
                Max: {topic.evidence?.marks_profile?.max_marks || 10} marks
              </p>
            </div>

            <div className="p-2.5 rounded-lg border bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Unit Rank</p>
              <p className="text-lg font-bold text-primary">#{topic.evidence?.unit_standing?.rank_in_unit || 1}</p>
              <p className="text-[10px] text-muted-foreground">
                {topic.evidence?.unit_standing?.unit_question_share_percent || 0}% unit share
              </p>
            </div>

            <div className="p-2.5 rounded-lg border bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Trend</p>
              <p className="text-sm font-bold text-foreground mt-1">{topic.trend}</p>
              <p className="text-[10px] text-muted-foreground">
                Last: {topic.evidence?.last_appeared_year || 'N/A'}
              </p>
            </div>
          </div>

          {/* Historical Appearance Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Historical Examination Record
            </h4>
            <div className="flex flex-wrap gap-2">
              {allRecordedYears.map((year) => {
                const appeared = topic.appearance_years.includes(year);
                return (
                  <div
                    key={year}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                      appeared
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                        : 'bg-muted/40 text-muted-foreground border-border'
                    }`}
                  >
                    {appeared ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                    )}
                    <span>{year}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verbatim Question Samples from Real Papers */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Verbatim Historical Questions
            </h4>
            {topic.evidence?.verified_question_samples?.length > 0 ? (
              <div className="space-y-2">
                {topic.evidence.verified_question_samples.map((q, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-background text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>Exam {q.year} • {q.question_number}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {q.marks} Marks
                      </Badge>
                    </div>
                    <p className="text-foreground leading-relaxed italic">"{q.text_snippet}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No verbatim snippets recorded.</p>
            )}
          </div>

          {/* Related Notes in Student Desk */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-secondary" /> Study This Topic in Student Desk Notes
            </h4>
            {loadingNotes ? (
              <p className="text-xs text-muted-foreground">Scanning repository notes...</p>
            ) : matchedNotes.length > 0 ? (
              <div className="space-y-2">
                {matchedNotes.map((note) => (
                  <Card key={note.id} className="p-3 bg-secondary/5 border-secondary/20">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-secondary shrink-0" />
                        <span className="text-xs font-semibold truncate text-foreground">{note.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onViewNote && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewNote(note.file_url)}
                            className="h-7 text-xs px-2 gap-1"
                          >
                            <Eye className="h-3 w-3" /> View Note
                          </Button>
                        )}
                        {onDownloadNote && (
                          <Button
                            size="sm"
                            onClick={() => onDownloadNote(note.file_url, note.file_name)}
                            className="h-7 text-xs px-2 gap-1 bg-secondary text-secondary-foreground"
                          >
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                No specific notes currently tagged with this topic keyword. You can access general subject lecture PDFs from the main study notes list.
              </div>
            )}
          </div>

          {/* Mandatory Disclaimer */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-300/40 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Academic Disclaimer:</strong> AI Exam Intelligence calculates statistical topic propensity based
              on verified past university papers. It does not guarantee the contents of any upcoming examination. Use as a strategic revision guide.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
