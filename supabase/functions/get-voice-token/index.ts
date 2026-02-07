import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing authorization header', { status: 401, headers: corsHeaders })
    }

    // Extract user ID from JWT payload directly
    let userId: string
    try {
      const token = authHeader.replace('Bearer ', '')
      const payload = JSON.parse(atob(token.split('.')[1])) // Decode JWT payload
      userId = payload.sub // Subject contains user ID

      if (!userId) {
        console.error('No user ID found in JWT')
        return new Response('Invalid token', { status: 401, headers: corsHeaders })
      }

      console.log('Extracted user ID from JWT:', userId)
    } catch (error) {
      console.error('Failed to decode JWT:', error)
      return new Response('Invalid token format', { status: 401, headers: corsHeaders })
    }

    // Get the user's profile and agent_identity
    console.log('Looking up profile for user:', userId)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agent_identity, company_id')
      .eq('user_id', userId)
      .single()

    if (profileError) {
      console.error('Profile lookup error:', profileError)
      return new Response(`Profile lookup error: ${profileError.message}`, { status: 500, headers: corsHeaders })
    }

    if (!profile) {
      console.error('Profile not found for user:', userId)
      return new Response('Profile not found', { status: 404, headers: corsHeaders })
    }

    if (!profile.agent_identity) {
      console.log('Agent identity not configured for user:', userId)
      return new Response('Agent identity not configured. Please set your agent identity in your profile.', {
        status: 400,
        headers: corsHeaders
      })
    }

    console.log('User profile found:', {
      user_id: userId,
      agent_identity: profile.agent_identity,
      company_id: profile.company_id
    })

    // Get WhatsApp settings for Twilio credentials
    console.log('Looking up WhatsApp settings for company:', profile.company_id)
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('twilio_sid, twilio_auth_token, twilio_api_key_sid, twilio_api_key_secret, twilio_twiml_app_sid')
      .eq('company_id', profile.company_id)
      .single()

    if (settingsError) {
      console.error('WhatsApp settings lookup error:', settingsError)
      return new Response(`WhatsApp settings lookup error: ${settingsError.message}`, {
        status: 500,
        headers: corsHeaders
      })
    }

    if (!whatsappSettings) {
      console.log('WhatsApp settings not found for company:', profile.company_id)
      return new Response('WhatsApp/Twilio settings not configured for your company', {
        status: 404,
        headers: corsHeaders
      })
    }

    console.log('WhatsApp settings found')

    // Check if all required Twilio credentials are present
    const requiredFields = [
      'twilio_sid',
      'twilio_auth_token',
      'twilio_api_key_sid',
      'twilio_api_key_secret',
      'twilio_twiml_app_sid'
    ]

    const missingFields = requiredFields.filter(field => !whatsappSettings[field as keyof typeof whatsappSettings])

    if (missingFields.length > 0) {
      console.error('Missing Twilio credentials:', missingFields)
      return new Response(`Missing Twilio credentials: ${missingFields.join(', ')}`, {
        status: 400,
        headers: corsHeaders
      })
    }

    console.log('Twilio credentials found for company:', profile.company_id)

    // Generate Twilio Access Token
    console.log('Generating Twilio access token for agent:', profile.agent_identity)
    const accessToken = await generateTwilioAccessToken(
      whatsappSettings.twilio_api_key_sid,
      whatsappSettings.twilio_api_key_secret,
      whatsappSettings.twilio_sid,
      whatsappSettings.twilio_twiml_app_sid,
      profile.agent_identity
    )

    if (!accessToken) {
      console.error('Failed to generate access token - token generation returned null')
      return new Response('Failed to generate access token - check Twilio credentials', { status: 500, headers: corsHeaders })
    }

    console.log('Access token generated successfully for agent:', profile.agent_identity)

    return new Response(JSON.stringify({
      token: accessToken,
      identity: profile.agent_identity
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error in get-voice-token:', error)
    console.error('Error stack:', error.stack)
    return new Response(`Internal server error: ${error.message}`, {
      status: 500,
      headers: corsHeaders
    })
  }
})

// Generate Twilio Access Token using manual JWT generation
async function generateTwilioAccessToken(
  apiKeySid: string,
  apiKeySecret: string,
  accountSid: string,
  twimlAppSid: string,
  identity: string
): Promise<string | null> {
  try {
    console.log('Generating JWT token with params:', {
      apiKeySid: apiKeySid ? 'present' : 'missing',
      apiKeySecret: apiKeySecret ? 'present' : 'missing',
      accountSid: accountSid ? 'present' : 'missing',
      twimlAppSid: twimlAppSid ? 'present' : 'missing',
      identity: identity
    })

    // Import JWT library
    const { create } = await import('https://deno.land/x/djwt@v2.8/mod.ts')

    const now = Math.floor(Date.now() / 1000)
    const exp = now + 3600 // 1 hour

    const header = {
      alg: 'HS256',
      typ: 'JWT',
      cty: 'twilio-fpa;v=1' // Twilio's custom content type
    }

    const payload = {
      jti: `${apiKeySid}-${now}`, // JWT ID
      iss: apiKeySid, // Issuer (API Key SID)
      sub: accountSid, // Subject (Account SID)
      iat: now, // Issued at
      exp: exp, // Expiration
      grants: {
        identity: identity,
        voice: {
          outgoing: {
            application_sid: twimlAppSid
          },
          incoming: {
            allow: true
          }
        }
      }
    }

    console.log('Creating JWT with payload:', JSON.stringify(payload, null, 2))

    // Create the JWT using the API Key Secret as the signing key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiKeySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const token = await create(header, payload, key)
    console.log('JWT token generated successfully, length:', token.length)
    return token

  } catch (error) {
    console.error('Exception during JWT token generation:', error)
    console.error('Error stack:', error.stack)
    return null
  }
}