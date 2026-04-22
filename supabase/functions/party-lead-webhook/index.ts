/**
 * Inbound webhooks for Indian property listing portals (99acres, Magicbricks, etc.).
 * Meta Lead Ads remain on `lead-webhook`; this function only handles ?token=&source= POSTs.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Must match source_configs.source_name + DB CHECK constraint */
const THIRD_PARTY_SOURCES = [
  '99acres',
  'magicbricks',
  'housing',
  'justdial',
  'squareyards',
  'quikrhomes',
] as const

type ThirdPartySource = (typeof THIRD_PARTY_SOURCES)[number]

function isThirdPartySource(s: string): s is ThirdPartySource {
  return (THIRD_PARTY_SOURCES as readonly string[]).includes(s)
}

interface CompanyRow {
  id: string
  webhook_token: string | null
  industry: string | null
}

interface SourceConfigRow {
  id: string
  is_active: boolean
}

interface NormalizedPortalLead {
  name: string | null
  phone: string | null
  email: string | null
  location: string | null
  message: string | null
  property_type: string | null
  budget: string | null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? url.searchParams.get('Token')
  const sourceRaw = url.searchParams.get('source') ?? url.searchParams.get('Source')
  const sourceParam = sourceRaw?.trim().toLowerCase() ?? ''

  if (!token) {
    return jsonResponse({ ok: false, error: 'Missing token' }, 400)
  }
  if (!sourceParam) {
    return jsonResponse({ ok: false, error: 'Missing source' }, 400)
  }
  if (!isThirdPartySource(sourceParam)) {
    return jsonResponse({ ok: false, error: 'Invalid source parameter' }, 400)
  }

  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, webhook_token, industry')
      .eq('webhook_token', token)
      .maybeSingle<CompanyRow>()

    if (companyError) {
      console.error('Error fetching company by webhook token:', companyError)
      return jsonResponse({ ok: false, error: 'Error resolving company' }, 500)
    }
    if (!company) {
      return jsonResponse({ ok: false, error: 'Invalid token' }, 404)
    }

    return handleThirdPartyLeadPost(req, company, sourceParam)
  } catch (err) {
    console.error('Unexpected error in party-lead-webhook:', err)
    return jsonResponse({ ok: false, error: 'Internal server error' }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Keep TEXT columns within reasonable bounds for PostgREST / UI */
function truncateText(value: string | null | undefined, maxLen: number): string | null {
  if (value == null || value === '') return null
  const t = value.trim()
  if (!t) return null
  return t.length <= maxLen ? t : t.slice(0, maxLen)
}

/** Ensure JSONB column only receives JSON-serializable data (portals sometimes send odd shapes) */
function jsonbSafe(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return { _coerced: String(value) }
  }
}

/**
 * Maps portal payload → public.leads columns (matches app `TablesInsert<'leads'>`):
 * name, phone, email, location, property_type, budget, source, notes, stage, lead_status,
 * company_id, raw_payload. Other columns use DB defaults / triggers (e.g. updated_at).
 */
async function handleThirdPartyLeadPost(
  req: Request,
  company: CompanyRow,
  source: ThirdPartySource,
): Promise<Response> {
  const industry = (company.industry ?? 'real_estate').toLowerCase()
  if (industry !== 'real_estate') {
    return jsonResponse({ ok: false, error: 'Third-party listing webhooks are only enabled for real_estate companies' }, 403)
  }

  const { data: cfg, error: cfgError } = await supabase
    .from('source_configs')
    .select('id, is_active')
    .eq('company_id', company.id)
    .eq('source_name', source)
    .maybeSingle<SourceConfigRow>()

  if (cfgError) {
    console.error('source_configs lookup failed', cfgError)
    return jsonResponse({ ok: false, error: 'Configuration lookup failed' }, 500)
  }

  if (!cfg?.is_active) {
    return jsonResponse({ ok: false, error: 'Source is not active for this company' }, 403)
  }

  let payload: unknown
  try {
    payload = await parseIncomingPayload(req)
  } catch (e) {
    console.error('Invalid inbound payload', e)
    return jsonResponse({ ok: false, error: 'Unreadable payload' }, 400)
  }

  const normalized = normalizePortalPayload(source, payload)

  if (!normalized.phone?.trim() && !normalized.email?.trim()) {
    return jsonResponse({ ok: false, error: 'Phone or email is required' }, 400)
  }

  const phone = (normalized.phone?.trim() || 'No Phone').slice(0, 64)
  const email = truncateText(normalized.email?.trim() ?? null, 320)
  const nameRaw =
    (normalized.name?.trim() || null) ||
    (email ? email.split('@')[0] : null) ||
    (phone !== 'No Phone' ? phone : null) ||
    `New ${source} lead`
  const name = truncateText(nameRaw, 500) ?? `New ${source} lead`

  const raw_payload = {
    source,
    received_at: new Date().toISOString(),
    body: jsonbSafe(payload),
  }

  const location = truncateText(normalized.location, 2000)
  const property_type = truncateText(normalized.property_type, 500)
  const budget = truncateText(normalized.budget, 500)
  const notes = truncateText(normalized.message, 8000)

  const leadInsert = {
    name,
    phone,
    email,
    location,
    property_type,
    budget,
    source,
    notes,
    stage: 'new' as const,
    lead_status: 'cold' as const,
    company_id: company.id,
    raw_payload,
  }

  console.log('Party lead mapped to leads row', {
    company_id: company.id,
    source,
    name,
    phone,
    has_email: !!email,
    location,
    property_type,
    budget,
  })

  try {
    const existingId = await findExistingLeadId(company.id, phone, email)

    if (existingId) {
      const { error: updErr } = await supabase
        .from('leads')
        .update({
          name,
          phone,
          email,
          location: leadInsert.location,
          property_type: leadInsert.property_type,
          budget: leadInsert.budget,
          source,
          notes: leadInsert.notes,
          raw_payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)

      if (updErr) {
        console.error('Lead update failed', updErr)
        return jsonResponse({ ok: false, error: 'Failed to update lead' }, 500)
      }
      return jsonResponse({ ok: true, lead_id: existingId, updated: true })
    }

    const { data: inserted, error: insErr } = await supabase
      .from('leads')
      .insert(leadInsert as Record<string, unknown>)
      .select('id')
      .single()

    if (insErr) {
      console.error('Lead insert failed', insErr)
      return jsonResponse({ ok: false, error: 'Failed to create lead' }, 500)
    }

    return jsonResponse({ ok: true, lead_id: inserted?.id ?? null, updated: false })
  } catch (err) {
    console.error('Third-party lead persistence error', err)
    return jsonResponse({ ok: false, error: 'Unexpected persistence error' }, 500)
  }
}

async function parseIncomingPayload(req: Request): Promise<unknown> {
  const ct = (req.headers.get('content-type') ?? '').toLowerCase()
  const raw = await req.text()

  if (!raw.trim()) {
    return {}
  }

  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw)
    return Object.fromEntries(params.entries())
  }

  if (ct.includes('application/json') || ct.includes('application/vnd.api+json')) {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      // fall through
    }
  }

  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return { _raw: raw }
    }
  }

  if (raw.includes('=') && raw.includes('&')) {
    const params = new URLSearchParams(raw)
    return Object.fromEntries(params.entries())
  }

  return { _raw: raw }
}

function normalizePortalPayload(source: ThirdPartySource, payload: unknown): NormalizedPortalLead {
  const flat = flattenUnknown(payload)
  const pick = (...keys: string[]) => pickFromFlat(flat, keys)

  const bySource: Record<ThirdPartySource, () => NormalizedPortalLead> = {
    '99acres': () => ({
      name: pick('leadname', 'lead_name', 'name', 'customername', 'customer_name', 'fullname', 'full_name'),
      phone: pick('phone', 'mobile', 'phoneno', 'phone_no', 'contactnumber', 'contact_number', 'mobileno'),
      email: pick('email', 'emailid', 'email_id', 'mail'),
      location: pick('city', 'location', 'locality', 'area', 'areaname', 'area_name', 'society'),
      message: pick('remarks', 'message', 'comments', 'query', 'requirement', 'description', 'details'),
      property_type: pick('propertytype', 'property_type', 'propertycategory', 'property_category', 'bhk', 'proptype'),
      budget: pick('budget', 'price', 'maxbudget', 'max_budget', 'expectedprice'),
    }),
    magicbricks: () => ({
      name: pick('customername', 'customer_name', 'name', 'username', 'contactname'),
      phone: pick('mobile', 'phone', 'phoneno', 'contactno', 'contact_no'),
      email: pick('email', 'emailid'),
      location: pick('city', 'locality', 'location', 'area'),
      message: pick('comments', 'message', 'query', 'requirement', 'remarks'),
      property_type: pick('propertytype', 'property_type', 'propertyfor', 'proptype'),
      budget: pick('budget', 'price', 'maxbudget'),
    }),
    housing: () => ({
      name: pick('contactname', 'contact_name', 'name', 'username', 'customername'),
      phone: pick('phone', 'mobile', 'phonenumber', 'phone_number'),
      email: pick('email', 'mail'),
      location: pick('city', 'locality', 'location', 'area'),
      message: pick('message', 'requirement', 'comments', 'query'),
      property_type: pick('propertytype', 'property_type', 'propertycategory', 'bhk'),
      budget: pick('budget', 'maxbudget', 'price'),
    }),
    justdial: () => ({
      name: pick('vname', 'name', 'contactname', 'companyname'),
      phone: pick('mobile', 'phone', 'vphone', 'contactnumber'),
      email: pick('email', 'mailid'),
      location: pick('area', 'city', 'locality'),
      message: pick('comments', 'message', 'category', 'leadtype'),
      property_type: pick('category', 'subcategory', 'type'),
      budget: pick('budget', 'price'),
    }),
    squareyards: () => ({
      name: pick('name', 'username', 'customername', 'leadname'),
      phone: pick('phone', 'mobile', 'contact'),
      email: pick('email'),
      location: pick('city', 'location', 'locality'),
      message: pick('message', 'comments', 'requirement', 'interest'),
      property_type: pick('propertytype', 'property_type', 'interestedin'),
      budget: pick('budget', 'price'),
    }),
    quikrhomes: () => ({
      name: pick('username', 'user_name', 'name', 'contactname'),
      phone: pick('phone', 'mobile', 'contactnumber'),
      email: pick('email', 'mail'),
      location: pick('locality', 'city', 'location'),
      message: pick('listingtitle', 'listing_title', 'message', 'comments'),
      property_type: pick('propertytype', 'property_type', 'category'),
      budget: pick('budget', 'price', 'expectedprice'),
    }),
  }

  const primary = bySource[source]()

  return {
    name: primary.name ?? pick('name', 'lead_name', 'customer_name', 'fullname'),
    phone: primary.phone ?? pick('phone', 'mobile', 'contact', 'msisdn'),
    email: primary.email ?? pick('email', 'mail'),
    location: primary.location ?? pick('location', 'city', 'locality', 'address'),
    message: primary.message ?? pick('message', 'remarks', 'comments', 'description'),
    property_type: primary.property_type ?? pick('property_type', 'propertytype', 'bhk'),
    budget: primary.budget ?? pick('budget', 'price'),
  }
}

function flattenUnknown(input: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()

  const walk = (v: unknown, p: string) => {
    if (v === null || v === undefined) return
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      if (p) out.set(p.toLowerCase(), String(v))
      return
    }
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, p ? `${p}[${i}]` : `[${i}]`))
      return
    }
    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const key = p ? `${p}.${k}` : k
        walk(val, key)
      }
    }
  }

  walk(input, prefix)

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const [k, val] of Object.entries(input as Record<string, unknown>)) {
      if (val === null || val === undefined) continue
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        out.set(k.toLowerCase(), String(val))
      }
    }
  }

  return out
}

function pickFromFlat(flat: Map<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    const direct = flat.get(k.toLowerCase())
    if (direct && direct.trim()) return direct.trim()
  }
  for (const k of keys) {
    const target = k.toLowerCase()
    for (const [fk, fv] of flat.entries()) {
      if (fk.endsWith(`.${target}`) || fk === target) {
        if (fv.trim()) return fv.trim()
      }
    }
  }
  return null
}

async function findExistingLeadId(
  companyId: string,
  phone: string,
  email: string | null,
): Promise<string | null> {
  if (email && email.includes('@')) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .ilike('email', email)
      .maybeSingle()
    if (data?.id) return data.id
  }

  for (const variant of phoneMatchVariants(phone)) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .eq('phone', variant)
      .maybeSingle()
    if (data?.id) return data.id
  }

  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) {
    const suffix = digits.slice(-10)
    const { data: rows, error } = await supabase
      .from('leads')
      .select('id, phone')
      .eq('company_id', companyId)
      .ilike('phone', `%${suffix}%`)
      .limit(25)

    if (!error && rows?.length) {
      const narrowed = rows.filter((r) => {
        const d = (r.phone ?? '').replace(/\D/g, '')
        return d.endsWith(suffix) || d === digits
      })
      if (narrowed.length === 1) return narrowed[0].id
    }
  }

  return null
}

function phoneMatchVariants(phone: string): string[] {
  const out = new Set<string>()
  const t = phone.trim()
  if (t) out.add(t)
  const d = t.replace(/\D/g, '')
  if (d) {
    out.add(d)
    if (d.length > 10) out.add(d.slice(-10))
    if (d.length === 10) {
      out.add(`91${d}`)
      out.add(`+91${d}`)
    }
  }
  return [...out]
}
