// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import (resolved in Supabase Edge runtime)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DueReminder {
  id: string
  user_id: string
  title: string
  message: string
  related_id: string | null
  company_id: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date().toISOString()

  const { data: dueReminders, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, message, related_id, company_id')
    .eq('type', 'whatsapp_reminder')
    .eq('is_reminder_fired', false)
    .eq('read', false)
    .lte('scheduled_for', now)

  if (error) {
    console.error('Error fetching due reminders:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }

  if (!dueReminders || dueReminders.length === 0) {
    return new Response(JSON.stringify({ fired: 0 }), { status: 200, headers: corsHeaders })
  }

  const ids = dueReminders.map((r: DueReminder) => r.id)
  await supabase
    .from('notifications')
    .update({ is_reminder_fired: true })
    .in('id', ids)

  console.log(`Fired ${dueReminders.length} WhatsApp reminders`)
  return new Response(
    JSON.stringify({ fired: dueReminders.length }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
