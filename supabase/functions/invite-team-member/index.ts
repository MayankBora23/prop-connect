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

const APP_URL = 'https://aileadx.in'
const AUTH_URL = `${APP_URL}/auth`
const FROM_EMAIL = 'AILeadX Support <support@aileadx.in>'

type AppRole = 'super_admin' | 'admin' | 'manager' | 'sales'

const INVITER_ROLES: AppRole[] = ['super_admin', 'admin']

const ASSIGNABLE: Record<AppRole, AppRole[]> = {
  super_admin: ['admin', 'manager', 'sales'],
  admin: ['manager', 'sales'],
  manager: ['sales'],
  sales: [],
}

interface InviteBody {
  email: string
  role: AppRole
  companyId: string
  name?: string
  password: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inviteEmailHtml(
  displayName: string,
  role: string,
  loginEmail: string,
  loginPassword: string
): string {
  const roleLabel = escapeHtml(role.replace(/_/g, ' '))
  const safeName = escapeHtml(displayName)
  const safeEmail = escapeHtml(loginEmail)
  const safePassword = escapeHtml(loginPassword)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welcome to AILeadX</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:32px 32px 8px;background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">AILeadX</p>
              <h1 style="margin:12px 0 0;font-size:26px;line-height:1.3;color:#ffffff;font-weight:700;">Your account is ready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;color:#0f172a;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${safeName},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                You have been invited to AILeadX as <strong style="color:#1d4ed8;">${roleLabel}</strong>.
                Your administrator created your account. Use the credentials below to sign in.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;font-size:14px;line-height:1.8;color:#334155;">
                    <strong>Email:</strong> ${safeEmail}<br />
                    <strong>Password:</strong> <code style="background:#eef2ff;padding:2px 6px;border-radius:4px;">${safePassword}</code>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                <tr>
                  <td style="border-radius:10px;background:#1d4ed8;">
                    <a href="${AUTH_URL}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to AILeadX</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                For your security, change your password after your first login.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                Sent by AILeadX Support · support@aileadx.in
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendResendInviteEmail(
  to: string,
  name: string,
  role: string,
  loginEmail: string,
  loginPassword: string
): Promise<string | null> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured; skipping invite email')
    return null
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Welcome to AILeadX — your login details',
      html: inviteEmailHtml(name, role, loginEmail, loginPassword),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('Resend API error:', res.status, text)
    return `Failed to send invitation email (${res.status})`
  }

  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const authHeader = req.headers.get('authorization') || ''
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await authed.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as InviteBody
    const companyId = body.companyId ?? (body as { company_id?: string }).company_id
    const { email, role, name, password } = body

    if (!email?.trim() || !role || !companyId || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, role, companyId, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: inviterRole, error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (roleErr || !inviterRole?.role) {
      return new Response(JSON.stringify({ error: 'You do not have permission to invite members for this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const inviterRoleKey = inviterRole.role as AppRole
    if (!INVITER_ROLES.includes(inviterRoleKey)) {
      return new Response(JSON.stringify({ error: 'Only admins can invite team members' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allowed = ASSIGNABLE[inviterRoleKey] ?? []
    if (!allowed.includes(role)) {
      return new Response(JSON.stringify({ error: 'You cannot assign this role' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: company, error: companyFetchErr } = await supabaseAdmin
      .from('companies')
      .select('user_limit, industry')
      .eq('id', companyId)
      .single()

    if (companyFetchErr || !company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { count: memberCount, error: countErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    if (countErr) {
      console.error('Failed to count team members:', countErr)
      return new Response(JSON.stringify({ error: 'Failed to verify seat availability' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (company.industry !== 'internal_crm' && company.user_limit) {
      if ((memberCount ?? 0) >= company.user_limit) {
        return new Response(
          JSON.stringify({
            error:
              'User Limit Reached. You have used all purchased seats. Please purchase additional user seats to continue.',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const displayName = name?.trim() || normalizedEmail.split('@')[0] || 'Team Member'

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: displayName,
        company_id: companyId,
        role,
      },
    })

    if (createErr) {
      const msg = createErr.message ?? 'Failed to create user'
      const status =
        msg.includes('already been registered') || msg.includes('already exists')
          ? 409
          : msg.includes('rate limit')
            ? 429
            : 400
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = created.user?.id
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User was not created' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await new Promise((r) => setTimeout(r, 1200))

    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!existingRole) {
      const { error: roleInsertErr } = await supabaseAdmin.from('user_roles').insert({
        user_id: userId,
        company_id: companyId,
        role,
      })
      if (roleInsertErr) {
        return new Response(JSON.stringify({ error: roleInsertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) {
      await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        name: displayName,
        email: normalizedEmail,
        company_id: companyId,
      })
    }

    const emailError = await sendResendInviteEmail(
      normalizedEmail,
      displayName,
      role,
      normalizedEmail,
      password
    )
    if (emailError) {
      return new Response(
        JSON.stringify({
          error: emailError,
          user: created.user,
          emailSent: false,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        user: created.user,
        emailSent: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('invite-team-member error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
