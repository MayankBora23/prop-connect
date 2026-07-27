// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'
import { sendWhatsAppMessage, type WhatsappProvider } from './sendWhatsAppMessage.ts'
import { processHumanTakeover } from './humanTakeover.ts'
import { sendMatchedCatalogSuggestions } from './catalogSuggestions.ts'

export type { WhatsappProvider } from './sendWhatsAppMessage.ts'

interface TwilioWebhookPayload {
  To: string
  From: string
  Body: string
  MessageSid: string
  AccountSid?: string
  NumMedia?: string
  MediaUrl0?: string
  MediaContentType0?: string
  ProfileName?: string
}

interface TwilioWhatsAppSettings {
  company_id: string
  twilio_auth_token: string
  whatsapp_number: string
}

interface MetaWhatsAppSettings {
  company_id: string
  meta_phone_number_id: string | null
  meta_access_token: string | null
}

type WhatsAppSettings = TwilioWhatsAppSettings | MetaWhatsAppSettings

interface ConversationData {
  is_new_user: boolean
  ai_enabled: boolean
  current_step: number
  purpose?: string
  property_type?: string
  budget?: string
  location?: string
  interest?: string
  course?: string
  study_mode?: string
  vehicle_type?: string
  brand?: string
}

interface AiFlowParams {
  payload: TwilioWebhookPayload
  conversationId: string
  whatsappSettings: WhatsAppSettings
  conversationData: ConversationData
  supabase: any
  provider: WhatsappProvider
  accountSid?: string
  industry: string
}

interface StepConfig {
  step: number
  message: string
  buttons: string[]
  buttonPayloads: string[]
  nextStep: number
}

// Industry-specific step configurations
function getStepConfigs(industry: string): StepConfig[] {
  switch (industry) {
    case 'automobile_dealers':
      return [
        {
          step: 1,
          message: "Welcome to our Automobile services! Are you looking to Buy or Service a vehicle?",
          buttons: ["Buy", "Service"],
          buttonPayloads: ["buy", "service"],
          nextStep: 2
        },
        {
          step: 2,
          message: "What type of vehicle are you interested in?",
          buttons: ["Car", "Bike", "Used Car", "Used Bike"],
          buttonPayloads: ["car", "bike", "used_car", "used_bike"],
          nextStep: 3
        },
        {
          step: 3,
          message: "What's your preferred brand?",
          buttons: [],
          buttonPayloads: [],
          nextStep: 4
        },
        {
          step: 4,
          message: "What's your budget range?",
          buttons: [],
          buttonPayloads: [],
          nextStep: 5
        },
        {
          step: 5,
          message: "Thank you for your interest! Our team will contact you shortly with the best vehicle options matching your preferences.",
          buttons: [],
          buttonPayloads: [],
          nextStep: 0
        }
      ]

    case 'education':
      return [
        {
          step: 1,
          message: "Welcome to our Education services! Are you interested in enrolling in a course?",
          buttons: ["Yes", "Get Info"],
          buttonPayloads: ["yes", "info"],
          nextStep: 2
        },
        {
          step: 2,
          message: "Which field are you interested in?",
          buttons: ["Coding", "Web Development", "AI & ML", "Data Science"],
          buttonPayloads: ["coding", "web_development", "ai_ml", "data_science"],
          nextStep: 3
        },
        {
          step: 3,
          message: "What Course Type do you prefer?",
          buttons: ["Online", "Offline", "Hybrid"],
          buttonPayloads: ["online", "offline", "hybrid"],
          nextStep: 4
        },
        {
          step: 4,
          message: "Which subjects are you interested in? (e.g. Python, React, Machine Learning, UI/UX)",
          buttons: [],
          buttonPayloads: [],
          nextStep: 5
        },
        {
          step: 5,
          message: "Thank you for your interest! Our counselors will contact you shortly with detailed course information.",
          buttons: [],
          buttonPayloads: [],
          nextStep: 0
        }
      ]

    case 'internal_crm':
      return [
        {
          step: 1,
          message: "Welcome to AiLeadX! Are you looking to manage Real Estate, Education, or Automobile leads?",
          buttons: ["Real Estate", "Education", "Automobile"],
          buttonPayloads: ["real_estate", "education", "automobile"],
          nextStep: 2
        },
        {
          step: 2,
          message: "Great! How many leads does your team manage per month?",
          buttons: ["< 100", "100-500", "500+"],
          buttonPayloads: ["small", "medium", "large"],
          nextStep: 3
        },
        {
          step: 3,
          message: "Would you like to schedule a demo of AiLeadX CRM?",
          buttons: ["Yes, Schedule Demo", "Send More Info", "Not Now"],
          buttonPayloads: ["schedule_demo", "send_info", "not_now"],
          nextStep: 4
        },
        {
          step: 4,
          message: "Thank you! Our AiLeadX team will reach out to you soon. We look forward to helping you streamline your lead management! 🚀",
          buttons: [],
          buttonPayloads: [],
          nextStep: 0
        },
        {
          step: 5,
          message: "Thank you for your interest! Our team will contact you shortly to schedule your personalized demo. In the meantime, visit our website for more information.",
          buttons: [],
          buttonPayloads: [],
          nextStep: 0
        }
      ]

    case 'real_estate':
    default:
      return [
        {
          step: 1,
          message: "Welcome to our Real Estate services! Are you looking to Buy or Rent a property?",
          buttons: ["Buy", "Rent"],
          buttonPayloads: ["buy", "rent"],
          nextStep: 2
        },
        {
          step: 2,
          message: "Great! What type of property are you interested in?",
          buttons: ["Apartment", "Villa", "Plot", "Commercial"],
          buttonPayloads: ["apartment", "villa", "plot", "commercial"],
          nextStep: 3
        },
        {
          step: 3,
          message: "What's your budget?",
          buttons: [],
          buttonPayloads: [],
          nextStep: 4
        },
        {
          step: 4,
          message: "What is your preferred location?",
          buttons: [],
          buttonPayloads: [],
          nextStep: 5
        },
        {
          step: 5,
          message: "Thank you for providing your requirements! Our team will contact you shortly with the best property options matching your criteria.",
          buttons: [],
          buttonPayloads: [],
          nextStep: 0
        }
      ]
  }
}

function resolveUserInput(userInput: string, stepConfig: StepConfig): string {
  const cleanInput = userInput.trim()
  const num = parseInt(cleanInput, 10)
  if (!isNaN(num) && num >= 1 && num <= (stepConfig?.buttons?.length || 0)) {
    return stepConfig.buttons[num - 1].toLowerCase().trim()
  }
  return cleanInput.toLowerCase()
}

export async function handleAiFlow({
  payload,
  conversationId,
  whatsappSettings,
  conversationData,
  supabase,
  provider,
  accountSid,
  industry
}: AiFlowParams) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  try {
    console.log('🤖 AI Flow started!')
    console.log(`📱 Phone: ${payload.From}, Message: "${payload.Body}"`)
    console.log(`🆔 Conversation: ${conversationId}, Company: ${whatsappSettings.company_id}`)
    console.log(`🏢 Industry: ${industry}`)
    console.log(`📊 AI Status: new_user=${conversationData.is_new_user}, enabled=${conversationData.ai_enabled}, step=${conversationData.current_step}`)

    // Try to load custom config first
    const { data: customConfig } = await supabase
      .from('ai_flow_configs')
      .select('steps')
      .eq('company_id', whatsappSettings.company_id)
      .eq('industry', industry)
      .maybeSingle()

    // Merge custom message/buttons with hardcoded payloads/nextStep
    const defaultConfigs = getStepConfigs(industry)

    const STEP_CONFIGS: StepConfig[] = customConfig?.steps
      ? defaultConfigs.map(defaultStep => {
          const custom = (customConfig.steps as { step: number; message: string; buttons: string[] }[])
            .find(s => s.step === defaultStep.step)
          if (!custom) return defaultStep
          return {
            ...defaultStep,
            message: custom.message || defaultStep.message,
            buttons: custom.buttons?.length ? custom.buttons : defaultStep.buttons,
            // buttonPayloads and nextStep always come from defaultStep — never from custom
          }
        })
      : defaultConfigs

    // Incoming message is stored by whatsapp-webhook / whatsapp-meta-webhook before handleAiFlow runs.

    const userInput = payload.Body.trim().toLowerCase()

    // Safety check: exact "agent" / "help" (webhook keyword list uses phrases like "help me")
    if (userInput === 'agent' || userInput === 'help') {
      await processHumanTakeover({
        supabase,
        conversationId,
        companyId: whatsappSettings.company_id,
        assignedTo: (conversationData as { assigned_to?: string | null }).assigned_to ?? null,
        chatStatus: (conversationData as { chat_status?: string | null }).chat_status ?? null,
        recipientAddress: payload.From,
        whatsappSettings,
        provider,
        accountSid,
      })
      return new Response('', { status: 200, headers: corsHeaders })
    }

    const currentStep = conversationData.current_step
    const stepConfig = STEP_CONFIGS.find(config => config.step === currentStep)

    if (!stepConfig) {
      console.error('Invalid step:', currentStep)
      return new Response('Invalid step', { status: 400, headers: corsHeaders })
    }

    const resolvedInput = resolveUserInput(userInput, stepConfig)

    let nextStep = stepConfig.nextStep
    let updateData: any = {}
    let inputValid = false

    // Process user input based on industry and current step
    console.log(`🎯 Processing input for ${industry} industry, step ${currentStep}, input: "${userInput}" (resolved: "${resolvedInput}")`)

    if (industry === 'automobile_dealers') {
      console.log('🚗 Routing to automobile flow')
      inputValid = await processAutomobileFlow(resolvedInput, currentStep, updateData, conversationId, stepConfig, whatsappSettings, payload, supabase, accountSid, industry)
    } else if (industry === 'education') {
      console.log('📚 Routing to education flow')
      inputValid = await processEducationFlow(resolvedInput, currentStep, updateData, conversationId, stepConfig, whatsappSettings, payload, supabase, accountSid, industry)
    } else if (industry === 'internal_crm') {
      console.log('🏢 Routing to internal CRM flow')
      inputValid = await processInternalCrmFlow(userInput, currentStep, updateData, payload, stepConfig)
    } else {
      console.log('🏠 Routing to real estate flow (default)')
      inputValid = await processRealEstateFlow(resolvedInput, currentStep, updateData, conversationId, stepConfig, whatsappSettings, payload, supabase, accountSid, industry)
    }

    if (inputValid) {
      // Input was valid, advance to next step
      updateData.current_step = nextStep

      // Mark AI flow as completed when reaching step 0
      if (nextStep === 0) {
        updateData.ai_enabled = false
        updateData.is_new_user = false
      }

      // Update conversation with captured data
      console.log(`💾 Updating conversation ${conversationId} with data:`, updateData)
      const updateResult = await supabase
        .from('whatsapp_conversations')
        .update({
          ...updateData,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (updateResult.error) {
        console.error('❌ Failed to update conversation:', updateResult.error)
        throw updateResult.error
      }

      console.log(`✅ Conversation updated successfully for step transition`)

      if (nextStep > 0) {
        // Send next step message
        const nextStepConfig = STEP_CONFIGS.find(config => config.step === nextStep)!
        await sendStepMessage(whatsappSettings, provider, payload.From, nextStepConfig, supabase, conversationId, whatsappSettings.company_id, accountSid)

        // If this is the final step (nextStep of the config we just sent is 0), send suggestions + summary
        if (nextStepConfig.nextStep === 0) {
          // Disable AI and mark flow complete now — don't wait for another user reply
          await supabase
            .from('whatsapp_conversations')
            .update({ ai_enabled: false, is_new_user: false })
            .eq('id', conversationId)

          console.log('🎯 Final step sent, sending matched catalog suggestions')
          await sendMatchedCatalogSuggestions(
            supabase,
            conversationId,
            whatsappSettings.company_id,
            industry
          )

          console.log('🎯 Creating conversation summary for conversation:', conversationId)
          await createConversationSummary(supabase, conversationId, whatsappSettings.company_id)
          console.log('✅ Summary creation completed')
        }
      }
    } else {
      // Input was invalid, send current step message again
      console.log(`❌ Invalid input for step ${currentStep}, sending current step message again`)
      await sendStepMessage(whatsappSettings, provider, payload.From, stepConfig, supabase, conversationId, whatsappSettings.company_id, accountSid)
    }

    return new Response('', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('AI Flow error:', error)
    console.error('Error stack:', error.stack)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

// Industry-specific processing functions

// ── internal_crm flow ──────────────────────────────────────────────────────
async function processInternalCrmFlow(
  userInput: string,
  currentStep: number,
  updateData: Record<string, string>,
  payload: { Body: string },
  stepConfig: StepConfig
): Promise<boolean> {
  if (currentStep === 1) {
    // Dynamic number → payload lookup (safe against button reordering)
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      updateData.purpose = stepConfig.buttonPayloads[numInput - 1]
      return true
    }
    // Text-based fallback
    const textMap: Record<string, string> = {
      'real estate': 'real_estate',
      'realestate': 'real_estate',
      'education': 'education',
      'automobile': 'automobile',
      'auto': 'automobile',
    }
    const mapped = textMap[userInput] ?? textMap[userInput.replace(/\s+/g, '')] ?? null
    if (mapped) {
      updateData.purpose = mapped
      return true
    }
    // fuzzy
    if (userInput.includes('real') || userInput.includes('estate') || userInput.includes('property')) {
      updateData.purpose = 'real_estate'
      return true
    }
    if (userInput.includes('edu') || userInput.includes('school') || userInput.includes('college')) {
      updateData.purpose = 'education'
      return true
    }
    if (userInput.includes('auto') || userInput.includes('car') || userInput.includes('vehicle')) {
      updateData.purpose = 'automobile'
      return true
    }
    return false
  } else if (currentStep === 2) {
    // Dynamic number → payload lookup
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      updateData.interest = stepConfig.buttonPayloads[numInput - 1]
      return true
    }
    // Text-based fallback
    const textMap: Record<string, string> = {
      'small': 'small',
      '< 100': 'small',
      '<100': 'small',
      'medium': 'medium',
      '100-500': 'medium',
      'large': 'large',
      '500+': 'large',
    }
    const mapped = textMap[userInput] ?? textMap[userInput.replace(/\s+/g, '')] ?? null
    if (mapped) {
      updateData.interest = mapped
      return true
    }
    if (userInput.length > 0) {
      updateData.interest = payload.Body.trim()
      return true
    }
    return false
  } else if (currentStep === 3) {
    // Dynamic number → payload lookup
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      updateData.budget = stepConfig.buttonPayloads[numInput - 1]   // reuse budget field for demo intent
      return true
    }
    // Text-based fallback
    const textMap: Record<string, string> = {
      'yes': 'schedule_demo',
      'yes, schedule demo': 'schedule_demo',
      'schedule demo': 'schedule_demo',
      'schedule': 'schedule_demo',
      'send more info': 'send_info',
      'more info': 'send_info',
      'info': 'send_info',
      'not now': 'not_now',
      'no': 'not_now',
      'later': 'not_now',
    }
    const mapped = textMap[userInput] ?? null
    if (mapped) {
      updateData.budget = mapped
      return true
    }
    if (userInput.length > 0) {
      updateData.budget = payload.Body.trim()
      return true
    }
    return false
  } else if (currentStep === 4 || currentStep === 5) {
    // Acknowledgement step — any reply advances
    return true
  }
  return false
}
// ─────────────────────────────────────────────────────────────────────────────

async function processRealEstateFlow(
  userInput: string,
  currentStep: number,
  updateData: any,
  conversationId: string,
  stepConfig: StepConfig,
  whatsappSettings: any,
  payload: any,
  supabase: any,
  accountSid: string | undefined,
  industry: string
): Promise<boolean> {
  if (currentStep === 1) {
    let purposeValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      purposeValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      if (userInput.includes('buy') || userInput.includes('purchase')) {
        purposeValue = 'buy'
      } else if (userInput.includes('rent') || userInput.includes('lease')) {
        purposeValue = 'rent'
      } else {
        purposeValue = await extractFromText(userInput, currentStep, 'real_estate')
      }
    }

    if (purposeValue && purposeValue !== 'unclear') {
      updateData.purpose = purposeValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 2) {
    let propertyTypeValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      propertyTypeValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      const textMap: { [key: string]: string } = {
        'apartment': 'apartment',
        'villa': 'villa',
        'plot': 'plot',
        'commercial': 'commercial'
      }

      if (textMap[userInput]) {
        propertyTypeValue = textMap[userInput]
      } else {
        propertyTypeValue = await extractFromText(userInput, currentStep, 'real_estate')
      }
    }

    if (propertyTypeValue && propertyTypeValue !== 'unclear') {
      updateData.property_type = propertyTypeValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 3) {
    if (userInput.length > 0) {
      updateData.budget = payload.Body.trim()
      return true
    } else {
      return false
    }
  } else if (currentStep === 4) {
    if (userInput.length > 0) {
      updateData.location = payload.Body.trim()
      return true
    } else {
      return false
    }
  } else if (currentStep === 5) {
    return true
  }

  return false
}

async function processAutomobileFlow(
  userInput: string,
  currentStep: number,
  updateData: any,
  conversationId: string,
  stepConfig: StepConfig,
  whatsappSettings: any,
  payload: any,
  supabase: any,
  accountSid: string | undefined,
  industry: string
): Promise<boolean> {
  if (currentStep === 1) {
    let purposeValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      purposeValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      if (userInput.includes('buy') || userInput.includes('purchase')) {
        purposeValue = 'buy'
      } else if (userInput.includes('service') || userInput.includes('repair')) {
        purposeValue = 'service'
      } else {
        purposeValue = await extractFromText(userInput, currentStep, 'automobile_dealers')
      }
    }

    if (purposeValue && purposeValue !== 'unclear') {
      updateData.purpose = purposeValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 2) {
    let vehicleTypeValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      vehicleTypeValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      const textMap: { [key: string]: string } = {
        'car': 'car',
        'bike': 'bike',
        'motorcycle': 'bike',
        'scooter': 'bike',
        'used car': 'used_car',
        'second hand car': 'used_car',
        'pre-owned car': 'used_car',
        'used bike': 'used_bike',
        'second hand bike': 'used_bike',
      }

      if (textMap[userInput]) {
        vehicleTypeValue = textMap[userInput]
      } else {
        vehicleTypeValue = await extractFromText(userInput, currentStep, 'automobile_dealers')
      }
    }

    if (vehicleTypeValue && vehicleTypeValue !== 'unclear') {
      updateData.vehicle_type = vehicleTypeValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 3) {
    if (userInput.length > 0) {
      updateData.brand = payload.Body.trim()
      return true
    } else {
      return false
    }
  } else if (currentStep === 4) {
    if (userInput.length > 0) {
      updateData.budget = payload.Body.trim()
      return true
    } else {
      return false
    }
  } else if (currentStep === 5) {
    return true
  }

  return false
}

async function processEducationFlow(
  userInput: string,
  currentStep: number,
  updateData: any,
  conversationId: string,
  stepConfig: StepConfig,
  whatsappSettings: any,
  payload: any,
  supabase: any,
  accountSid: string | undefined,
  industry: string
): Promise<boolean> {
  if (currentStep === 1) {
    let interestValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      interestValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      const lowerInput = userInput.trim()
      if (lowerInput === 'yes' || lowerInput.includes('yes') || lowerInput.includes('interested') || lowerInput.includes('enroll')) {
        interestValue = 'yes'
      } else if (lowerInput.includes('info') || lowerInput.includes('information') || lowerInput.includes('details')) {
        interestValue = 'info'
      } else {
        interestValue = await extractFromText(userInput, currentStep, 'education')
      }
    }

    if (interestValue && interestValue !== 'unclear') {
      updateData.interest = interestValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 2) {
    let courseValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      courseValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      // Text-based fallback (label synonyms → payload)
      const courseTextMap: { [key: string]: string } = {
        'coding': 'coding',
        'programming': 'coding',
        'web development': 'web_development',
        'web dev': 'web_development',
        'web_development': 'web_development',
        'ai & ml': 'ai_ml',
        'ai ml': 'ai_ml',
        'ai': 'ai_ml',
        'ml': 'ai_ml',
        'artificial intelligence': 'ai_ml',
        'machine learning': 'ai_ml',
        'data science': 'data_science',
        'data_science': 'data_science',
        'analytics': 'data_science',
      }

      const lowerInput = userInput.trim().toLowerCase()
      courseValue = courseTextMap[lowerInput] ?? null

      if (!courseValue) {
        if (lowerInput.includes('web')) courseValue = 'web_development'
        else if (lowerInput.includes('code') || lowerInput.includes('coding') || lowerInput.includes('program')) courseValue = 'coding'
        else if (lowerInput.includes('ai') || lowerInput.includes('machine') || lowerInput.includes('deep learning')) courseValue = 'ai_ml'
        else if (lowerInput.includes('data')) courseValue = 'data_science'
        else courseValue = await extractFromText(userInput, currentStep, 'education')
      }
    }

    if (courseValue && courseValue !== 'unclear') {
      updateData.course = courseValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 3) {
    let courseTypeValue: string | null = null

    // Dynamic: number reply maps to buttonPayloads[N-1]
    const numInput = parseInt(userInput, 10)
    if (!isNaN(numInput) && numInput >= 1 && numInput <= stepConfig.buttonPayloads.length) {
      courseTypeValue = stepConfig.buttonPayloads[numInput - 1]
    } else {
      // Text-based fallback (label synonyms → payload)
      const courseTypeMap: { [key: string]: string } = {
        'online': 'online',
        'virtual': 'online',
        'remote': 'online',
        'offline': 'offline',
        'in person': 'offline',
        'in-person': 'offline',
        'classroom': 'offline',
        'campus': 'offline',
        'hybrid': 'hybrid',
        'blended': 'hybrid',
      }

      const lowerInput = userInput.trim().toLowerCase()
      courseTypeValue = courseTypeMap[lowerInput] ?? null

      if (!courseTypeValue) {
        if (lowerInput.includes('online') || lowerInput.includes('virtual') || lowerInput.includes('remote')) courseTypeValue = 'online'
        else if (lowerInput.includes('offline') || lowerInput.includes('classroom') || lowerInput.includes('campus')) courseTypeValue = 'offline'
        else if (lowerInput.includes('hybrid') || lowerInput.includes('blend')) courseTypeValue = 'hybrid'
        else courseTypeValue = await extractFromText(userInput, currentStep, 'education')
      }
    }

    if (courseTypeValue && courseTypeValue !== 'unclear') {
      updateData.study_mode = courseTypeValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 4) {
    // Collect subjects of interest — stored as subjects_interest for matching against courses.subjects_covered
    if (userInput.length > 0) {
      updateData.subjects_interest = payload.Body.trim()
      return true
    } else {
      return false
    }
  } else if (currentStep === 5) {
    return true
  }

  return false
}

// Helper functions
async function sendStepMessage(
  whatsappSettings: WhatsAppSettings,
  provider: WhatsappProvider,
  to: string,
  stepConfig: StepConfig,
  supabase: any,
  conversationId: string,
  companyId: string,
  accountSid?: string
) {
  try {
    const messageText = buildMessageText(stepConfig.message, stepConfig.buttons)
    console.log(`🚀 Sending AI message to ${to}: ${messageText.substring(0, 100)}...`)

    await sendWhatsAppMessage(whatsappSettings, provider, to, messageText, accountSid)

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      company_id: companyId,
      body: messageText,
      direction: 'outgoing',
      status: 'sent'
    })
    console.log('✅ Bot response stored in whatsapp_messages table')
  } catch (error) {
    console.error('❌ Error in sendStepMessage:', error)
  }
}

async function createConversationSummary(
  supabase: any,
  conversationId: string,
  companyId: string
) {
  try {
    console.log('🎯 Creating conversation summary for conversation:', conversationId)
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('❌ Error fetching conversation for summary:', convError)
      return
    }

    console.log('📊 Conversation data for summary:', {
      id: conversation.id,
      current_step: conversation.current_step,
      ai_enabled: conversation.ai_enabled,
      is_new_user: conversation.is_new_user,
      purpose: conversation.purpose,
      property_type: conversation.property_type,
      budget: conversation.budget,
      location: conversation.location
    })

    const { data: companyData } = await supabase
      .from('companies')
      .select('industry')
      .eq('id', companyId)
      .single()

    const industry = companyData?.industry || 'real_estate'

    let summary = `🤖 AI Lead Qualification Complete\n\n👤 Contact: ${conversation.contact_name || 'Unknown'} (${conversation.contact_phone})\n\n📋 Lead Details:`

    if (industry === 'automobile_dealers') {
      summary += `\n• Purpose: ${conversation.purpose || 'Not specified'}`
      summary += `\n• Vehicle Type: ${conversation.vehicle_type || 'Not specified'}`
      summary += `\n• Brand: ${conversation.brand || 'Not specified'}`
      summary += `\n• Budget: ${conversation.budget || 'Not specified'}`
      summary += `\n\n🚗 Ready for automobile specialist follow-up.`
    } else if (industry === 'education') {
      summary += `\n• Interest: ${conversation.interest || 'Not specified'}`
      summary += `\n• Course Field: ${conversation.course || 'Not specified'}`
      summary += `\n• Course Type: ${conversation.study_mode || 'Not specified'}`
      summary += `\n• Subjects of Interest: ${conversation.subjects_interest || 'Not specified'}`
      summary += `\n\n📚 Ready for education counselor follow-up.`
    } else if (industry === 'internal_crm') {
      summary += `\n• Vertical Interest: ${conversation.purpose || 'Not specified'}`
      summary += `\n• Lead Volume: ${conversation.interest || 'Not specified'}`
      summary += `\n• Demo Interest: ${conversation.budget || 'Not specified'}`
      summary += `\n\n🏢 Ready for AiLeadX sales team follow-up.`
    } else {
      summary += `\n• Purpose: ${conversation.purpose || 'Not specified'}`
      summary += `\n• Property Type: ${conversation.property_type || 'Not specified'}`
      summary += `\n• Budget: ${conversation.budget || 'Not specified'}`
      summary += `\n• Location: ${conversation.location || 'Not specified'}`
      summary += `\n\n🏠 Ready for real estate agent follow-up.`
    }

    summary += `\n\n💬 Conversation completed successfully. Ready for human follow-up.\n\n📅 Qualified: ${new Date().toLocaleString()}`

    // Store summary message in database for inbox visibility only
    console.log(`💾 Storing ${industry} summary in inbox only (not sending to user)`)
    console.log('📝 Summary content:', summary.substring(0, 200) + '...')

    const { data: insertedMessage, error: summaryError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      company_id: companyId,
      body: summary,
      direction: 'outgoing',
      status: 'sent'
    }).select()

    if (summaryError) {
      console.error('❌ Failed to insert summary message:', summaryError)
      throw summaryError
    }

    console.log('✅ Summary message inserted successfully:', insertedMessage?.[0]?.id)

    // Update conversation last_message_at to ensure proper ordering
    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateError) {
      console.error('❌ Failed to update conversation timestamp:', updateError)
    }

    console.log(`✅ ${industry} conversation summary stored in whatsapp_messages table`)
  } catch (error) {
    console.error('Error creating conversation summary:', error)
  }
}

function buildMessageText(message: string, buttons: string[]): string {
  let fullMessage = message

  if (buttons && buttons.length > 0) {
    fullMessage += '\n\nOptions:'
    buttons.forEach((button, index) => {
      fullMessage += `\n${index + 1}. ${button}`
    })
    fullMessage += '\n\nReply with the number or type your choice.'
  }

  return fullMessage
}

async function extractFromText(userInput: string, currentStep: number, industry?: string): Promise<string | null> {
  try {
    // For Step 1, be very restrictive - only extract if there's clear intent
    if (currentStep === 1) {
      const lowerInput = userInput.toLowerCase().trim()

      // Common greetings should not trigger AI extraction
      const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'how are you', 'what\'s up']
      if (greetings.some(greeting => lowerInput.includes(greeting) || lowerInput === greeting)) {
        console.log('🤖 Ignoring greeting for Step 1 extraction')
        return null
      }

      // Only proceed with AI if input seems like an actual response
      const hasIntentWords = /\b(yes|no|interested|enroll|buy|rent|service|info|information|details)\b/i.test(userInput)
      if (!hasIntentWords) {
        console.log('🤖 No clear intent words found for Step 1 extraction')
        return null
      }
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    let allowedCategories = ''
    let stepDescription = ''

    if (currentStep === 1) {
      if (industry === 'education') {
        allowedCategories = "'yes' or 'info'"
      } else if (industry === 'automobile_dealers') {
        allowedCategories = "'buy' or 'service'"
      } else {
        allowedCategories = "'buy' or 'rent'"
      }
      stepDescription = 'Step 1 (Interest/Purpose)'
    } else if (currentStep === 2) {
      allowedCategories = "property types, vehicle types, or courses depending on industry"
      stepDescription = 'Step 2 (Type/Selection)'
    } else if (currentStep === 3) {
      allowedCategories = "study modes or brands depending on industry"
      stepDescription = 'Step 3 (Mode/Brand)'
    }

    const prompt = `You are a helpful AI assistant for lead qualification. The user just said: "${userInput}".
Based on the current step ${stepDescription}, extract the most appropriate value from their message.

For ${industry || 'real estate'} industry, return ONLY one of these exact values: ${allowedCategories}

If the user's message doesn't clearly express one of these options, return 'unclear'.

Examples:
- For "I want to buy a house" → "buy"
- For "I'm interested in services" → "service"
- For "Tell me more about courses" → "info"
- For "Hello" → "unclear"`

    console.log(`🤖 Gemini prompt for step ${currentStep}: ${prompt}`)

    const result = await model.generateContent(prompt)
    const response = result.response.text().trim().toLowerCase()

    console.log(`🤖 Gemini response: "${response}"`)

    if (response === 'unclear' || response === '' || response === 'null') {
      return null
    }

    return response
  } catch (error) {
    console.error('Gemini extraction error:', error)
    return null
  }
}