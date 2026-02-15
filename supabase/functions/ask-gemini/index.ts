const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AskGeminiRequest {
  message?: string;
  context?: string;
  history?: { role: string; content: string }[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Ensure API key is available
    if (!GROQ_API_KEY) {
      throw new Error("Supabase Secret GROQ_API_KEY is not set.");
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
    const history = body.history || [];

    if (!message) {
      return new Response(
        JSON.stringify({ reply: "Message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. System prompt
    const systemPrompt = `You are a friendly and helpful B.Tech engineering study assistant.

Behavior Rules:
1. GREETINGS: If the student ONLY says hi/hello/hey (nothing else), reply with a short friendly greeting (1-2 lines). Example: "Hey there! How can I help you with ${context || 'your studies'} today?"
2. PERSONAL MESSAGES: If the student shares their name or personal info, acknowledge it warmly. Example: "Nice to meet you, [name]! How can I help you?"
3. CONVERSATIONAL: If the student says something casual or conversational, respond naturally and friendly. Don't just say "Hello".
4. SIMPLE QUESTIONS: Give a concise exam-focused answer (~200-300 words) with **bold headings**, bullet points.
5. DETAILED REQUESTS: If the student asks for detail/lengthy/in-depth explanation, give a comprehensive answer (500-1000 words) with **Definition**, **Explanation**, **Key Points**, **Examples**, **Advantages/Disadvantages**, and **Exam-Important Points**.
6. LANGUAGE REQUESTS: If asked to explain in a specific language, respond in that language. If asked for "Telugu in English letters" or "Tenglish", write Telugu words using English/Roman letters (transliteration).
7. OFF-TOPIC: If the question is not related to academics, politely redirect. But still answer personal/casual messages naturally.
8. Always use proper Markdown formatting.
9. Remember the conversation context from previous messages.
${context ? `Subject Context: ${context}` : ""}`;

    // 6. Call Groq API (ultra-fast inference) with model fallback
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ];

    let reply = "No response generated.";
    const errors: string[] = [];

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...history.slice(-6).map((msg: any) => ({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
              })),
              { role: "user", content: message },
            ],
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });
        clearTimeout(timeoutId);

        if (response.status === 429) {
          errors.push(`${model}: rate-limited`);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          errors.push(`${model}: ${response.status}`);
          console.error(`API Error (${model}): ${response.status} - ${errorText}`);
          continue;
        }

        const data = await response.json();
        reply = data?.choices?.[0]?.message?.content || reply;
        break;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError?.name === "AbortError") {
          errors.push(`${model}: timeout`);
          continue;
        }
        throw fetchError;
      }
    }

    if (reply === "No response generated.") {
      console.error("All models failed:", errors.join(", "));
      throw new Error(`All models are busy. Try again in a minute.`);
    }

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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});