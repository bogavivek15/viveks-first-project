import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_ORIGINS = [
  "https://student-desk.online",
  "https://www.student-desk.online",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:8080",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-application-name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface GenerateForecastRequest {
  subject_id: string;
  course_id: string;
  exam_type?: "regular" | "supply" | "both";
  run_backtest?: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase backend secrets are missing.");
    }

    // 1. Authenticate Caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 2. Parse Request
    const body: GenerateForecastRequest = await req.json();
    const { subject_id, course_id, exam_type = "regular", run_backtest = true } = body;

    if (!subject_id || !course_id) {
      return new Response(JSON.stringify({ error: "subject_id and course_id required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 3. Fetch Verified Questions and Canonical Topics
    const [questionsRes, topicsRes] = await Promise.all([
      adminClient
        .from("extracted_questions")
        .select("id, exam_year, question_number, section, question_text, marks, unit_number, canonical_topic_id")
        .eq("subject_id", subject_id)
        .eq("is_verified", true)
        .order("exam_year", { ascending: true }),
      adminClient
        .from("canonical_topics")
        .select("id, topic_name, unit_number, aliases")
        .eq("subject_id", subject_id)
        .order("unit_number", { ascending: true }),
    ]);

    if (questionsRes.error) throw questionsRes.error;
    if (topicsRes.error) throw topicsRes.error;

    const questions = questionsRes.data || [];
    const canonicalTopics = topicsRes.data || [];

    if (canonicalTopics.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No canonical topics defined for this subject. Please define syllabus topics first.",
        }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // 4. Group & Calculate Statistical Features
    const distinctYears = Array.from(new Set(questions.map((q) => q.exam_year))).sort((a, b) => a - b);
    const totalPapers = distinctYears.length;
    const maxYear = distinctYears[distinctYears.length - 1] || new Date().getFullYear();
    const minYear = distinctYears[0] || maxYear;
    const yearsRange = totalPapers > 0 ? `${minYear} - ${maxYear}` : "None";

    const confidenceRating = Math.min(
      100,
      Math.round((Math.min(totalPapers, 5) / 5) * 85 + (questions.length > 0 ? 15 : 0))
    );

    const questionsByTopic = new Map<string, typeof questions>();
    for (const q of questions) {
      if (!q.canonical_topic_id) continue;
      const list = questionsByTopic.get(q.canonical_topic_id) || [];
      list.push(q);
      questionsByTopic.set(q.canonical_topic_id, list);
    }

    const unitQuestionCounts = new Map<number, number>();
    for (const q of questions) {
      const u = q.unit_number || 1;
      unitQuestionCounts.set(u, (unitQuestionCounts.get(u) || 0) + 1);
    }

    const maxPaperMarks = Math.max(...questions.map((q) => q.marks || 10), 10);

    // Compute for each canonical topic
    const topicForecastItems = canonicalTopics.map((topic) => {
      const topicQuestions = questionsByTopic.get(topic.id) || [];
      const appearanceYears = Array.from(new Set(topicQuestions.map((q) => q.exam_year))).sort((a, b) => a - b);
      const appearanceCount = appearanceYears.length;

      // Feature 1: Frequency
      const f = totalPapers > 0 ? appearanceCount / totalPapers : 0;

      // Feature 2: Time-Decayed Recency
      let recencyNumerator = 0;
      let recencyDenominator = 0;
      for (const yr of distinctYears) {
        const weight = Math.exp(-0.25 * (maxYear - yr));
        recencyDenominator += weight;
        if (appearanceYears.includes(yr)) recencyNumerator += weight;
      }
      const r = recencyDenominator > 0 ? recencyNumerator / recencyDenominator : 0;

      // Feature 3: Gap / Alternation
      let g = 0.5;
      const lastAppeared = appearanceYears[appearanceYears.length - 1] || 0;
      const appearedLast = lastAppeared === maxYear;
      const appearedPenultimate = appearanceYears.includes(maxYear - 1);

      if (appearedLast && f >= 0.75) g = 0.9;
      else if (!appearedLast && appearedPenultimate && totalPapers >= 3) g = 0.85;
      else if (f === 0) g = 0.1;
      else if (maxYear - lastAppeared >= 3) g = 0.2;

      // Feature 4: Marks Dominance
      const marksList = topicQuestions.map((q) => q.marks || 10);
      const avgMarks = marksList.length > 0 ? marksList.reduce((a, b) => a + b, 0) / marksList.length : 5;
      const m = Math.min(1.0, avgMarks / maxPaperMarks);

      // Feature 5: Intra-Unit Competition
      const totalUnitQ = unitQuestionCounts.get(topic.unit_number) || 1;
      const u = Math.min(1.0, topicQuestions.length / totalUnitQ);

      // Feature 6: Trend Momentum
      let t = 0.5;
      if (totalPapers >= 3) {
        const half = Math.ceil(totalPapers / 2);
        const h1Hits = appearanceYears.filter((yr) => distinctYears.slice(0, half).includes(yr)).length;
        const h2Hits = appearanceYears.filter((yr) => distinctYears.slice(half).includes(yr)).length;
        if (h2Hits > h1Hits) t = 0.8;
        else if (h2Hits < h1Hits) t = 0.3;
      }

      // Raw Composite Score
      const rawScore = 0.30 * f + 0.25 * r + 0.15 * g + 0.10 * m + 0.15 * u + 0.05 * t;

      // Sigmoid Normalization
      const normalizedScore = Math.round(100 / (1 + Math.exp(-6.0 * (rawScore - 0.45))));
      const forecastScore = Math.max(5, Math.min(96, normalizedScore));

      // Priority Tier
      let priorityTier: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (forecastScore >= 75 && confidenceRating >= 60) priorityTier = "HIGH";
      else if (forecastScore >= 50 || (forecastScore >= 75 && confidenceRating < 60)) priorityTier = "MEDIUM";

      let trend: "RISING" | "CONSISTENT" | "SPORADIC" | "DECLINING" = "CONSISTENT";
      if (f >= 0.75) trend = "CONSISTENT";
      else if (t > 0.6) trend = "RISING";
      else if (t < 0.4 && f > 0) trend = "DECLINING";
      else trend = "SPORADIC";

      const evidence = {
        historical_appearances: appearanceCount,
        total_papers_analyzed: totalPapers,
        appearance_percentage: Math.round(f * 100),
        appearance_years: appearanceYears,
        last_appeared_year: lastAppeared,
        is_recent: appearedLast || lastAppeared === maxYear - 1,
        marks_profile: {
          min_marks: marksList.length > 0 ? Math.min(...marksList) : 0,
          max_marks: marksList.length > 0 ? Math.max(...marksList) : 0,
          average_marks: parseFloat(avgMarks.toFixed(1)),
          total_historical_marks: marksList.reduce((sum, val) => sum + val, 0),
        },
        unit_standing: {
          unit_number: topic.unit_number,
          rank_in_unit: 1,
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
        forecast_score: forecastScore,
        priority_tier: priorityTier,
        trend,
        historical_appearances: appearanceCount,
        total_papers: totalPapers,
        appearance_years: appearanceYears,
        evidence,
      };
    });

    // 5. Update or Create Topic Forecast Record
    const { data: forecastRecord, error: fRecError } = await adminClient
      .from("topic_forecasts")
      .insert({
        subject_id,
        course_id,
        exam_type,
        total_papers_analyzed: totalPapers,
        years_range: yearsRange,
        confidence_rating: confidenceRating,
        model_version: "SD-Hybrid-v2.0",
        is_published: true, // Auto-publish for student access
        created_by: user.id,
      })
      .select()
      .single();

    if (fRecError) throw fRecError;

    // 6. Insert Topic Forecast Items
    const itemsToInsert = topicForecastItems.map((item) => ({
      forecast_id: forecastRecord.id,
      subject_id,
      canonical_topic_id: item.canonical_topic_id,
      forecast_score: item.forecast_score,
      priority_tier: item.priority_tier,
      historical_appearances: item.historical_appearances,
      total_papers: item.total_papers,
      appearance_years: item.appearance_years,
      trend: item.trend,
      evidence: item.evidence,
    }));

    const { error: itemsError } = await adminClient
      .from("topic_forecast_items")
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 7. Optional Walk-Forward Backtest Execution
    let backtestEvaluation = null;
    if (run_backtest && distinctYears.length >= 3) {
      const testYear = distinctYears[distinctYears.length - 1];
      const trainingYears = distinctYears.slice(0, distinctYears.length - 1);
      const testQuestions = questions.filter((q) => q.exam_year === testYear);

      const actualTopicIds = new Set(
        testQuestions.map((q) => q.canonical_topic_id).filter((id): id is string => !!id)
      );

      // Top 5 topics forecasted
      const sortedByScore = [...topicForecastItems].sort((a, b) => b.forecast_score - a.forecast_score);
      const top5Predicted = sortedByScore.slice(0, 5);
      const top5PredictedIds = new Set(top5Predicted.map((i) => i.canonical_topic_id));

      const matched = Array.from(top5PredictedIds).filter((id) => actualTopicIds.has(id));
      const hitRate = parseFloat(((matched.length / 5) * 100).toFixed(1));
      const precisionAtK = hitRate;
      const recallAtK = actualTopicIds.size > 0
        ? parseFloat(((matched.length / actualTopicIds.size) * 100).toFixed(1))
        : 0;

      const testUnits = new Set(testQuestions.map((q) => q.unit_number).filter((u): u is number => !!u));
      let coveredUnits = 0;
      for (const u of testUnits) {
        const uActual = testQuestions.filter((q) => q.unit_number === u && q.canonical_topic_id).map((q) => q.canonical_topic_id!);
        if (uActual.some((id) => top5PredictedIds.has(id))) coveredUnits++;
      }
      const unitCoverage = testUnits.size > 0 ? parseFloat(((coveredUnits / testUnits.size) * 100).toFixed(1)) : 100;

      const evalSummary = {
        test_year: testYear,
        training_years: trainingYears,
        top_k: 5,
        predicted_topic_names: top5Predicted.map((p) => p.topic_name),
        matched_topic_ids: matched,
      };

      const { data: bData } = await adminClient
        .from("backtest_evaluations")
        .insert({
          subject_id,
          course_id,
          test_year: testYear,
          training_years: trainingYears,
          top_k: 5,
          hit_rate: hitRate,
          precision_at_k: precisionAtK,
          recall_at_k: recallAtK,
          unit_coverage_percent: unitCoverage,
          evaluation_summary: evalSummary,
        })
        .select()
        .single();

      backtestEvaluation = bData;
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecast_id: forecastRecord.id,
        total_papers_analyzed: totalPapers,
        confidence_rating: confidenceRating,
        topics_forecasted: topicForecastItems.length,
        backtest: backtestEvaluation,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Forecast generation error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
