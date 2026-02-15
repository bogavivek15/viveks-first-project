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

    // 5. Prompt for AI model (kept concise for speed)
    const prompt = `You are a B.Tech engineering tutor. Give exam-focused, concise answers.
Rules: No greetings. Use **bold headings**, bullet points, short paragraphs. Markdown only. Be direct.
${context ? `Context: ${context}` : ""}
Question: ${message}`;

    // 6. Call Gemini API (flash-lite for fastest response)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          },
        }),
      },
    );

    clearTimeout(timeoutId);

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

    const errMsg = error?.name === "AbortError"
      ? "Response timed out. Please try a simpler question."
      : (error?.message || "Unknown error");

    return new Response(
      JSON.stringify({
        reply: `Note: ${errMsg}`,
      }),
      {
        status: 200, // Returning 200 so the frontend can display the error message in the chat UI
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});