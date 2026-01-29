import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

interface TwilioWebhookPayload {
  To: string
  From: string
  Body: string
  MessageSid: string
  AccountSid: string
  NumMedia?: string
  MediaUrl0?: string
  MediaContentType0?: string
  ProfileName?: string
}

interface WhatsAppSettings {
  company_id: string
  twilio_auth_token: string
  whatsapp_number: string
}

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
  accountSid: string
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
          message: "Which course are you interested in?",
          buttons: ["Engineering", "Medical", "Commerce", "Arts"],
          buttonPayloads: ["engineering", "medical", "commerce", "arts"],
          nextStep: 3
        },
        {
          step: 3,
          message: "What's your preferred study mode?",
          buttons: ["Full-time", "Part-time", "Online"],
          buttonPayloads: ["full_time", "part_time", "online"],
          nextStep: 4
        },
        {
          step: 4,
          message: "What's your budget for education?",
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

export async function handleAiFlow({
  payload,
  conversationId,
  whatsappSettings,
  conversationData,
  supabase,
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

    // Get industry-specific step configurations
    const STEP_CONFIGS = getStepConfigs(industry)

    // Log the incoming user message to whatsapp_messages
    try {
      const { error: logError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          company_id: whatsappSettings.company_id,
          direction: 'incoming',
          body: payload.Body,
          status: 'delivered',
          message_sid: payload.MessageSid
        })

      if (logError) {
        console.error('❌ Failed to log incoming message:', logError)
      } else {
        console.log('✅ Incoming user message logged to database')
      }
    } catch (logError) {
      console.error('💥 Error logging incoming message:', logError)
    }

    const userInput = payload.Body.trim().toLowerCase()

    // Safety check: If user types "agent" or "help", exit AI flow
    if (userInput === 'agent' || userInput === 'help') {
      console.log('User requested agent help, exiting AI flow')
      await supabase
        .from('whatsapp_conversations')
        .update({ ai_enabled: false })
        .eq('id', conversationId)

      // Send confirmation message
      const confirmationMessage = "I've connected you with our human agent. They'll assist you shortly."
      await sendWhatsAppMessage(whatsappSettings, payload.From, confirmationMessage, accountSid)

      // Store bot response in database
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        company_id: whatsappSettings.company_id,
        body: confirmationMessage,
        direction: 'outgoing',
        status: 'sent'
      })
      console.log('✅ Agent bypass message stored in whatsapp_messages table')

      return new Response('', { status: 200, headers: corsHeaders })
    }

    const currentStep = conversationData.current_step
    const stepConfig = STEP_CONFIGS.find(config => config.step === currentStep)

    if (!stepConfig) {
      console.error('Invalid step:', currentStep)
      return new Response('Invalid step', { status: 400, headers: corsHeaders })
    }

    let nextStep = stepConfig.nextStep
    let updateData: any = {}
    let inputValid = false

    // Process user input based on industry and current step
    console.log(`🎯 Processing input for ${industry} industry, step ${currentStep}, input: "${userInput}"`)

    if (industry === 'automobile_dealers') {
      console.log('🚗 Routing to automobile flow')
      inputValid = await processAutomobileFlow(userInput, currentStep, updateData, conversationId, stepConfig, whatsappSettings, payload, supabase, accountSid, industry)
    } else if (industry === 'education') {
      console.log('📚 Routing to education flow')
      inputValid = await processEducationFlow(userInput, currentStep, updateData, conversationId, stepConfig, whatsappSettings, payload, supabase, accountSid, industry)
    } else {
      console.log('🏠 Routing to real estate flow (default)')
      inputValid = await processRealEstateFlow(userInput, currentStep, updateData, conversationId, stepConfig, whatsappSettings, payload, supabase, accountSid, industry)
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
        await sendStepMessage(whatsappSettings, payload.From, nextStepConfig, supabase, conversationId, whatsappSettings.company_id, accountSid)

        // If this is the final step (nextStep of the config we just sent is 0), create summary
        if (nextStepConfig.nextStep === 0) {
          console.log('🎯 Final step sent, creating summary for conversation:', conversationId)
          await createConversationSummary(supabase, conversationId, whatsappSettings.company_id)
          console.log('✅ Summary creation completed')
        }
      }
    } else {
      // Input was invalid, send current step message again
      console.log(`❌ Invalid input for step ${currentStep}, sending current step message again`)
      await sendStepMessage(whatsappSettings, payload.From, stepConfig, supabase, conversationId, whatsappSettings.company_id, accountSid)
    }

    return new Response('', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('AI Flow error:', error)
    console.error('Error stack:', error.stack)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
}

// Industry-specific processing functions
async function processRealEstateFlow(
  userInput: string,
  currentStep: number,
  updateData: any,
  conversationId: string,
  stepConfig: StepConfig,
  whatsappSettings: any,
  payload: any,
  supabase: any,
  accountSid: string,
  industry: string
): Promise<boolean> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (currentStep === 1) {
    let purposeValue: string | null = null

    if (userInput === '1') {
      purposeValue = 'buy'
    } else if (userInput === '2') {
      purposeValue = 'rent'
    } else {
      if (userInput.includes('buy')) {
        purposeValue = 'buy'
      } else if (userInput.includes('rent')) {
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

    if (userInput === '1') {
      propertyTypeValue = 'apartment'
    } else if (userInput === '2') {
      propertyTypeValue = 'villa'
    } else if (userInput === '3') {
      propertyTypeValue = 'plot'
    } else if (userInput === '4') {
      propertyTypeValue = 'commercial'
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
  accountSid: string,
  industry: string
): Promise<boolean> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (currentStep === 1) {
    let purposeValue: string | null = null

    if (userInput === '1') {
      purposeValue = 'buy'
    } else if (userInput === '2') {
      purposeValue = 'service'
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

    if (userInput === '1') {
      vehicleTypeValue = 'car'
    } else if (userInput === '2') {
      vehicleTypeValue = 'bike'
    } else if (userInput === '3') {
      vehicleTypeValue = 'used_car'
    } else if (userInput === '4') {
      vehicleTypeValue = 'used_bike'
    } else {
      const textMap: { [key: string]: string } = {
        'car': 'car',
        'bike': 'bike',
        'used car': 'used_car',
        'used bike': 'used_bike'
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
  accountSid: string,
  industry: string
): Promise<boolean> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (currentStep === 1) {
    let interestValue: string | null = null

    if (userInput === '1') {
      interestValue = 'yes'
    } else if (userInput === '2') {
      interestValue = 'info'
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

    if (userInput === '1') {
      courseValue = 'engineering'
    } else if (userInput === '2') {
      courseValue = 'medical'
    } else if (userInput === '3') {
      courseValue = 'commerce'
    } else if (userInput === '4') {
      courseValue = 'arts'
    } else {
      const lowerInput = userInput.trim()
      const textMap: { [key: string]: string } = {
        'engineering': 'engineering',
        'medical': 'medical',
        'commerce': 'commerce',
        'arts': 'arts',
        'art': 'arts'
      }

      if (textMap[lowerInput]) {
        courseValue = textMap[lowerInput]
      } else if (lowerInput.includes('engineer')) {
        courseValue = 'engineering'
      } else if (lowerInput.includes('medic') || lowerInput.includes('doctor')) {
        courseValue = 'medical'
      } else if (lowerInput.includes('commerce') || lowerInput.includes('business')) {
        courseValue = 'commerce'
      } else if (lowerInput.includes('art')) {
        courseValue = 'arts'
      } else {
        courseValue = await extractFromText(userInput, currentStep, 'education')
      }
    }

    if (courseValue && courseValue !== 'unclear') {
      updateData.course = courseValue
      return true
    } else {
      return false
    }
  } else if (currentStep === 3) {
    let studyModeValue: string | null = null

    if (userInput === '1') {
      studyModeValue = 'full_time'
    } else if (userInput === '2') {
      studyModeValue = 'part_time'
    } else if (userInput === '3') {
      studyModeValue = 'online'
    } else {
      const lowerInput = userInput.trim()
      const textMap: { [key: string]: string } = {
        'full time': 'full_time',
        'full-time': 'full_time',
        'part time': 'part_time',
        'part-time': 'part_time',
        'online': 'online'
      }

      if (textMap[lowerInput]) {
        studyModeValue = textMap[lowerInput]
      } else if (lowerInput.includes('full') && lowerInput.includes('time')) {
        studyModeValue = 'full_time'
      } else if (lowerInput.includes('part') && lowerInput.includes('time')) {
        studyModeValue = 'part_time'
      } else if (lowerInput.includes('online') || lowerInput.includes('virtual')) {
        studyModeValue = 'online'
      } else {
        studyModeValue = await extractFromText(userInput, currentStep, 'education')
      }
    }

    if (studyModeValue && studyModeValue !== 'unclear') {
      updateData.study_mode = studyModeValue
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
  }

  return false
}

// Helper functions
async function sendStepMessage(
  whatsappSettings: WhatsAppSettings,
  to: string,
  stepConfig: StepConfig,
  supabase: any,
  conversationId: string,
  companyId: string,
  accountSid: string
) {
  try {
    const messageText = buildMessageText(stepConfig.message, stepConfig.buttons)
    console.log(`🚀 Sending AI message to ${to}: ${messageText.substring(0, 100)}...`)

    await sendWhatsAppMessage(whatsappSettings, to, messageText, accountSid)

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

async function sendWhatsAppMessage(
  whatsappSettings: WhatsAppSettings,
  to: string,
  message: string,
  accountSid: string
) {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const formData = new FormData()
  formData.append('To', to)
  formData.append('From', `whatsapp:${whatsappSettings.whatsapp_number}`)
  formData.append('Body', message)

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${whatsappSettings.twilio_auth_token}`)}`
    },
    body: formData
  })

  if (!response.ok) {
    console.error('Failed to send WhatsApp message:', response.statusText)
    const errorText = await response.text()
    console.error('Twilio error details:', errorText)
    throw new Error(`Failed to send message: ${response.status} ${response.statusText}`)
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
      summary += `\n• Course: ${conversation.course || 'Not specified'}`
      summary += `\n• Study Mode: ${conversation.study_mode || 'Not specified'}`
      summary += `\n• Budget: ${conversation.budget || 'Not specified'}`
      summary += `\n\n📚 Ready for education counselor follow-up.`
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