import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { TopicDetailModal, DisplayTopicItem } from './TopicDetailModal';

interface ExamIntelligenceViewProps {
  subjectId: string;
  subjectName: string;
  onViewNote?: (fileUrl: string) => void;
  onDownloadNote?: (fileUrl: string, fileName: string) => void;
}

interface ForecastRecord {
  id: string;
  total_papers_analyzed: number;
  years_range: string;
  confidence_rating: number;
  model_version: string;
  created_at: string;
}

interface BacktestSummary {
  test_year: number;
  hit_rate: number;
  top_k: number;
  unit_coverage_percent: number;
}

export function ExamIntelligenceView({
  subjectId,
  subjectName,
  onViewNote,
  onDownloadNote,
}: ExamIntelligenceViewProps) {
  const [forecast, setForecast] = useState<ForecastRecord | null>(null);
  const [items, setItems] = useState<DisplayTopicItem[]>([]);
  const [backtest, setBacktest] = useState<BacktestSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<DisplayTopicItem | null>(null);

  useEffect(() => {
    if (subjectId) {
      loadForecastData();
    }
  }, [subjectId]);

  const loadForecastData = async () => {
    try {
      setLoading(true);

      // 1. Fetch latest published forecast
      const { data: forecastData, error: fError } = await supabase
        .from('topic_forecasts')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fError) throw fError;

      if (!forecastData) {
        setForecast(null);
        setItems([]);
        return;
      }

      setForecast(forecastData);

      // 2. Fetch forecast items with canonical topic info
      const { data: itemsData, error: itemsError } = await supabase
        .from('topic_forecast_items')
        .select(`
          canonical_topic_id,
          forecast_score,
          priority_tier,
          historical_appearances,
          total_papers,
          appearance_years,
          trend,
          evidence,
          canonical_topics (
            topic_name,
            unit_number
          )
        `)
        .eq('forecast_id', forecastData.id)
        .order('forecast_score', { ascending: false });

      if (itemsError) throw itemsError;

      const mappedItems: DisplayTopicItem[] = (itemsData || []).map((i: any) => ({
        canonical_topic_id: i.canonical_topic_id,
        topic_name: i.canonical_topics?.topic_name || 'Topic',
        unit_number: i.canonical_topics?.unit_number || 1,
        forecast_score: i.forecast_score,
        priority_tier: i.priority_tier as 'HIGH' | 'MEDIUM' | 'LOW',
        historical_appearances: i.historical_appearances,
        total_papers: i.total_papers,
        appearance_years: i.appearance_years || [],
        trend: i.trend,
        evidence: i.evidence,
      }));

      setItems(mappedItems);

      // 3. Fetch latest backtest evaluation
      const { data: backtestData } = await supabase
        .from('backtest_evaluations')
        .select('test_year, hit_rate, top_k, unit_coverage_percent')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (backtestData) {
        setBacktest(backtestData);
      }
    } catch (err) {
      console.error('Failed to load student exam intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (unitFilter !== 'all' && item.unit_number !== parseInt(unitFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.topic_name.toLowerCase().includes(q);
      const matchUnit = `unit ${item.unit_number}`.includes(q);
      if (!matchName && !matchUnit) return false;
    }
    return true;
  });

  const highPriority = filteredItems.filter((i) => i.priority_tier === 'HIGH');
  const mediumPriority = filteredItems.filter((i) => i.priority_tier === 'MEDIUM');
  const lowPriority = filteredItems.filter((i) => i.priority_tier === 'LOW');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading AI Exam Intelligence Forecast...</span>
      </div>
    );
  }

  if (!forecast || items.length === 0) {
    return (
      <Card className="text-center py-12 border border-dashed">
        <CardContent className="space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">No Exam Forecast Published Yet</CardTitle>
          <CardDescription className="text-xs max-w-md mx-auto">
            AI Exam Intelligence is currently gathering and verifying historical question papers for{' '}
            <strong>{subjectName}</strong>. Check back soon for topic forecast scores and revision recommendations!
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Intelligence Banner */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <CardTitle className="text-xl">AI Exam Intelligence — Topic Forecast</CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {forecast.years_range}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Empirical historical topic forecasting for <strong>{subjectName}</strong> based on {forecast.total_papers_analyzed} verified previous exam papers.
              </CardDescription>
            </div>

            {/* Confidence & Backtest Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg border bg-background/80 text-xs text-right">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Data Confidence</span>
                <span className="font-bold text-primary text-sm">{forecast.confidence_rating}% Reliable</span>
              </div>

              {backtest && (
                <div className="px-3 py-1.5 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-xs text-right">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block flex items-center gap-1 justify-end">
                    <Award className="h-3 w-3" /> {backtest.test_year} Backtest
                  </span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                    {backtest.hit_rate}% Top-5 Hit Rate
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <span>
              Click any topic to inspect verbatim historical examination questions, marks distributions, and jump directly to relevant lecture notes.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Search and Unit Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg bg-card border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search predicted topics (e.g. AVL Trees, Graph Traversal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Syllabus Units</SelectItem>
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

      {/* SECTION 1: HIGH PRIORITY */}
      {highPriority.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> High Priority Topics ({highPriority.length})
            </h3>
            <span className="text-xs text-muted-foreground">Most consistent historical appearances</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highPriority.map((item) => (
              <Card
                key={item.canonical_topic_id}
                onClick={() => setSelectedTopic(item)}
                className="cursor-pointer border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {item.topic_name}
                        </h4>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Unit {item.unit_number}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Appeared in {item.historical_appearances} of {item.total_papers} papers (
                        {item.evidence?.appearance_percentage}%) • Trend: {item.trend}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xl font-bold text-emerald-600">{item.forecast_score}</span>
                        <span className="text-[10px] text-muted-foreground block">/100 Score</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: MEDIUM PRIORITY */}
      {mediumPriority.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Medium Priority Topics ({mediumPriority.length})
            </h3>
            <span className="text-xs text-muted-foreground">Alternating years & unit balance candidates</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mediumPriority.map((item) => (
              <Card
                key={item.canonical_topic_id}
                onClick={() => setSelectedTopic(item)}
                className="cursor-pointer border-amber-200 dark:border-amber-800/40 hover:border-amber-500 hover:shadow-md transition-all group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {item.topic_name}
                        </h4>
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Unit {item.unit_number}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Appeared in {item.historical_appearances} of {item.total_papers} papers (
                        {item.evidence?.appearance_percentage}%)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xl font-bold text-amber-600">{item.forecast_score}</span>
                        <span className="text-[10px] text-muted-foreground block">/100 Score</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: LOW PRIORITY */}
      {lowPriority.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4" /> Lower Frequency Topics ({lowPriority.length})
            </h3>
            <span className="text-xs text-muted-foreground">Infrequently examined concepts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {lowPriority.map((item) => (
              <div
                key={item.canonical_topic_id}
                onClick={() => setSelectedTopic(item)}
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer flex items-center justify-between gap-2 transition-colors"
              >
                <div className="truncate">
                  <p className="font-medium text-xs truncate">{item.topic_name}</p>
                  <p className="text-[10px] text-muted-foreground">Unit {item.unit_number}</p>
                </div>
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  {item.forecast_score}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer Footer */}
      <div className="p-3 rounded-lg bg-muted/30 border text-[11px] text-muted-foreground flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          <strong>AI Exam Intelligence Notice:</strong> Forecast propensity scores represent mathematical patterns
          discovered in verified university archives. These predictions are designed to prioritize preparation and do not
          guarantee future exam questions.
        </span>
      </div>

      {/* Topic Detail Drill-down Modal */}
      <TopicDetailModal
        topic={selectedTopic}
        subjectId={subjectId}
        subjectName={subjectName}
        onClose={() => setSelectedTopic(null)}
        onViewNote={onViewNote}
        onDownloadNote={onDownloadNote}
      />
    </div>
  );
}
export default ExamIntelligenceView;
