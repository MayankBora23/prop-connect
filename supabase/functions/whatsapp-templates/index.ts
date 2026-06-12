// WhatsApp Template Management Module Controller
// Deno Edge runtime function

// @ts-ignore Deno URL import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface TemplateInput {
  templateName: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  content: string
  headerType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE'
  headerText?: string
  headerMediaUrl?: string
  footerText?: string
  buttons?: any[]
}

// Extract variables matching {{var_name}}
function extractVariables(headerText?: string, bodyText?: string): string[] {
  const variables: string[] = []
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g
  let match
  
  if (headerText) {
    while ((match = regex.exec(headerText)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1])
      }
    }
  }
  
  if (bodyText) {
    regex.lastIndex = 0
    while ((match = regex.exec(bodyText)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1])
      }
    }
  }
  
  return variables
}

// Validate template name (lowercase, numbers, underscores only)
function isValidTemplateName(name: string): boolean {
  if (!name || name.length > 512) return false
  const nameRegex = /^[a-z0-9_]+$/
  return nameRegex.test(name)
}

// Translate dynamic body text to positional positional variables for Meta (e.g. {{customer_name}} -> {{1}})
function translateToMetaComponents(template: any) {
  const components: any[] = []

  // 1. Header
  if (template.header_type && template.header_type !== 'NONE') {
    const headerComp: any = {
      type: 'HEADER',
      format: template.header_type,
    }
    if (template.header_type === 'TEXT' && template.header_text) {
      let index = 1
      let text = template.header_text
      const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g
      text = text.replace(regex, () => `{{${index++}}}`)
      headerComp.text = text
    } else if (template.header_media_url) {
      // For media headers in Meta, we provide a placeholder handle or media link in the template request
      headerComp.example = {
        header_handle: [template.header_media_url]
      }
    }
    components.push(headerComp)
  }

  // 2. Body
  let bodyText = template.content || ''
  let index = 1
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g
  bodyText = bodyText.replace(regex, () => `{{${index++}}}`)
  components.push({
    type: 'BODY',
    text: bodyText,
  })

  // 3. Footer
  if (template.footer_text) {
    components.push({
      type: 'FOOTER',
      text: template.footer_text,
    })
  }

  // 4. Buttons
  if (template.buttons && Array.isArray(template.buttons) && template.buttons.length > 0) {
    const formattedButtons = template.buttons.map((btn: any) => {
      if (btn.type === 'QUICK_REPLY') {
        return {
          type: 'QUICK_REPLY',
          text: btn.text,
        }
      } else if (btn.type === 'PHONE_NUMBER') {
        return {
          type: 'PHONE_NUMBER',
          text: btn.text,
          phone_number: btn.phone_number || btn.phoneNumber || '',
        }
      } else if (btn.type === 'URL') {
        return {
          type: 'URL',
          text: btn.text,
          url: btn.url || '',
        }
      }
      return btn
    })
    components.push({
      type: 'BUTTONS',
      buttons: formattedButtons,
    })
  }

  return components
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const funcIndex = pathParts.indexOf('whatsapp-templates')
  const relativeParts = funcIndex !== -1 ? pathParts.slice(funcIndex + 1) : []
  const subRoute = relativeParts.join('/')

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const serviceClient = createClient(supabaseUrl, serviceKey)

    // Authenticate user
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Resolve company and role
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError || !profile?.company_id) {
      return new Response(JSON.stringify({ error: 'User company or profile not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const companyId = profile.company_id
    let userRole = profile.role

    // Fallback query to user_roles table if profiles.role is missing
    if (!userRole) {
      const { data: roleData } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .maybeSingle()
      if (roleData) {
        userRole = roleData.role
      }
    }

    const isAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager'

    // ==========================================
    // ROUTE: GET /status
    // ==========================================
    if (subRoute === 'status' && req.method === 'GET') {
      const { data: templates, error: fetchErr } = await serviceClient
        .from('whatsapp_templates')
        .select('status, template_name, category')
        .eq('company_id', companyId)

      if (fetchErr) throw fetchErr

      const stats = {
        total: templates.length,
        approved: templates.filter(t => t.status === 'approved').length,
        pending: templates.filter(t => t.status === 'pending').length,
        rejected: templates.filter(t => t.status === 'rejected').length,
        draft: templates.filter(t => t.status === 'draft').length,
        paused: templates.filter(t => t.status === 'paused').length,
      }

      // Mock template usage analytics (most used templates & campaigns)
      const mockAnalytics = {
        mostUsed: templates.slice(0, 3).map((t, idx) => ({
          name: t.template_name,
          category: t.category,
          sentCount: [248, 185, 94][idx] || 15,
          deliveredRate: '98.5%',
          readRate: '86.2%',
        })),
        campaignUsage: [
          { campaignName: 'Summer Launch Broadcast', templateName: templates[0]?.template_name || 'project_launch', date: new Date().toISOString(), sentCount: 150 },
          { campaignName: 'Admissions Open Drive', templateName: templates[1]?.template_name || 'admissions_open', date: new Date(Date.now() - 86400000 * 2).toISOString(), sentCount: 98 }
        ]
      }

      return new Response(JSON.stringify({ stats, analytics: mockAnalytics }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================
    // ROUTE: POST /clone
    // ==========================================
    if (subRoute === 'clone' && req.method === 'POST') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const { templateId, newName } = await req.json()
      if (!templateId || !newName) {
        return new Response(JSON.stringify({ error: 'Missing templateId or newName' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      if (!isValidTemplateName(newName)) {
        return new Response(JSON.stringify({ error: 'Invalid template name. Use lowercase, numbers, and underscores only.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Check duplicate name
      const { data: existing } = await serviceClient
        .from('whatsapp_templates')
        .select('id')
        .eq('company_id', companyId)
        .eq('template_name', newName)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: 'A template with this name already exists in this company.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Get original template
      const { data: original, error: origError } = await serviceClient
        .from('whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .eq('company_id', companyId)
        .single()

      if (origError || !original) {
        return new Response(JSON.stringify({ error: 'Original template not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Insert clone
      const { data: clone, error: insertError } = await serviceClient
        .from('whatsapp_templates')
        .insert({
          company_id: companyId,
          template_name: newName,
          category: original.category,
          language: original.language,
          status: 'draft',
          content: original.content,
          variables: original.variables,
          header_type: original.header_type,
          header_text: original.header_text,
          header_media_url: original.header_media_url,
          footer_text: original.footer_text,
          buttons: original.buttons,
          created_by: user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      return new Response(JSON.stringify(clone), { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================
    // ROUTE: POST /submit
    // ==========================================
    if (subRoute === 'submit' && req.method === 'POST') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const { templateId } = await req.json()
      if (!templateId) {
        return new Response(JSON.stringify({ error: 'Missing templateId' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Fetch template
      const { data: template, error: fetchErr } = await serviceClient
        .from('whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .eq('company_id', companyId)
        .single()

      if (fetchErr || !template) {
        return new Response(JSON.stringify({ error: 'Template not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      if (template.status === 'pending' || template.status === 'approved') {
        return new Response(JSON.stringify({ error: `Cannot submit. Template is already ${template.status}` }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Fetch company meta credentials
      const { data: company, error: compErr } = await serviceClient
        .from('companies')
        .select('whatsapp_provider, meta_waba_id, meta_access_token')
        .eq('id', companyId)
        .single()

      if (compErr) throw compErr

      const useRealMeta = company.whatsapp_provider === 'meta' && company.meta_waba_id && company.meta_access_token

      if (useRealMeta) {
        try {
          const wabaId = company.meta_waba_id
          const accessToken = company.meta_access_token
          const components = translateToMetaComponents(template)

          const payload = {
            name: template.template_name,
            category: template.category,
            language: template.language || 'en_US',
            components,
          }

          console.log(`Submitting template to Meta: WABA ${wabaId}`, payload)

          const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/message_templates`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          const data = await response.json()

          if (!response.ok) {
            console.error('Meta API error:', data)
            return new Response(JSON.stringify({ 
              error: 'Meta API error', 
              details: data.error?.message || data 
            }), { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            })
          }

          // Update database
          const metaTemplateId = data.id || `meta_${Math.random().toString(36).substr(2, 9)}`
          const metaStatus = (data.status || 'PENDING').toLowerCase()
          const newStatus = metaStatus === 'approved' ? 'approved' : 'pending'

          const { data: updated, error: updateErr } = await serviceClient
            .from('whatsapp_templates')
            .update({
              status: newStatus,
              meta_template_id: metaTemplateId,
              rejection_reason: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', templateId)
            .select()
            .single()

          if (updateErr) throw updateErr

          return new Response(JSON.stringify({ 
            success: true, 
            status: newStatus, 
            metaTemplateId,
            message: `Template successfully submitted. Status is ${newStatus}.`
          }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })

        } catch (err) {
          console.error('Submission request failed:', err)
          return new Response(JSON.stringify({ error: 'Failed to contact Meta Cloud API', details: err.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
      } else {
        // SANDBOX FALLBACK SIMULATION
        // Simulate submission
        const mockMetaId = `mock_meta_${Math.random().toString(36).substr(2, 9)}`
        
        const { data: updated, error: updateErr } = await serviceClient
          .from('whatsapp_templates')
          .update({
            status: 'pending',
            meta_template_id: mockMetaId,
            rejection_reason: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId)
          .select()
          .single()

        if (updateErr) throw updateErr

        return new Response(JSON.stringify({
          success: true,
          status: 'pending',
          metaTemplateId: mockMetaId,
          message: 'Template submitted to Meta Sandbox simulation. Status set to Pending.'
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
    }

    // ==========================================
    // ROUTE: POST /sync
    // ==========================================
    if (subRoute === 'sync' && req.method === 'POST') {
      // Fetch company meta credentials
      const { data: company, error: compErr } = await serviceClient
        .from('companies')
        .select('whatsapp_provider, meta_waba_id, meta_access_token')
        .eq('id', companyId)
        .single()

      if (compErr) throw compErr

      const useRealMeta = company.whatsapp_provider === 'meta' && company.meta_waba_id && company.meta_access_token

      if (useRealMeta) {
        try {
          const wabaId = company.meta_waba_id
          const accessToken = company.meta_access_token

          console.log(`Syncing templates from Meta: WABA ${wabaId}`)

          const response = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=100`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          })

          const data = await response.json()

          if (!response.ok) {
            console.error('Meta API error during sync:', data)
            return new Response(JSON.stringify({ 
              error: 'Meta Sync API error', 
              details: data.error?.message || data 
            }), { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            })
          }

          const metaTemplates = data.data || []
          let updatedCount = 0

          // Query our local pending/draft/rejected templates
          const { data: localTemplates } = await serviceClient
            .from('whatsapp_templates')
            .select('id, template_name, status')
            .eq('company_id', companyId)

          for (const local of (localTemplates || [])) {
            const matchedMeta = metaTemplates.find((t: any) => t.name === local.template_name)
            if (matchedMeta) {
              const metaStatusMap: Record<string, string> = {
                APPROVED: 'approved',
                PENDING: 'pending',
                REJECTED: 'rejected',
                PAUSED: 'paused'
              }
              const mappedStatus = metaStatusMap[matchedMeta.status] || 'pending'
              const rejectionReason = matchedMeta.status === 'REJECTED' ? (matchedMeta.rejection_reason || 'Rejected by Meta content guidelines.') : null

              if (local.status !== mappedStatus) {
                await serviceClient
                  .from('whatsapp_templates')
                  .update({
                    status: mappedStatus,
                    meta_template_id: matchedMeta.id,
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', local.id)
                
                updatedCount++
              }
            }
          }

          return new Response(JSON.stringify({ 
            success: true, 
            message: `Sync complete. Synced ${metaTemplates.length} templates. Updated local statuses for ${updatedCount} templates.`,
            syncedCount: metaTemplates.length,
            updatedCount
          }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })

        } catch (err) {
          console.error('Sync request failed:', err)
          return new Response(JSON.stringify({ error: 'Failed to sync from Meta API', details: err.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
      } else {
        // SANDBOX FALLBACK SIMULATION
        // Simulate sync: Approved any pending templates, and randomly simulate 1 rejection if there are multiple pending
        const { data: pendingLocal } = await serviceClient
          .from('whatsapp_templates')
          .select('id, template_name')
          .eq('company_id', companyId)
          .eq('status', 'pending')

        let approvedCount = 0
        let rejectedCount = 0

        for (let i = 0; i < (pendingLocal || []).length; i++) {
          const item = pendingLocal[i]
          // If template name contains 'reject', reject it. Otherwise approve.
          const isRejected = item.template_name.includes('reject') || (i === 1 && pendingLocal.length > 2)
          
          if (isRejected) {
            await serviceClient
              .from('whatsapp_templates')
              .update({
                status: 'rejected',
                rejection_reason: 'Body text violates Meta policies regarding promotional quality and spam triggers.',
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
            rejectedCount++
          } else {
            await serviceClient
              .from('whatsapp_templates')
              .update({
                status: 'approved',
                rejection_reason: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
            approvedCount++
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: `Sandbox Sync complete. Approved ${approvedCount} templates, rejected ${rejectedCount} templates.`,
          approvedCount,
          rejectedCount
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }
    }

    // ==========================================
    // REST ROUTE: GET /templates (List all)
    // ==========================================
    if (relativeParts.length === 0 && req.method === 'GET') {
      const { data: templates, error: fetchErr } = await serviceClient
        .from('whatsapp_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      return new Response(JSON.stringify(templates), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================
    // REST ROUTE: POST /templates (Create Draft)
    // ==========================================
    if (relativeParts.length === 0 && req.method === 'POST') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const body: TemplateInput = await req.json()

      // Validation
      if (!body.templateName || !body.content || !body.category) {
        return new Response(JSON.stringify({ error: 'Template name, content, and category are required' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      if (!isValidTemplateName(body.templateName)) {
        return new Response(JSON.stringify({ error: 'Invalid name. Name must contain only lowercase letters, numbers, and underscores (e.g. site_visit_rem).' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Check duplicates
      const { data: existing } = await serviceClient
        .from('whatsapp_templates')
        .select('id')
        .eq('company_id', companyId)
        .eq('template_name', body.templateName)
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: 'A template with this name already exists in this company.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Validate Button Limits
      if (body.buttons && Array.isArray(body.buttons)) {
        const quickReplies = body.buttons.filter(b => b.type === 'QUICK_REPLY')
        const ctaButtons = body.buttons.filter(b => b.type === 'URL' || b.type === 'PHONE_NUMBER')
        if (quickReplies.length > 3) {
          return new Response(JSON.stringify({ error: 'Meta templates support a maximum of 3 Quick Reply buttons.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
        if (ctaButtons.length > 2) {
          return new Response(JSON.stringify({ error: 'Meta templates support a maximum of 2 Call-to-Action (URL/Phone) buttons.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
      }

      const variables = extractVariables(body.headerText, body.content)

      const { data: newTemplate, error: insertError } = await serviceClient
        .from('whatsapp_templates')
        .insert({
          company_id: companyId,
          template_name: body.templateName,
          category: body.category,
          language: body.language || 'en_US',
          status: 'draft',
          content: body.content,
          variables,
          header_type: body.headerType || 'NONE',
          header_text: body.headerText || null,
          header_media_url: body.headerMediaUrl || null,
          footer_text: body.footerText || null,
          buttons: body.buttons || [],
          created_by: user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      return new Response(JSON.stringify(newTemplate), { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================
    // REST ROUTE: GET /templates/:id (Fetch Detail)
    // ==========================================
    if (relativeParts.length === 1 && req.method === 'GET') {
      const templateId = relativeParts[0]
      const { data: template, error: fetchErr } = await serviceClient
        .from('whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .eq('company_id', companyId)
        .single()

      if (fetchErr || !template) {
        return new Response(JSON.stringify({ error: 'Template not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      return new Response(JSON.stringify(template), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================
    // REST ROUTE: PUT /templates/:id (Update)
    // ==========================================
    if (relativeParts.length === 1 && req.method === 'PUT') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const templateId = relativeParts[0]
      const body: TemplateInput = await req.json()

      // Fetch existing
      const { data: existing, error: fetchErr } = await serviceClient
        .from('whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .eq('company_id', companyId)
        .single()

      if (fetchErr || !existing) {
        return new Response(JSON.stringify({ error: 'Template not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      if (existing.status === 'pending') {
        return new Response(JSON.stringify({ error: 'Locked: Cannot update a template currently pending review from Meta.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      // Check name uniqueness if changed
      if (body.templateName && body.templateName !== existing.template_name) {
        if (!isValidTemplateName(body.templateName)) {
          return new Response(JSON.stringify({ error: 'Invalid name format' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
        const { data: nameConflict } = await serviceClient
          .from('whatsapp_templates')
          .select('id')
          .eq('company_id', companyId)
          .eq('template_name', body.templateName)
          .maybeSingle()

        if (nameConflict) {
          return new Response(JSON.stringify({ error: 'Template name already in use' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
      }

      // Validate Button Limits
      if (body.buttons && Array.isArray(body.buttons)) {
        const quickReplies = body.buttons.filter(b => b.type === 'QUICK_REPLY')
        const ctaButtons = body.buttons.filter(b => b.type === 'URL' || b.type === 'PHONE_NUMBER')
        if (quickReplies.length > 3) {
          return new Response(JSON.stringify({ error: 'Meta templates support a maximum of 3 Quick Reply buttons.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
        if (ctaButtons.length > 2) {
          return new Response(JSON.stringify({ error: 'Meta templates support a maximum of 2 Call-to-Action buttons.' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
      }

      const variables = extractVariables(body.headerText, body.content)
      
      // If template was rejected, updating it sets status back to draft for resubmission
      const finalStatus = existing.status === 'rejected' ? 'draft' : existing.status

      const { data: updated, error: updateErr } = await serviceClient
        .from('whatsapp_templates')
        .update({
          template_name: body.templateName || existing.template_name,
          category: body.category || existing.category,
          language: body.language || existing.language,
          status: finalStatus,
          content: body.content || existing.content,
          variables,
          header_type: body.headerType || existing.header_type,
          header_text: body.headerText !== undefined ? body.headerText : existing.header_text,
          header_media_url: body.headerMediaUrl !== undefined ? body.headerMediaUrl : existing.header_media_url,
          footer_text: body.footerText !== undefined ? body.footerText : existing.footer_text,
          buttons: body.buttons !== undefined ? body.buttons : existing.buttons,
          rejection_reason: finalStatus === 'draft' ? null : existing.rejection_reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (updateErr) throw updateErr

      return new Response(JSON.stringify(updated), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================
    // REST ROUTE: DELETE /templates/:id (Delete)
    // ==========================================
    if (relativeParts.length === 1 && req.method === 'DELETE') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const templateId = relativeParts[0]

      // Check existence
      const { data: existing, error: fetchErr } = await serviceClient
        .from('whatsapp_templates')
        .select('status, company_id')
        .eq('id', templateId)
        .eq('company_id', companyId)
        .single()

      if (fetchErr || !existing) {
        return new Response(JSON.stringify({ error: 'Template not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      if (existing.status === 'pending') {
        return new Response(JSON.stringify({ error: 'Cannot delete a template while it is pending review.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
      }

      const { error: deleteErr } = await serviceClient
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId)

      if (deleteErr) throw deleteErr

      return new Response(JSON.stringify({ success: true, message: 'Template deleted successfully' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Request processing error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
