import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BacktestResult } from '@/lib/forecast-engine';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BacktestResult | null;
  subjectName: string;
  onRunBacktest: () => Promise<void>;
  isRunning: boolean;
}

export function BacktestModal({
  isOpen,
  onClose,
  result,
  subjectName,
  onRunBacktest,
  isRunning,
}: BacktestModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Historical Model Backtest Scorecard</DialogTitle>
              <DialogDescription className="text-xs">
                Empirical walk-forward evaluation on {subjectName} (No data leakage)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!result ? (
          <div className="text-center py-8 space-y-3">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-medium">Ready to validate forecasting accuracy</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The engine will hide the most recent historical paper, train only on prior years,
              forecast the top topics, and compare them against actual questions asked on that exam.
            </p>
            <Button onClick={onRunBacktest} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Run Walk-Forward Backtest
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Split Information Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Trained on Historical Papers:</span>
                <span className="font-mono text-muted-foreground">
                  [{result.training_years.join(', ')}]
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Tested Blind Against:</span>
                <Badge variant="default" className="bg-primary text-primary-foreground font-mono">
                  {result.test_year} Exam
                </Badge>
              </div>
            </div>

            {/* 4 Score Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Top-{result.top_k} Hit Rate
                </p>
                <p className="text-2xl font-bold text-primary">{result.hit_rate}%</p>
                <p className="text-[10px] text-muted-foreground">
                  {result.matched_topics.length} of {result.top_k} hits
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Precision@{result.top_k}
                </p>
                <p className="text-2xl font-bold text-emerald-600">{result.precision_at_k}%</p>
                <p className="text-[10px] text-muted-foreground">Forecast reliability</p>
              </div>

              <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Topic Recall
                </p>
                <p className="text-2xl font-bold text-blue-600">{result.recall_at_k}%</p>
                <p className="text-[10px] text-muted-foreground">Of all {result.test_year} topics</p>
              </div>

              <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Unit Coverage
                </p>
                <p className="text-2xl font-bold text-purple-600">{result.unit_coverage_percent}%</p>
                <p className="text-[10px] text-muted-foreground">All syllabus units</p>
              </div>
            </div>

            {/* Visual Hit Progress */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-background">
              <div className="flex justify-between text-xs font-medium">
                <span>Prediction Concordance ({result.test_year} Paper)</span>
                <span className="text-primary font-bold">{result.hit_rate}% Concordance</span>
              </div>
              <Progress value={result.hit_rate} className="h-2" />
            </div>

            {/* Topic Concordance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Correctly Forecasted Topics */}
              <div className="border rounded-lg p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4" /> Correctly Forecasted ({result.matched_topics.length})
                </p>
                {result.matched_topics.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No top predictions hit</p>
                ) : (
                  <div className="space-y-1.5">
                    {result.matched_topics.map((name) => (
                      <div
                        key={name}
                        className="text-xs font-medium flex items-center gap-1.5 p-1.5 rounded bg-white/70 dark:bg-card/70 border border-emerald-200"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Topics Appearing in Exam */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Additional Exam Topics ({result.missed_topics.length})
                </p>
                {result.missed_topics.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">All exam topics captured in Top-{result.top_k}!</p>
                ) : (
                  <div className="space-y-1.5">
                    {result.missed_topics.map((name) => (
                      <div
                        key={name}
                        className="text-xs text-muted-foreground flex items-center gap-1.5 p-1.5 rounded bg-background border"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/20 border text-[11px] text-muted-foreground flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Zero Leakage Assurance:</strong> The model was strictly prohibited from viewing the {result.test_year} paper
                during feature calculation and ranking. This validation represents real-world predictive generalization.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onRunBacktest} disabled={isRunning} className="gap-1.5">
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                Re-Run Validation
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
