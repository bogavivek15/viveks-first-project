/**
 * Deterministic AI Exam Intelligence Forecasting & Backtesting Engine
 * 
 * Implements a calibrated multi-factor statistical model designed for
 * university syllabus examination structures.
 * 
 * Features calculated strictly from verified database records:
 * 1. Frequency (F)
 * 2. Time-Decayed Recency (R)
 * 3. Cycle / Alternating Gap Pattern (G)
 * 4. Marks Weight & Dominance (M)
 * 5. Unit Competition (U)
 * 6. Trend Momentum (T)
 */

export interface RawVerifiedQuestion {
  id: string;
  exam_year: number;
  question_number: string;
  section: string | null;
  question_text: string;
  marks: number | null;
  unit_number: number | null;
  canonical_topic_id: string;
  topic_name: string;
}

export interface TopicEvidence {
  historical_appearances: number;
  total_papers_analyzed: number;
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
}

export interface TopicForecastResult {
  canonical_topic_id: string;
  topic_name: string;
  unit_number: number;
  forecast_score: number; // 0 to 100
  priority_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  trend: 'RISING' | 'CONSISTENT' | 'SPORADIC' | 'DECLINING';
  historical_appearances: number;
  total_papers: number;
  appearance_years: number[];
  evidence: TopicEvidence;
}

export interface ForecastRunOutput {
  subject_id: string;
  total_papers_analyzed: number;
  years_range: string;
  confidence_rating: number; // 0 to 100
  data_state: 'INSUFFICIENT' | 'LIMITED' | 'ROBUST';
  items: TopicForecastResult[];
}

export interface BacktestResult {
  test_year: number;
  training_years: number[];
  top_k: number;
  hit_rate: number;
  precision_at_k: number;
  recall_at_k: number;
  unit_coverage_percent: number;
  predicted_topics: string[];
  actual_topics: string[];
  matched_topics: string[];
  missed_topics: string[];
}

// Configurable Scoring Weights
const WEIGHT_FREQUENCY = 0.30;
const WEIGHT_RECENCY = 0.25;
const WEIGHT_GAP = 0.15;
const WEIGHT_MARKS = 0.10;
const WEIGHT_UNIT_SHARE = 0.15;
const WEIGHT_TREND = 0.05;

const RECENCY_LAMBDA = 0.25; // Exponential decay parameter (half-life ~2.7 yrs)
const BENCHMARK_PAPERS = 5;

/**
 * Computes topic forecast scores and evidence strictly from verified questions.
 */
export function computeSubjectTopicForecast(
  subjectId: string,
  verifiedQuestions: RawVerifiedQuestion[],
  allCanonicalTopics: { id: string; topic_name: string; unit_number: number }[]
): ForecastRunOutput {
  // Extract distinct chronological years
  const distinctYears = Array.from(
    new Set(verifiedQuestions.map((q) => q.exam_year))
  ).sort((a, b) => a - b);

  const totalPapers = distinctYears.length;
  const maxYear = distinctYears[distinctYears.length - 1] || new Date().getFullYear();
  const minYear = distinctYears[0] || maxYear;
  const yearsRange = totalPapers > 0 ? `${minYear} - ${maxYear}` : 'No historical data';

  // Determine Data State & Confidence
  let dataState: 'INSUFFICIENT' | 'LIMITED' | 'ROBUST' = 'ROBUST';
  if (totalPapers < 3) {
    dataState = 'INSUFFICIENT';
  } else if (totalPapers < 5) {
    dataState = 'LIMITED';
  }

  const confidenceRating = Math.min(
    100,
    Math.round((Math.min(totalPapers, BENCHMARK_PAPERS) / BENCHMARK_PAPERS) * 85 + (verifiedQuestions.length > 0 ? 15 : 0))
  );

  if (totalPapers === 0 || allCanonicalTopics.length === 0) {
    return {
      subject_id: subjectId,
      total_papers_analyzed: 0,
      years_range: 'None',
      confidence_rating: 0,
      data_state: 'INSUFFICIENT',
      items: [],
    };
  }

  // Precompute global metrics
  const maxPaperMarks = Math.max(
    ...verifiedQuestions.map((q) => q.marks || 10),
    10
  );

  // Group questions by canonical topic
  const questionsByTopic = new Map<string, RawVerifiedQuestion[]>();
  for (const q of verifiedQuestions) {
    if (!q.canonical_topic_id) continue;
    const existing = questionsByTopic.get(q.canonical_topic_id) || [];
    existing.push(q);
    questionsByTopic.set(q.canonical_topic_id, existing);
  }

  // Count total unit appearances for unit competition factor
  const unitQuestionCounts = new Map<number, number>();
  for (const q of verifiedQuestions) {
    const unit = q.unit_number || 1;
    unitQuestionCounts.set(unit, (unitQuestionCounts.get(unit) || 0) + 1);
  }

  // Evaluate each canonical topic
  const results: TopicForecastResult[] = allCanonicalTopics.map((topic) => {
    const topicQuestions = questionsByTopic.get(topic.id) || [];
    const appearanceYears = Array.from(
      new Set(topicQuestions.map((q) => q.exam_year))
    ).sort((a, b) => a - b);

    const appearanceCount = appearanceYears.length;

    // 1. Frequency (F): 0.0 to 1.0
    const f = appearanceCount / totalPapers;

    // 2. Recency (R): 0.0 to 1.0 (Time decayed)
    let recencyNumerator = 0;
    let recencyDenominator = 0;
    for (const yr of distinctYears) {
      const weight = Math.exp(-RECENCY_LAMBDA * (maxYear - yr));
      recencyDenominator += weight;
      if (appearanceYears.includes(yr)) {
        recencyNumerator += weight;
      }
    }
    const r = recencyDenominator > 0 ? recencyNumerator / recencyDenominator : 0;

    // 3. Gap & Alternation Pattern (G): -0.4 to 1.0
    let g = 0.5; // neutral
    const lastAppeared = appearanceYears[appearanceYears.length - 1] || 0;
    const appearedLastYear = lastAppeared === maxYear;
    const appearedTwoYearsAgo = appearanceYears.includes(maxYear - 1);

    if (appearedLastYear && f >= 0.75) {
      // Core staple topic
      g = 0.9;
    } else if (!appearedLastYear && appearedTwoYearsAgo && totalPapers >= 3) {
      // Classic alternating cycle candidate
      g = 0.85;
    } else if (f === 0) {
      g = 0.1;
    } else if (maxYear - lastAppeared >= 3) {
      // Dormant in recent papers
      g = 0.2;
    }

    // 4. Marks Dominance (M): 0.0 to 1.0
    const topicMarksList = topicQuestions.map((q) => q.marks || 10);
    const avgMarks =
      topicMarksList.length > 0
        ? topicMarksList.reduce((sum, m) => sum + m, 0) / topicMarksList.length
        : 5;
    const m = Math.min(1.0, avgMarks / maxPaperMarks);

    // 5. Intra-Unit Competition (U): 0.0 to 1.0
    const totalUnitQuestions = unitQuestionCounts.get(topic.unit_number) || 1;
    const u = Math.min(1.0, topicQuestions.length / totalUnitQuestions);

    // 6. Trend Momentum (T): 0.0 to 1.0
    let t = 0.5;
    if (totalPapers >= 3) {
      const firstHalfYears = distinctYears.slice(0, Math.ceil(totalPapers / 2));
      const secondHalfYears = distinctYears.slice(Math.ceil(totalPapers / 2));
      const firstHalfHits = appearanceYears.filter((yr) => firstHalfYears.includes(yr)).length;
      const secondHalfHits = appearanceYears.filter((yr) => secondHalfYears.includes(yr)).length;

      if (secondHalfHits > firstHalfHits) t = 0.8;
      else if (secondHalfHits < firstHalfHits) t = 0.3;
      else t = 0.5;
    }

    // Composite Raw Score
    const rawScore =
      WEIGHT_FREQUENCY * f +
      WEIGHT_RECENCY * r +
      WEIGHT_GAP * g +
      WEIGHT_MARKS * m +
      WEIGHT_UNIT_SHARE * u +
      WEIGHT_TREND * t;

    // Sigmoid Normalization to [0, 100]
    // Shifts centered score so standard distribution sits cleanly in 15-95
    const normalizedScore = Math.round(
      100 / (1 + Math.exp(-6.0 * (rawScore - 0.45)))
    );
    const finalForecastScore = Math.max(5, Math.min(96, normalizedScore));

    // Determine Priority Tier based on Score + Confidence
    let priorityTier: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (finalForecastScore >= 75 && confidenceRating >= 60) {
      priorityTier = 'HIGH';
    } else if (finalForecastScore >= 50 || (finalForecastScore >= 75 && confidenceRating < 60)) {
      priorityTier = 'MEDIUM';
    }

    // Determine Trend Label
    let trendLabel: 'RISING' | 'CONSISTENT' | 'SPORADIC' | 'DECLINING' = 'CONSISTENT';
    if (f >= 0.75) trendLabel = 'CONSISTENT';
    else if (t > 0.6) trendLabel = 'RISING';
    else if (t < 0.4 && f > 0) trendLabel = 'DECLINING';
    else trendLabel = 'SPORADIC';

    // Build Grounded Evidence
    const evidence: TopicEvidence = {
      historical_appearances: appearanceCount,
      total_papers_analyzed: totalPapers,
      appearance_percentage: Math.round(f * 100),
      appearance_years: appearanceYears,
      last_appeared_year: lastAppeared,
      is_recent: appearedLastYear || lastAppeared === maxYear - 1,
      marks_profile: {
        min_marks: topicMarksList.length > 0 ? Math.min(...topicMarksList) : 0,
        max_marks: topicMarksList.length > 0 ? Math.max(...topicMarksList) : 0,
        average_marks: parseFloat(avgMarks.toFixed(1)),
        total_historical_marks: topicMarksList.reduce((sum, val) => sum + val, 0),
      },
      unit_standing: {
        unit_number: topic.unit_number,
        rank_in_unit: 1, // Computed below
        unit_question_share_percent: Math.round(u * 100),
      },
      verified_question_samples: topicQuestions.slice(0, 3).map((q) => ({
        year: q.exam_year,
        question_number: q.question_number,
        marks: q.marks || 10,
        text_snippet: q.question_text.length > 120 ? `${q.question_text.substring(0, 117)}...` : q.question_text,
      })),
    };

    return {
      canonical_topic_id: topic.id,
      topic_name: topic.topic_name,
      unit_number: topic.unit_number,
      forecast_score: finalForecastScore,
      priority_tier: priorityTier,
      trend: trendLabel,
      historical_appearances: appearanceCount,
      total_papers: totalPapers,
      appearance_years: appearanceYears,
      evidence,
    };
  });

  // Calculate unit ranks for each topic
  for (let unit = 1; unit <= 6; unit++) {
    const unitTopics = results.filter((r) => r.unit_number === unit);
    unitTopics.sort((a, b) => b.forecast_score - a.forecast_score);
    unitTopics.forEach((t, idx) => {
      t.evidence.unit_standing.rank_in_unit = idx + 1;
    });
  }

  // Sort overall by forecast score descending
  results.sort((a, b) => b.forecast_score - a.forecast_score);

  return {
    subject_id: subjectId,
    total_papers_analyzed: totalPapers,
    years_range: yearsRange,
    confidence_rating: confidenceRating,
    data_state: dataState,
    items: results,
  };
}

/**
 * Runs walk-forward backtesting:
 * Hides the latest exam paper (testYear), computes predictions on prior years,
 * and compares against the actual ground-truth topics present in testYear.
 */
export function runWalkForwardBacktest(
  subjectId: string,
  verifiedQuestions: RawVerifiedQuestion[],
  allCanonicalTopics: { id: string; topic_name: string; unit_number: number }[],
  topK: number = 5
): BacktestResult | null {
  const distinctYears = Array.from(
    new Set(verifiedQuestions.map((q) => q.exam_year))
  ).sort((a, b) => a - b);

  if (distinctYears.length < 3) {
    return null; // Insufficient historical depth for credible backtesting
  }

  const testYear = distinctYears[distinctYears.length - 1];
  const trainingYears = distinctYears.slice(0, distinctYears.length - 1);

  // Split into train and test question sets
  const trainQuestions = verifiedQuestions.filter((q) => trainingYears.includes(q.exam_year));
  const testQuestions = verifiedQuestions.filter((q) => q.exam_year === testYear);

  if (trainQuestions.length === 0 || testQuestions.length === 0) {
    return null;
  }

  // 1. Train model on historical papers prior to testYear
  const forecastOutput = computeSubjectTopicForecast(
    subjectId,
    trainQuestions,
    allCanonicalTopics
  );

  // Top-K predicted topic IDs
  const topKForecasts = forecastOutput.items.slice(0, topK);
  const predictedTopicIds = new Set(topKForecasts.map((i) => i.canonical_topic_id));
  const predictedTopicNames = topKForecasts.map((i) => i.topic_name);

  // 2. Extract actual ground truth topics in testYear
  const actualTopicIds = new Set(
    testQuestions
      .map((q) => q.canonical_topic_id)
      .filter((id): id is string => !!id)
  );

  const actualTopicNames = Array.from(actualTopicIds).map((id) => {
    const topic = allCanonicalTopics.find((t) => t.id === id);
    return topic ? topic.topic_name : id;
  });

  // 3. Compute overlaps and metrics
  const matchedIds: string[] = [];
  const missedIds: string[] = [];

  for (const predId of predictedTopicIds) {
    if (actualTopicIds.has(predId)) {
      matchedIds.push(predId);
    }
  }

  for (const actId of actualTopicIds) {
    if (!predictedTopicIds.has(actId)) {
      missedIds.push(actId);
    }
  }

  const matchedTopicNames = matchedIds.map((id) => {
    const topic = allCanonicalTopics.find((t) => t.id === id);
    return topic ? topic.topic_name : id;
  });

  const missedTopicNames = missedIds.map((id) => {
    const topic = allCanonicalTopics.find((t) => t.id === id);
    return topic ? topic.topic_name : id;
  });

  const hitRate = parseFloat(((matchedIds.length / topK) * 100).toFixed(1));
  const precisionAtK = parseFloat(((matchedIds.length / topK) * 100).toFixed(1));
  const recallAtK =
    actualTopicIds.size > 0
      ? parseFloat(((matchedIds.length / actualTopicIds.size) * 100).toFixed(1))
      : 0;

  // Unit coverage rate: Did we forecast at least 1 actual topic in each syllabus unit?
  const testUnits = new Set(
    testQuestions.map((q) => q.unit_number).filter((u): u is number => !!u)
  );

  let coveredUnits = 0;
  for (const unit of testUnits) {
    const unitActualIds = testQuestions
      .filter((q) => q.unit_number === unit && q.canonical_topic_id)
      .map((q) => q.canonical_topic_id!);

    const unitForecastHit = unitActualIds.some((id) => predictedTopicIds.has(id));
    if (unitForecastHit) {
      coveredUnits++;
    }
  }

  const unitCoveragePercent =
    testUnits.size > 0
      ? parseFloat(((coveredUnits / testUnits.size) * 100).toFixed(1))
      : 100;

  return {
    test_year: testYear,
    training_years: trainingYears,
    top_k: topK,
    hit_rate: hitRate,
    precision_at_k: precisionAtK,
    recall_at_k: recallAtK,
    unit_coverage_percent: unitCoveragePercent,
    predicted_topics: predictedTopicNames,
    actual_topics: actualTopicNames,
    matched_topics: matchedTopicNames,
    missed_topics: missedTopicNames,
  };
}
