import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface MetaFieldData {
  name: string
  values?: unknown[]
}

interface MetaChangeValue {
  field_data?: MetaFieldData[]
  leadgen_id?: string
  form_id?: string
  platform?: string
  referral?: unknown
  [key: string]: unknown
}

interface MetaChange {
  value?: MetaChangeValue
  [key: string]: unknown
}

interface MetaEntry {
  changes?: MetaChange[]
  [key: string]: unknown
}

interface MetaWebhookBody {
  entry?: MetaEntry[]
  [key: string]: unknown
}

interface CompanyRow {
  id: string
  webhook_token: string | null
  meta_verify_token: string | null
  enable_meta_leads: boolean | null
  meta_access_token: string | null
  industry: string | null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const metaGraphVersion = Deno.env.get('META_GRAPH_API_VERSION') ?? 'v21.0'

const supabase = createClient(supabaseUrl, serviceRoleKey)

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response('Missing token', { status: 400, headers: corsHeaders })
  }

  try {
    // Look up company by webhook token for all request types
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, webhook_token, meta_verify_token, enable_meta_leads, meta_access_token, industry')
      .eq('webhook_token', token)
      .maybeSingle<CompanyRow>()

    if (companyError) {
      console.error('Error fetching company by webhook token:', companyError)
      return new Response('Error resolving company', { status: 500, headers: corsHeaders })
    }

    if (!company) {
      return new Response('Invalid token', { status: 404, headers: corsHeaders })
    }

    if (req.method === 'GET') {
      return handleMetaVerification(req, url, company)
    }

    if (req.method === 'POST') {
      return handleLeadDelivery(req, company)
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  } catch (err) {
    console.error('Unexpected error in lead-webhook function:', err)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

function handleMetaVerification(req: Request, url: URL, company: CompanyRow): Response {
  const mode = url.searchParams.get('hub.mode')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = url.searchParams.get('hub.verify_token')

  // Meta verification handshake
  if (
    mode === 'subscribe' &&
    !!challenge &&
    verifyToken &&
    company.meta_verify_token &&
    verifyToken === company.meta_verify_token
  ) {
    console.log('Meta webhook verified for company', company.id)
    return new Response(challenge, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    })
  }

  console.warn('Meta verification failed', {
    companyId: company.id,
    mode,
    hasChallenge: !!challenge,
    providedVerifyToken: verifyToken,
  })

  return new Response('Verification failed', { status: 403, headers: corsHeaders })
}

async function handleLeadDelivery(req: Request, company: CompanyRow): Promise<Response> {
  // Top-level safety net: never let unhandled errors propagate a non-200 back to Meta.
  try {
    if (!company.enable_meta_leads) {
      console.warn('Meta leads disabled for company', company.id)
      // Still return 200 OK to keep Meta happy
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // Parse the incoming webhook body as JSON. Any parsing error is logged but we still return 200.
    let bodyJson: MetaWebhookBody | null = null

    try {
      bodyJson = (await req.json()) as MetaWebhookBody
    } catch (err) {
      console.error('Failed to parse JSON body from Meta webhook:', err)
      // Do not bubble error to Meta
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    const value = bodyJson.entry?.[0]?.changes?.[0]?.value

    if (!value) {
      console.warn('Meta payload missing entry[0].changes[0].value', bodyJson)
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // Try to resolve the leadgen_id from the webhook value. Some payloads use different keys.
    const leadgenId =
      value.leadgen_id ??
      (typeof (value as any).lead_id === 'string' ? (value as any).lead_id : undefined) ??
      (typeof (value as any).id === 'string' ? (value as any).id : undefined)

    // Keep a flag for test IDs (Lead Ads Testing Tool), but don't treat them specially anymore
    // beyond logging – we still fetch Graph data when possible.
    const isMockLead = leadgenId === '444444444444'

    let graphLead: { [key: string]: unknown } | null = null

    // 1) Graph API fetch: when Meta provides a leadgen_id and we have a Page Access Token,
    //    ALWAYS call the Graph API to hydrate full lead details.
    if (leadgenId && company.meta_access_token && company.meta_access_token.trim() !== '') {
      try {
        const fields = ['field_data', 'created_time', 'form_id', 'ad_id'].join(',')

        const graphUrl = new URL(`https://graph.facebook.com/${metaGraphVersion}/${leadgenId}`)
        graphUrl.searchParams.set('access_token', company.meta_access_token)
        graphUrl.searchParams.set('fields', fields)

        const res = await fetchWithTimeout(
          graphUrl.toString(),
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
          10_000,
        )

        const text = await res.text()

        if (!res.ok) {
          // Explicit logging for visibility in Supabase dashboard
          console.error('Meta Graph API error while hydrating lead', {
            status: res.status,
            body: text,
            leadgenId,
            companyId: company.id,
          })
        } else {
          try {
            graphLead = text ? (JSON.parse(text) as { [key: string]: unknown }) : {}

            const graphFieldData = (graphLead as any)?.field_data
            if (Array.isArray(graphFieldData)) {
              // Overwrite webhook field_data with the canonical Graph API field_data
              ;(value as any).field_data = graphFieldData
            }

            console.log('Meta Graph API lead fetch succeeded', {
              companyId: company.id,
              leadgenId,
              hasFieldData: Array.isArray(graphFieldData),
            })
          } catch (parseErr) {
            console.error('Failed to parse Meta Graph API response JSON', {
              parseErr,
              leadgenId,
              companyId: company.id,
            })
          }
        }
      } catch (err) {
        console.error('Error calling Meta Graph API', { err, leadgenId, companyId: company.id })
      }
    } else if (!leadgenId) {
      console.warn('Meta payload missing leadgen_id; will rely solely on webhook field_data', {
        companyId: company.id,
        value,
      })
    } else if (isMockLead) {
      console.log('Received mock/test Meta leadgen_id; Graph API may still be called for hydration', {
        companyId: company.id,
        leadgenId,
      })
    } else {
      console.warn('Meta access token not configured; skipping Graph API call', {
        companyId: company.id,
        leadgenId,
      })
    }

    // Field extraction with extra safety: never let mapping crashes bubble up to Deno (avoids 502s).
    let email: string | null = null
    let fullName: string | null = null
    let phone: string | null = null
    let city: string | null = null
    let source: string | null = null

    try {
      // If Graph API succeeded with field_data, prefer that; otherwise fall back to raw webhook data.
      const sourceFieldData = (Array.isArray((graphLead as any)?.field_data)
        ? (graphLead as any).field_data
        : Array.isArray((value as any).field_data)
          ? (value as any).field_data
          : []) as MetaFieldData[]

      // Normalize field_data to a simple key/value map
      const fieldMap: Record<string, string> = {}

      for (const field of sourceFieldData) {
        if (!field?.name) continue

        const key = String(field.name).toLowerCase()
        const firstValue =
          Array.isArray(field.values) && field.values.length > 0
            ? String(field.values[0] ?? '')
            : ''

        if (!firstValue) continue
        fieldMap[key] = firstValue
      }

      email =
        fieldMap['email'] ??
        fieldMap['email_address'] ??
        null

      fullName =
        fieldMap['full_name'] ??
        fieldMap['name'] ??
        null

      phone =
        fieldMap['phone_number'] ??
        fieldMap['phone'] ??
        fieldMap['mobile'] ??
        null

      city =
        fieldMap['city'] ??
        fieldMap['location'] ??
        null

      // Enhanced platform / source detection:
      // - checks both the explicit "platform" field and the full serialized payload
      // - priority: whatsapp_form > instagram > facebook
      // - fallback: 'meta' if nothing can be confidently detected
      const serializedValue = JSON.stringify({ webhook: value, graph: graphLead }).toLowerCase()
      const platformString = (value.platform ? String(value.platform) : '').toLowerCase()

      if (platformString.includes('whatsapp') || serializedValue.includes('whatsapp')) {
        source = 'whatsapp_form'
      } else if (platformString.includes('instagram') || serializedValue.includes('instagram')) {
        source = 'instagram'
      } else if (platformString.includes('facebook') || serializedValue.includes('facebook')) {
        source = 'facebook'
      } else {
        source = 'meta'
      }
    } catch (err) {
      console.error('Error mapping Meta lead fields; falling back to minimal defaults', {
        err,
        companyId: company.id,
        leadgenId,
      })
    }

    // leads.phone is NOT NULL in schema, so ensure we send a non-empty fallback.
    // For Meta leads without phone, use a placeholder instead of null.
    const safePhone = phone && phone.trim() !== '' ? phone : 'No Phone'

    const primaryName =
      (fullName && fullName.trim() !== '' ? fullName : null) ||
      (email && email.trim() !== '' ? email : null) ||
      (safePhone && safePhone.trim() !== '' ? safePhone : null)

    const leadName = primaryName ?? 'New Meta Lead'

    // Build a canonical mapped lead object and log it before any DB insert.
    const mappedLead = {
      name: leadName,
      email,
      phone: safePhone,
      city,
      source,
      company_id: company.id,
      leadgen_id: leadgenId ?? null,
      is_mock: isMockLead,
      industry: company.industry ?? null,
    }

    console.log('Mapped Meta lead ready for insert', mappedLead)

    const rawPayload = {
      webhook: bodyJson,
      webhook_value: value,
      leadgen_id: leadgenId,
      graph: graphLead,
    } as unknown

    // Route to correct table per industry
    const industry = (company.industry ?? 'real_estate').toLowerCase()

    try {
      if (industry === 'education') {
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            name: leadName,
            phone: safePhone,
            email: email,
            address: city,
            stage: 'new_students',
            company_id: company.id,
            source,
            raw_payload: rawPayload,
          } as any)

        if (insertError) {
          console.error('Error inserting Meta student lead', {
            message: (insertError as any).message ?? 'unknown',
            details: insertError,
          })
        } else {
          console.log('Meta student lead stored successfully for company', company.id, mappedLead)
        }
      } else if (industry === 'automobile_dealers') {
        const { error: insertError } = await supabase
          .from('auto_leads')
          .insert({
            name: leadName,
            phone: safePhone,
            email: email,
            status: 'new_lead',
            company_id: company.id,
            source,
            raw_payload: rawPayload,
          } as any)

        if (insertError) {
          console.error('Error inserting Meta auto lead', {
            message: (insertError as any).message ?? 'unknown',
            details: insertError,
          })
        } else {
          console.log('Meta auto lead stored successfully for company', company.id, mappedLead)
        }
      } else {
        // Default: real_estate + any other industries route to leads table
        const { error: insertError } = await supabase
          .from('leads')
          .insert({
            name: leadName,
            phone: safePhone,
            email: email,
            location: city,
            source,
            stage: 'new',
            company_id: company.id,
            raw_payload: rawPayload,
          } as any)

        if (insertError) {
          console.error('Error inserting Meta lead', {
            message: (insertError as any).message ?? 'unknown',
            details: insertError,
          })
        } else {
          console.log('Meta lead stored successfully for company', company.id, mappedLead)
        }
      }
    } catch (err) {
      console.error('Unexpected error inserting Meta lead:', err)
    }

    // Always acknowledge with 200 OK so Meta keeps the webhook active
    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error('Unhandled error in handleLeadDelivery; responding with 200 to Meta', {
      err,
      companyId: company.id,
    })
    return new Response('ok', { status: 200, headers: corsHeaders })
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
