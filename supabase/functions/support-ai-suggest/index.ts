import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const {
      question,
      industry_type,
      category,
      priority,
    }: {
      question?: string;
      industry_type?: string;
      category?: string;
      priority?: string;
    } = body || {};

    if (!question || !question.trim()) {
      return new Response(JSON.stringify({ error: 'Missing question' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an AI customer support assistant for a multi-tenant CRM.
Your goal: help the user resolve their issue by suggesting likely causes and concrete next steps.

Requirements:
- Be concise and actionable.
- If you need more info, ask 2-4 clarifying questions.
- If the issue looks like a bug or integration problem, suggest what details to include in a support ticket.
Return ONLY a helpful answer (no JSON).`;

    const userPrompt = `Context:
- Industry: ${industry_type || 'unknown'}
- Category: ${category || 'unknown'}
- Priority: ${priority || 'unknown'}

User question:
${question}

Answer with:
1) Possible cause(s)
2) Suggested fix / steps
3) If needed: what to include in a ticket`;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    // Primary: OpenAI (as requested). Fallback: existing Lovable AI gateway.
    let answerText: string | null = null;

    if (OPENAI_API_KEY) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`OpenAI error (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      answerText = data?.choices?.[0]?.message?.content ?? null;
    } else {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured and LOVABLE_API_KEY is missing');
      }

      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI gateway error (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      answerText = data?.choices?.[0]?.message?.content ?? null;
    }

    if (!answerText) {
      return new Response(JSON.stringify({ error: 'AI returned empty response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ answer: answerText.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('support-ai-suggest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

