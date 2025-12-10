import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Fetch related data for context
    const { data: followUps } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('lead_id', leadId);

    const { data: siteVisits } = await supabase
      .from('site_visits')
      .select('*')
      .eq('lead_id', leadId);

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId);

    // Fetch properties for budget comparison
    const { data: properties } = await supabase
      .from('properties')
      .select('price, location, bhk')
      .limit(10);

    const prompt = `You are a real estate lead scoring AI. Analyze this lead and provide a score from 0-100.

Lead Information:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Email: ${lead.email || 'Not provided'}
- Budget: ${lead.budget || 'Not specified'}
- Location Preference: ${lead.location || 'Not specified'}
- Property Type: ${lead.property_type || 'Not specified'}
- Source: ${lead.source || 'Unknown'}
- Current Stage: ${lead.stage}
- Created: ${lead.created_at}
- Last Contact: ${lead.last_contact}

Engagement Data:
- Follow-ups scheduled: ${followUps?.length || 0}
- Completed follow-ups: ${followUps?.filter(f => f.status === 'completed').length || 0}
- Site visits: ${siteVisits?.length || 0}
- Completed site visits: ${siteVisits?.filter(v => v.status === 'completed').length || 0}
- Messages exchanged: ${messages?.length || 0}

Available Properties (for budget matching):
${JSON.stringify(properties?.slice(0, 5) || [], null, 2)}

Scoring Criteria:
1. Budget Match (0-25 points): Does their budget align with available properties?
2. Engagement Level (0-25 points): Follow-ups completed, site visits, messages
3. Lead Stage (0-25 points): Further in pipeline = higher score
4. Contact Recency (0-15 points): Recent contact = higher score
5. Profile Completeness (0-10 points): Email, location, property type filled

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<2-3 sentence explanation of the score>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a lead scoring AI. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the AI response
    let score = 50;
    let reasoning = "Unable to calculate score";
    
    try {
      // Extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        score = Math.min(100, Math.max(0, parsed.score || 50));
        reasoning = parsed.reasoning || "Score calculated based on lead data";
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
    }

    // Update the lead with the score
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        lead_score: score,
        score_reasoning: reasoning,
        scored_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update lead score");
    }

    return new Response(
      JSON.stringify({ score, reasoning }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lead scoring error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
