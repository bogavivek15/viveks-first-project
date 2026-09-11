import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
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

interface ProcessPaperRequest {
  paper_id: string;
  front_storage_path: string;
  back_storage_path: string;
  subject_id: string;
  exam_year: number;
}

interface ExtractedQuestionItem {
  question_number: string;
  section?: string;
  question_text: string;
  marks?: number;
  unit_number?: number;
  suggested_topic?: string;
  confidence?: number;
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
    // 1. Check API Keys
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY secret is not configured.");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase backend secrets are missing.");
    }

    // 2. Authenticate User JWT & Verify Admin Role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized — missing token" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Use admin client for verified DB operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller user
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

    // Check if user has admin role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // 3. Parse Request Payload
    const body: ProcessPaperRequest = await req.json();
    const { paper_id, front_storage_path, back_storage_path, subject_id, exam_year } = body;

    if (!paper_id || !subject_id || !exam_year) {
      return new Response(JSON.stringify({ error: "Missing required paper parameters" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Update status to processing_ocr
    await adminClient
      .from("exam_papers")
      .update({ status: "processing_ocr", error_message: null })
      .eq("id", paper_id);

    // 4. Generate Signed URLs for Front and Back images (10 min expiry)
    let frontSignedUrl = front_storage_path;
    let backSignedUrl = back_storage_path;

    if (!front_storage_path.startsWith("http") && front_storage_path !== "manual_entry") {
      const { data: fData, error: fErr } = await adminClient.storage
        .from("exam-papers")
        .createSignedUrl(front_storage_path, 600);
      if (fErr) throw new Error(`Front storage error: ${fErr.message}`);
      frontSignedUrl = fData?.signedUrl || front_storage_path;
    }

    if (!back_storage_path.startsWith("http") && back_storage_path !== "manual_entry") {
      const { data: bData, error: bErr } = await adminClient.storage
        .from("exam-papers")
        .createSignedUrl(back_storage_path, 600);
      if (bErr) throw new Error(`Back storage error: ${bErr.message}`);
      backSignedUrl = bData?.signedUrl || back_storage_path;
    }

    // 5. Fetch Canonical Topics for this subject to assist topic suggestion
    const { data: canonicalTopics } = await adminClient
      .from("canonical_topics")
      .select("id, topic_name, unit_number, aliases")
      .eq("subject_id", subject_id);

    const syllabusContext = canonicalTopics?.length
      ? `\nSyllabus Canonical Topics for this subject:\n` +
        canonicalTopics.map((t) => `- Unit ${t.unit_number}: ${t.topic_name} (Aliases: ${t.aliases?.join(", ") || "none"})`).join("\n")
      : "";

    // 6. Invoke OpenRouter Multimodal Vision Models with Cascade
    const visionModels = [
      "qwen/qwen-2.5-vl-72b-instruct",
      "google/gemini-2.5-flash",
      "openai/gpt-4o-mini",
    ];

    const visionPrompt = `You are a high-accuracy examination paper parser.
Extract EVERY single examination question printed on these two images (Front Side and Back Side of the SAME historical examination paper).

Rules:
1. Extract ALL questions from Part A, Part B, Section I, Section II, etc.
2. Maintain question hierarchy:
   - If Q1 has sub-parts like (a), (b), extract each discrete question item separately as Q1(a), Q1(b).
   - If a question has no sub-parts, extract as Q1, Q2, etc.
3. Extract stated marks (e.g. 2, 5, 8, 10, 15). If marks are not explicitly stated, estimate standard marks (e.g. 5 or 10).
4. Identify which syllabus Unit (1 to 6) the question belongs to based on the syllabus context provided.
5. Suggest the closest matching syllabus topic name for "suggested_topic".
6. Estimate an OCR confidence between 0.70 and 1.00 based on image legibility.
${syllabusContext}

OUTPUT FORMAT:
You MUST reply with pure, valid JSON ONLY in this exact structure:
{
  "questions": [
    {
      "question_number": "Q1(a)",
      "section": "Part A",
      "question_text": "Explain AVL tree rotations with examples.",
      "marks": 10,
      "unit_number": 3,
      "suggested_topic": "AVL Trees",
      "confidence": 0.95
    }
  ]
}`;

    const contentPayload: any[] = [{ type: "text", text: visionPrompt }];

    if (frontSignedUrl && frontSignedUrl !== "manual_entry") {
      contentPayload.push({
        type: "image_url",
        image_url: { url: frontSignedUrl, detail: "high" },
      });
    }

    if (backSignedUrl && backSignedUrl !== "manual_entry") {
      contentPayload.push({
        type: "image_url",
        image_url: { url: backSignedUrl, detail: "high" },
      });
    }

    let extractedList: ExtractedQuestionItem[] = [];
    let extractionError: string | null = null;

    for (const model of visionModels) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: contentPayload,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          }),
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Vision model ${model} failed: ${response.status} - ${errText}`);
          continue;
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent) continue;

        const parsed = JSON.parse(rawContent);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          extractedList = parsed.questions;
          break; // Success!
        }
      } catch (err: any) {
        console.error(`Error with model ${model}:`, err.message);
        extractionError = err.message;
      }
    }

    if (extractedList.length === 0) {
      await adminClient
        .from("exam_papers")
        .update({
          status: "failed",
          error_message: extractionError || "No questions could be legibly extracted from photos",
        })
        .eq("id", paper_id);

      return new Response(
        JSON.stringify({
          error: "Vision OCR failed to extract questions. Please check photo lighting and retry.",
        }),
        {
          status: 502,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // 7. Delete previous unverified extractions for this paper if re-running
    await adminClient
      .from("extracted_questions")
      .delete()
      .eq("paper_id", paper_id)
      .eq("is_verified", false);

    // 8. Map to canonical topics where possible
    const rowsToInsert = extractedList.map((q) => {
      let matchedTopicId: string | null = null;
      let matchedUnit = q.unit_number || 1;

      if (canonicalTopics && canonicalTopics.length > 0) {
        const textLower = q.question_text.toLowerCase();
        const suggestedLower = (q.suggested_topic || "").toLowerCase();

        // Check exact topic name or suggested topic
        for (const t of canonicalTopics) {
          const tNameLower = t.topic_name.toLowerCase();
          if (
            suggestedLower === tNameLower ||
            textLower.includes(tNameLower) ||
            t.aliases?.some((a) => textLower.includes(a.toLowerCase()))
          ) {
            matchedTopicId = t.id;
            matchedUnit = t.unit_number;
            break;
          }
        }
      }

      return {
        paper_id,
        subject_id,
        exam_year,
        question_number: q.question_number || "Q",
        section: q.section || null,
        question_text: q.question_text,
        marks: q.marks || 10,
        unit_number: matchedUnit,
        canonical_topic_id: matchedTopicId,
        raw_extracted_topic: q.suggested_topic || null,
        confidence: q.confidence || 0.9,
        is_verified: false,
      };
    });

    const { error: insertError } = await adminClient
      .from("extracted_questions")
      .insert(rowsToInsert);

    if (insertError) throw insertError;

    // 9. Update paper status to review_required
    await adminClient
      .from("exam_papers")
      .update({ status: "review_required", error_message: null })
      .eq("id", paper_id);

    return new Response(
      JSON.stringify({
        success: true,
        extracted_count: rowsToInsert.length,
        paper_id,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Function fatal error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
