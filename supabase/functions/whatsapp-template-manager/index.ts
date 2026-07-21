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

interface TemplateRow {
  id: string
  company_id: string
  template_name: string
  meta_template_id: string | null
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  status: string
  body_text: string
  variables: string[]
  header_type: 'none' | 'text' | 'image' | 'document' | 'video' | null
  header_text: string | null
  header_media_url: string | null
  footer_text: string | null
  buttons: any[]
  example_values: Record<string, string> | null
  variable_labels: Record<string, string> | null
}

interface CompanyRow {
  id: string
  whatsapp_provider: string | null
  meta_phone_number_id: string | null
  meta_access_token: string | null
  meta_waba_id: string | null
  industry: string | null
}

function normalizeMetaRecipient(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

function getCountryCode(phone: string): string {
  const p = phone.trim()
  if (p.startsWith('+91')) return 'IN'
  if (p.startsWith('+971')) return 'AE'
  if (p.startsWith('+966')) return 'SA'
  if (p.startsWith('+974')) return 'QA'
  return 'GCC'
}

function resolveBodyText(body: string, variableValues: Record<string, string>): string {
  let text = body;
  for (const [key, val] of Object.entries(variableValues)) {
    text = text.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), val);
  }
  return text;
}

const mapStatus = (metaStatus: string): string => {
  const s = (metaStatus || '').toLowerCase();
  if (['draft', 'pending', 'approved', 'rejected', 'paused'].includes(s)) {
    return s;
  }
  return 'draft';
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { action, company_id } = payload

    if (!company_id) {
      return new Response('Missing company_id', { status: 400, headers: corsHeaders })
    }

    // Fetch company credentials
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, whatsapp_provider, meta_phone_number_id, meta_access_token, meta_waba_id, industry')
      .eq('id', company_id)
      .maybeSingle<CompanyRow>()

    if (companyError || !company) {
      return new Response('Company not found or query error', { status: 404, headers: corsHeaders })
    }

    if (company.whatsapp_provider !== 'meta') {
      return new Response('WhatsApp provider must be meta for templates', { status: 400, headers: corsHeaders })
    }

    const { meta_phone_number_id, meta_access_token, meta_waba_id } = company

    if (!meta_access_token) {
      return new Response('Missing Meta access token', { status: 400, headers: corsHeaders })
    }

    if (action === 'submit') {
      const { template_id } = payload
      if (!template_id) {
        return new Response('Missing template_id', { status: 400, headers: corsHeaders })
      }

      if (!meta_waba_id) {
        return new Response('Missing Meta WABA ID', { status: 400, headers: corsHeaders })
      }

      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('id', template_id)
        .single<TemplateRow>()

      if (templateError || !template) {
        return new Response('Template not found', { status: 404, headers: corsHeaders })
      }

      // Convert {{variable_name}} → {{1}}, {{2}}, {{3}} for Meta
      function toPositionalBody(bodyText: string, variables: string[]): string {
        let converted = bodyText
        variables.forEach((varName, index) => {
          converted = converted.replace(
            new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'),
            `{{${index + 1}}}`
          )
        })
        return converted
      }

      const positionalBody = toPositionalBody(template.body_text, template.variables || [])
      const components: any[] = [
        {
          type: 'BODY',
          text: positionalBody,
          // Include example values so Meta doesn't reject for missing examples
          ...(template.variables && template.variables.length > 0 ? {
            example: {
              body_text: [
                template.variables.map((v: string) => {
                  const savedVal = template.example_values?.[v]
                  return savedVal && String(savedVal).trim() !== '' ? String(savedVal) : `Sample ${v.replace(/_/g, ' ')}`
                })
              ]
            }
          } : {})
        }
      ]

      if (template.header_type === 'text' && template.header_text) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: template.header_text
        })
      } else if (template.header_type && template.header_type !== 'none') {
        const headerFormat = String(template.header_type).toUpperCase()
        const headerComp: Record<string, unknown> = {
          type: 'HEADER',
          format: headerFormat,
        }

        if (template.header_media_url && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat)) {
          console.log(`Starting resumable upload to Meta for ${headerFormat}: ${template.header_media_url}`)
          try {
            // 1. Download file from Supabase storage url
            const fileRes = await fetch(template.header_media_url)
            if (!fileRes.ok) {
              throw new Error(`Failed to download template media file: ${fileRes.statusText}`)
            }
            const fileBlob = await fileRes.blob()
            const fileLength = fileBlob.size
            const fileType = fileBlob.type || (headerFormat === 'IMAGE' ? 'image/jpeg' : headerFormat === 'VIDEO' ? 'video/mp4' : 'application/pdf')

            // 2. Fetch App ID from token
            const appRes = await fetch(`https://graph.facebook.com/v18.0/app?access_token=${meta_access_token}`)
            if (!appRes.ok) {
              throw new Error(`Failed to retrieve App ID from Meta: ${await appRes.text()}`)
            }
            const appData = await appRes.json()
            const appId = appData.id

            // 3. Initiate upload session
            const fileName = template.header_media_url.split('/').pop() || `sample_${headerFormat.toLowerCase()}`
            const sessionUrl = `https://graph.facebook.com/v18.0/${appId}/uploads?file_name=${encodeURIComponent(fileName)}&file_length=${fileLength}&file_type=${fileType}&access_token=${meta_access_token}`
            const sessionRes = await fetch(sessionUrl, { method: 'POST' })
            if (!sessionRes.ok) {
              throw new Error(`Failed to create Meta upload session: ${await sessionRes.text()}`)
            }
            const sessionData = await sessionRes.json()
            const uploadSessionId = sessionData.id

            // 4. Upload file content
            const uploadUrl = `https://graph.facebook.com/v18.0/${uploadSessionId}`
            const uploadRes = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `OAuth ${meta_access_token}`,
                'file_offset': '0',
                'Content-Type': 'application/octet-stream'
              },
              body: fileBlob
            })
            if (!uploadRes.ok) {
              throw new Error(`Failed to upload media data to Meta: ${await uploadRes.text()}`)
            }
            const uploadData = await uploadRes.json()
            const headerHandle = uploadData.h

            if (!headerHandle) {
              throw new Error('Upload succeeded but no header handle was returned in Meta response')
            }

            console.log(`Resumable upload completed successfully. Handle: ${headerHandle}`)
            headerComp.example = {
              header_handle: [headerHandle]
            }
          } catch (uploadErr) {
            console.error('Meta Resumable Upload failed:', uploadErr)
            return new Response(JSON.stringify({
              error: `Media upload to Meta failed: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
        components.push(headerComp)
      }

      if (template.footer_text) {
        components.push({
          type: 'FOOTER',
          text: template.footer_text
        })
      }

      if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
        const metaButtons = template.buttons.map((btn: any) => {
          if (btn.type === 'QUICK_REPLY') {
            return {
              type: 'QUICK_REPLY',
              text: btn.text
            }
          } else if (btn.type === 'URL') {
            return {
              type: 'URL',
              text: btn.text,
              url: btn.url
            }
          } else if (btn.type === 'PHONE_NUMBER') {
            return {
              type: 'PHONE_NUMBER',
              text: btn.text,
              phone_number: btn.phone_number
            }
          }
          return btn
        })

        components.push({
          type: 'BUTTONS',
          buttons: metaButtons
        })
      }

      const metaPayload = {
        name: template.template_name,
        category: template.category,
        language: template.language || 'en',
        components
      }

      const metaUrl = `https://graph.facebook.com/v18.0/${meta_waba_id}/message_templates`
      console.log('Submitting template to Meta:', JSON.stringify(metaPayload))

      const metaRes = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaPayload)
      })

      if (!metaRes.ok) {
        const errText = await metaRes.text()
        return new Response(`Meta API error: ${errText}`, { status: 500, headers: corsHeaders })
      }

      const metaResponseData = await metaRes.json()
      const metaTemplateId = metaResponseData.id

      // Update local row
      await supabase
        .from('whatsapp_templates')
        .update({
          status: 'pending',
          meta_template_id: metaTemplateId,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', template_id)

      return new Response(JSON.stringify({
        success: true,
        meta_template_id: metaTemplateId,
        status: 'pending'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'sync') {
      if (!meta_waba_id) {
        return new Response('Missing Meta WABA ID', { status: 400, headers: corsHeaders })
      }

      const metaUrl = `https://graph.facebook.com/v18.0/${meta_waba_id}/message_templates?limit=100`
      const metaRes = await fetch(metaUrl, {
        headers: {
          'Authorization': `Bearer ${meta_access_token}`
        }
      })

      if (!metaRes.ok) {
        const errText = await metaRes.text()
        return new Response(`Meta API error: ${errText}`, { status: 500, headers: corsHeaders })
      }

      const metaData = await metaRes.json()
      const metaTemplates: any[] = metaData.data || []

      // Fetch local templates
      const { data: localTemplates } = await supabase
        .from('whatsapp_templates')
        .select('id, template_name, meta_template_id')
        .eq('company_id', company_id)

      type LocalTemplate = { id: string; template_name: string; meta_template_id: string | null }
      const rows = (localTemplates ?? []) as LocalTemplate[]
      const localByMetaId = new Map<string, LocalTemplate>(rows.filter((t: LocalTemplate) => t.meta_template_id).map((t: LocalTemplate) => [t.meta_template_id as string, t]))
      const localByName = new Map<string, LocalTemplate>(rows.map((t: LocalTemplate) => [t.template_name, t]))

      let synced_count = 0

      for (const mt of metaTemplates) {
        let body_text = ''
        let header_type = 'none'
        let header_text: string | null = null
        let footer_text: string | null = null
        let buttons: any[] = []

        if (mt.components) {
          for (const comp of mt.components) {
            if (comp.type === 'BODY') {
              body_text = comp.text || ''
            } else if (comp.type === 'HEADER') {
              header_type = (comp.format || 'none').toLowerCase()
              if (header_type === 'text') {
                header_text = comp.text || null
              }
            } else if (comp.type === 'FOOTER') {
              footer_text = comp.text || null
            } else if (comp.type === 'BUTTONS') {
              buttons = comp.buttons || []
            }
          }
        }

        // Auto detect variables from body text
        const variables: string[] = []
        const varMatches = body_text.match(/\{\{\s*(\w+)\s*\}\}/g)
        if (varMatches) {
          varMatches.forEach(m => {
            const v = m.replace(/\{\{|\}\}/g, '').trim()
            if (!variables.includes(v)) {
              variables.push(v)
            }
          })
        }

        const localRow = localByMetaId.get(mt.id) || localByName.get(mt.name)

        if (localRow) {
          await supabase
            .from('whatsapp_templates')
            .update({
              meta_template_id: mt.id,
              status: mapStatus(mt.status),
              rejection_reason: mt.rejection_reason || null,
              last_synced_at: new Date().toISOString()
            })
            .eq('id', localRow.id)
        } else {
          await supabase
            .from('whatsapp_templates')
            .insert({
              company_id,
              template_name: mt.name,
              meta_template_id: mt.id,
              category: mt.category,
              language: mt.language || 'en',
              status: mapStatus(mt.status),
              body_text,
              variables,
              header_type,
              header_text,
              footer_text,
              buttons,
              rejection_reason: mt.rejection_reason || null,
              last_synced_at: new Date().toISOString()
            })
        }
        synced_count++
      }

      return new Response(JSON.stringify({
        success: true,
        synced_count
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'delete') {
      const { template_id, template_name } = payload
      if (!template_id || !template_name) {
        return new Response('Missing template_id or template_name', { status: 400, headers: corsHeaders })
      }

      if (meta_waba_id) {
        try {
          const metaUrl = `https://graph.facebook.com/v18.0/${meta_waba_id}/message_templates?name=${template_name}`
          const metaRes = await fetch(metaUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${meta_access_token}`
            }
          })
          if (!metaRes.ok) {
            console.warn(`Meta template deletion API warned: ${await metaRes.text()}`)
          }
        } catch (e) {
          console.warn('Meta template deletion API exception:', e)
        }
      }

      await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', template_id)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'send_template') {
      const { conversation_id, template_id, variable_values = {} } = payload
      if (!conversation_id || !template_id) {
        return new Response('Missing conversation_id or template_id', { status: 400, headers: corsHeaders })
      }

      if (!meta_phone_number_id) {
        return new Response('Missing Meta phone number ID', { status: 400, headers: corsHeaders })
      }

      // Fetch conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .select('contact_phone, company_id')
        .eq('id', conversation_id)
        .single()

      if (conversationError || !conversation) {
        return new Response('Conversation not found', { status: 404, headers: corsHeaders })
      }

      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('id', template_id)
        .single<TemplateRow>()

      if (templateError || !template) {
        return new Response('Template not found', { status: 404, headers: corsHeaders })
      }

      // Build parameters with safety check
      const orderedParams = ((template.variables || []) as string[]).map((v: string) => ({
        type: 'text',
        text: (variable_values as Record<string, string>)[v] || `[${v}]`
      }))

      const toMeta = normalizeMetaRecipient(conversation.contact_phone)

      // Build components array — must include header component for media templates
      const sendComponents: any[] = []

      const headerType = (template.header_type || 'none').toLowerCase()
      if (headerType === 'image' && template.header_media_url) {
        sendComponents.push({
          type: 'header',
          parameters: [{
            type: 'image',
            image: { link: template.header_media_url }
          }]
        })
      } else if (headerType === 'video' && template.header_media_url) {
        sendComponents.push({
          type: 'header',
          parameters: [{
            type: 'video',
            video: { link: template.header_media_url }
          }]
        })
      } else if (headerType === 'document' && template.header_media_url) {
        sendComponents.push({
          type: 'header',
          parameters: [{
            type: 'document',
            document: { link: template.header_media_url }
          }]
        })
      }

      if (orderedParams.length > 0) {
        sendComponents.push({
          type: 'body',
          parameters: orderedParams
        })
      }

      const metaSendPayload = {
        messaging_product: 'whatsapp',
        to: toMeta,
        type: 'template',
        template: {
          name: template.template_name,
          language: { code: template.language || 'en' },
          components: sendComponents
        }
      }

      const sendUrl = `https://graph.facebook.com/v18.0/${meta_phone_number_id}/messages`
      const sendRes = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaSendPayload)
      })

      if (!sendRes.ok) {
        const errText = await sendRes.text()
        return new Response(`Meta Send API error: ${errText}`, { status: 500, headers: corsHeaders })
      }

      const sendData = await sendRes.json()
      const outboundMessageSid = sendData?.messages?.[0]?.id || sendData?.id

      const resolvedText = resolveBodyText(template.body_text, variable_values)

      // Resolve media attachments if the template has a header image, video, or document
      const fileUrls = template.header_media_url ? [template.header_media_url] : null
      const resolvedHeaderType = (template.header_type || 'none').toLowerCase()
      const fileTypes = template.header_media_url && ['image', 'video', 'document'].includes(resolvedHeaderType) ? [resolvedHeaderType] : null
      const fileNames = template.header_media_url ? [template.header_media_url.split('/').pop() || 'media'] : null

      // Insert message record
      const { data: messageData, error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation_id,
          company_id: company_id,
          direction: 'outgoing',
          body: resolvedText,
          status: 'sent',
          message_sid: outboundMessageSid || null,
          file_urls: fileUrls,
          file_types: fileTypes,
          file_names: fileNames
        })
        .select()
        .single()

      if (messageError) {
        return new Response(`Database message insertion failed: ${messageError.message}`, { status: 500, headers: corsHeaders })
      }

      // Update conversation last_message_at
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation_id)

      // ── RAZORPAY / WALLET PLATFORM FEE DEDUCTION (₹0.20) ────────────────────
      // internal_crm is exempt — Meta bills them directly
      if (company.industry === 'internal_crm') {
        console.log('internal_crm — skipping platform fee deduction for template send')
      } else {
        const destination_country_raw = getCountryCode(conversation.contact_phone)
        try {
          const { data: pricingRow } = await supabase
            .from('service_pricing')
            .select('client_price_inr')
            .eq('provider', 'meta')
            .eq('service_type', 'whatsapp')
            .eq('message_category', 'platform_fee')
            .eq('is_active', true)
            .maybeSingle()

          const PLATFORM_FEE_INR = pricingRow
            ? Number(pricingRow.client_price_inr)
            : 0.20

          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance, min_balance_threshold')
            .eq('company_id', company_id)
            .maybeSingle()

          if (wallet) {
            const balance = Number(wallet.balance)
            const minThreshold = Number(wallet.min_balance_threshold ?? 0)

            if (balance >= PLATFORM_FEE_INR && balance > minThreshold) {
              const { data: newBalance, error: rpcErr } = await supabase.rpc(
                'try_deduct_wallet_balance',
                {
                  p_company_id: company_id,
                  p_cost: PLATFORM_FEE_INR,
                }
              )

              if (!rpcErr && newBalance !== null && newBalance !== undefined) {
                await supabase.from('wallet_transactions').insert({
                  company_id: company_id,
                  type: 'debit',
                  provider: 'meta',
                  service_type: 'whatsapp',
                  amount_inr: PLATFORM_FEE_INR,
                  usage_quantity: 1,
                  destination_country: destination_country_raw,
                  message_category: 'platform_fee',
                  reference_id: outboundMessageSid ?? `meta_${Date.now()}`,
                  status: 'completed',
                })

                await supabase.from('usage_logs').insert({
                  company_id: company_id,
                  provider: 'meta',
                  service_type: 'whatsapp',
                  usage_type: 'message',
                  quantity: 1,
                  destination_country: destination_country_raw,
                  message_category: 'platform_fee',
                  credits_deducted: PLATFORM_FEE_INR,
                  reference_id: outboundMessageSid ?? `meta_${Date.now()}`,
                })

                console.log('Meta platform fee deducted:', {
                  company_id: company_id,
                  amount: PLATFORM_FEE_INR,
                  new_balance: newBalance,
                })
              }
            }
          }
        } catch (deductionErr) {
          console.error('Wallet deduction failed:', deductionErr)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message_id: messageData.id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      return new Response('Unsupported action', { status: 400, headers: corsHeaders })
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})
