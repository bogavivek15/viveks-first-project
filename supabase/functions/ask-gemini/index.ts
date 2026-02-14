const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AskGeminiRequest {
  message?: string;
  context?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Ensure API key is available
    if (!GEMINI_API_KEY) {
      throw new Error("Supabase Secret GEMINI_API_KEY is not set.");
    }

    // 3. Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ reply: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Safely parse request body
    let body: AskGeminiRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ reply: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const message = body.message?.trim();
    const context = body.context?.trim() || "";

    if (!message) {
      return new Response(
        JSON.stringify({ reply: "Message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Prompt for AI model
    const prompt = `
You are an expert engineering tutor for a B.Tech-level student.
Your goal is to provide exam-focused, clear, and concise answers.

${context ? `Additional Context (use only if helpful):\n${context}\n` : ""}

Student Question:
${message}

### RESPONSE RULES (VERY IMPORTANT)

1. Direct Start
   - Start directly with the explanation or answer.
   - Do NOT write phrases like "Here is the answer" or "Sure, I can help".

2. Language
   - Use simple, professional English.
   - Avoid heavy jargon. If a technical term is needed, explain it briefly.

3. Structure
   - Use **bold headings** like: **Definition**, **Explanation**, **Advantages**, etc.
   - Use bullet points and numbered lists for clarity.
   - Keep paragraphs short (1–3 lines).

4. Exam Focus
   - Focus on what is important for university exams and viva.
   - Be concise but complete.

5. Formatting
   - Use Markdown formatting properly.
   - No greeting or closing sentence.

Now, answer the student's question by strictly following ALL the rules above.
`;

    // 6. Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      
      // If still hitting 429, tell the user clearly
      if (response.status === 429) {
          throw new Error("The server is busy (Rate Limit). Please wait 30 seconds.");
      }
      
      throw new Error(`Google API Error (${response.status})`);
    }

    const data = await response.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Function Error:", error?.message || error);

    return new Response(
      JSON.stringify({
        reply: `Note: ${error?.message || "Unknown error"}`,
      }),
      {
        status: 200, // Returning 200 so the frontend can display the error message in the chat UI
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});