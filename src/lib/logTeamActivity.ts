import { supabase } from '@/integrations/supabase/client';

export type TeamActivityActionType =
  | 'lead_created'
  | 'lead_updated'
  | 'follow_up_completed'
  | 'follow_up_created'
  | 'site_visit_logged'
  | 'auto_lead_updated'
  | 'note_added'
  | 'whatsapp_sent'
  | 'call_made';

export async function logTeamActivity(opts: {
  action_type: TeamActivityActionType;
  description: string;
  reference_id?: string | null;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.company_id) return;

    const { error } = await supabase.from('team_activity_log').insert({
      company_id: profile.company_id,
      profile_user_id: user.id,
      action_type: opts.action_type,
      reference_id: opts.reference_id ?? null,
      description: opts.description,
    });

    if (error) console.log('Team activity log insert failed', error);
  } catch (e) {
    console.log('Team activity log failed', e);
  }
}
