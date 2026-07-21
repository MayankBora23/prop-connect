// @ts-nocheck

const MAX_SUGGESTIONS = 3

export interface CatalogPreferences {
  purpose?: string | null
  property_type?: string | null
  budget?: string | null
  location?: string | null
  vehicle_type?: string | null
  brand?: string | null
  interest?: string | null
  course?: string | null
  study_mode?: string | null
  subjects_interest?: string | null
}

function parseBudgetString(budgetString: string | null | undefined): number {
  if (!budgetString) return 0
  const clean = budgetString.trim().toLowerCase().replace(/,/g, '').replace(/₹/g, '')

  const parsePart = (part: string): number => {
    const trimmed = part.trim()
    if (!trimmed) return 0

    const croreMatch = trimmed.match(/^([\d.]+)\s*(crore|crores|cr\.?)$/)
    if (croreMatch) return parseFloat(croreMatch[1]) * 10000000

    const lakhMatch = trimmed.match(/^([\d.]+)\s*(lakh|lakhs|lac|lacs|l)$/)
    if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000

    const kMatch = trimmed.match(/^([\d.]+)\s*k$/)
    if (kMatch) return parseFloat(kMatch[1]) * 1000

    const phraseCrore = trimmed.match(/([\d.]+)\s*(crore|crores|cr\b)/)
    if (phraseCrore) return parseFloat(phraseCrore[1]) * 10000000

    const phraseLakh = trimmed.match(/([\d.]+)\s*(lakh|lakhs|lac|lacs|\bl\b)/)
    if (phraseLakh) return parseFloat(phraseLakh[1]) * 100000

    const numericMatch = trimmed.match(/([\d.]+)/)
    if (!numericMatch) return 0
    return parseFloat(numericMatch[1])
  }

  const parts = clean.split(/[-–—/]/)
  const values = parts.map((p) => parsePart(p.trim()))
  return Math.max(...values, 0)
}

function parsePropertyPrice(price: string | number | null | undefined): number {
  if (price == null || price === '') return 0
  return parseBudgetString(String(price))
}

const PROPERTY_TYPE_KEYWORDS: Record<string, string[]> = {
  plot: ['plot', 'land', 'parcel', 'agricultural'],
  apartment: ['apartment', 'flat', 'builder floor'],
  villa: ['villa', 'bungalow', 'independent house', 'row house'],
  commercial: ['commercial', 'office', 'shop', 'retail', 'warehouse'],
}

const LOCATION_ALIASES: Record<string, string[]> = {
  haryana: ['haryana', 'gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'karnal', 'sonipat', 'rohtak', 'hisar', 'panchkula'],
  delhi: ['delhi', 'new delhi', 'dwarka', 'rohini', 'south delhi', 'north delhi', 'paschim vihar'],
  'uttar pradesh': ['uttar pradesh', 'up', 'noida', 'greater noida', 'ghaziabad', 'lucknow', 'kanpur'],
  maharashtra: ['maharashtra', 'mumbai', 'pune', 'nagpur', 'thane'],
  karnataka: ['karnataka', 'bangalore', 'bengaluru', 'mysore'],
}

function getPropertyHaystack(property: Record<string, unknown>): string {
  return [
    property.property_type,
    property.title,
    property.description,
    property.bhk ? `${property.bhk} bhk` : '',
    property.location,
    property.city,
    property.address,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function propertyTypeMatches(pref: string, property: Record<string, unknown>): boolean {
  const prefNorm = pref.toLowerCase().trim()
  const haystack = getPropertyHaystack(property)
  const keywords = PROPERTY_TYPE_KEYWORDS[prefNorm] || [prefNorm]

  const declared = String(property.property_type || '').toLowerCase().trim()
  if (declared) {
    if (declared === prefNorm || declared.includes(prefNorm) || prefNorm.includes(declared)) {
      return true
    }
  }

  const hasTypeKeyword = keywords.some((keyword) => haystack.includes(keyword))
  if (!hasTypeKeyword) return false

  if (prefNorm === 'plot') {
    const looksLikeBuiltHome = /\d+\s*bhk|\bflat\b|\bapartment\b|\bvilla\b|independent house/.test(haystack)
    const looksLikeLand = /\bplot\b|\bland\b|\bparcel\b/.test(haystack)
    if (looksLikeBuiltHome && !looksLikeLand) return false
  }

  if (prefNorm === 'apartment' || prefNorm === 'villa' || prefNorm === 'commercial') {
    const looksLikePlot = /\bplot\b|\bland\b|\bparcel\b/.test(haystack)
    const looksLikeRequested = keywords.some((keyword) => haystack.includes(keyword))
    if (looksLikePlot && !looksLikeRequested) return false
  }

  return true
}

function expandLocationTerms(pref: string): string[] {
  const normalized = pref.toLowerCase().trim()
  const terms = new Set<string>([normalized])

  for (const [region, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (normalized === region || aliases.includes(normalized)) {
      terms.add(region)
      aliases.forEach((alias) => terms.add(alias))
    }
  }

  return Array.from(terms)
}

function locationMatches(pref: string, property: Record<string, unknown>): boolean {
  const terms = expandLocationTerms(pref)
  const fields = [property.location, property.city, property.address]
    .filter(Boolean)
    .map((field) => String(field).toLowerCase())

  if (!fields.length) return false

  return fields.some((field) =>
    terms.some((term) => {
      if (field === term) return true
      if (field.includes(term) || term.includes(field)) return true
      return field.split(/[\s,/-]+/).some((token) => token.length > 2 && (token === term || term.includes(token) || token.includes(term)))
    })
  )
}

function formatPrice(price: string | number | null | undefined): string {
  if (price == null || price === '') return 'Price on request'
  const str = String(price).trim()
  const lower = str.toLowerCase()
  if (lower.includes('₹') || lower.includes('cr') || lower.endsWith('l') || lower.includes(' lakh')) {
    return str.startsWith('₹') ? str : `₹${str}`
  }
  const num = Number(str.replace(/[^\d.]/g, ''))
  if (Number.isNaN(num)) return str.startsWith('₹') ? str : `₹${str}`
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
  return `₹${num.toLocaleString('en-IN')}`
}

function formatPropertyArea(area: string | number | null | undefined): string {
  if (area == null || area === '') return ''
  const areaStr = String(area).trim()
  if (!areaStr) return ''
  const lower = areaStr.toLowerCase()
  if (lower.includes('sq') || lower.includes('ft')) return areaStr
  return `${areaStr} sq.ft`
}

function getPropertyArea(property: Record<string, unknown>): string | number | null | undefined {
  return (property.area ?? property.area_sqft ?? null) as string | number | null | undefined
}

function formatPropertyMessage(property: Record<string, unknown>): string {
  const bhk = property.bhk
  const bhkLine = bhk
    ? `${typeof bhk === 'string' ? bhk : `${bhk} BHK`}\n`
    : ''
  const areaLine = formatPropertyArea(getPropertyArea(property))
  const areaFormatted = areaLine ? `${areaLine}\n` : ''

  return (
    `*${property.title}*\n\n` +
    `${property.description ? `${property.description}\n\n` : ''}` +
    bhkLine +
    areaFormatted +
    `${property.price ? `${formatPrice(property.price)}\n\n` : ''}` +
    `📍 *Location:*\n` +
    `${property.location || property.city || property.address || 'Location not specified'}\n` +
    `${property.amenities?.length ? `\n✨ *Amenities:*\n${(property.amenities as string[]).join(', ')}\n` : ''}` +
    `${property.property_type ? `\n🏢 *Type:* ${property.property_type}\n` : ''}` +
    `${property.status ? `\n📊 *Status:* ${String(property.status).charAt(0).toUpperCase() + String(property.status).slice(1)}\n` : ''}` +
    `\n📞 *Contact us for more details!*`
  )
}

function formatCourseMessage(course: Record<string, unknown>): string {
  const courseType = course.course_type
    ? String(course.course_type).charAt(0).toUpperCase() + String(course.course_type).slice(1)
    : 'N/A'
  const teacher = (course.teachers as { name?: string } | null)?.name

  return (
    `*${course.name}*\n\n` +
    `${course.description ? `${course.description}\n\n` : ''}` +
    `📚 *Course Type:* ${courseType}\n` +
    `${course.duration_months ? `⏰ *Duration:* ${course.duration_months} months\n` : ''}` +
    `${course.max_students ? `👥 *Max Students:* ${course.max_students}\n` : ''}` +
    `${teacher ? `👨‍🏫 *Instructor:* ${teacher}\n` : ''}` +
    `${course.subjects_covered?.length ? `\n📖 *Subjects Covered:*\n${(course.subjects_covered as string[]).join(', ')}\n` : ''}` +
    `${course.price ? `\n💰 *Price:* ₹${course.price}\n\n` : ''}` +
    `🎓 *Contact us for enrollment details!*`
  )
}

function formatVehicleMessage(vehicle: Record<string, unknown>): string {
  const variant = vehicle.variant ? ` (${vehicle.variant})` : ''
  const capitalize = (v: unknown) =>
    v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : ''

  return (
    `*${vehicle.brand} ${vehicle.model}${variant}*\n\n` +
    `${vehicle.description ? `${vehicle.description}\n\n` : ''}` +
    `🚗 *Vehicle Type:* ${capitalize(vehicle.vehicle_type)}\n` +
    `${vehicle.year ? `📅 *Year:* ${vehicle.year}\n` : ''}` +
    `${vehicle.fuel_type ? `⛽ *Fuel Type:* ${capitalize(vehicle.fuel_type)}\n` : ''}` +
    `${vehicle.transmission ? `⚙️ *Transmission:* ${capitalize(vehicle.transmission)}\n` : ''}` +
    `${vehicle.mileage ? `📏 *Mileage:* ${vehicle.mileage} km\n` : ''}` +
    `${vehicle.seating_capacity ? `👥 *Seating Capacity:* ${vehicle.seating_capacity}\n` : ''}` +
    `${vehicle.color ? `🎨 *Color:* ${vehicle.color}\n` : ''}` +
    `${vehicle.price ? `\n💰 *Price:* ₹${Number(vehicle.price).toLocaleString('en-IN')}\n\n` : ''}` +
    `🏪 *Contact us for test drive and booking details!*`
  )
}

function scoreProperty(property: Record<string, unknown>, prefs: CatalogPreferences): number {
  const budgetMax = parseBudgetString(prefs.budget)
  const price = parsePropertyPrice(property.price)

  if (prefs.property_type && !propertyTypeMatches(prefs.property_type, property)) {
    return 0
  }

  if (prefs.location && !locationMatches(prefs.location, property)) {
    return 0
  }

  if (budgetMax > 0) {
    if (price <= 0) return 0
    if (price > budgetMax * 1.15) return 0
  }

  let score = 0
  if (prefs.property_type) score += 4
  if (prefs.location) score += 3
  if (budgetMax > 0 && price > 0) {
    score += price <= budgetMax ? 3 : 1
  }

  return score
}

function courseNameMatches(pref: string, course: Record<string, unknown>): boolean {
  const prefNorm = pref.toLowerCase().trim()
  const name = String(course.name || '').toLowerCase().trim()
  const haystack = [
    course.name,
    course.description,
    ...(Array.isArray(course.subjects_covered) ? course.subjects_covered : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!prefNorm) return true

  if (name === prefNorm || name.includes(prefNorm) || prefNorm.includes(name)) {
    return true
  }

  const tokens = prefNorm.split(/\s+/).filter((token) => token.length > 2)
  if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) {
    return true
  }

  // Tech-category payloads from the new education flow
  const techKeywords: Record<string, string[]> = {
    coding: ['coding', 'programming', 'code', 'python', 'java', 'c++', 'developer', 'software'],
    web_development: ['web', 'html', 'css', 'javascript', 'react', 'node', 'frontend', 'backend', 'fullstack', 'full stack'],
    ai_ml: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'nlp', 'neural', 'ml', 'data model'],
    data_science: ['data science', 'data analytics', 'analytics', 'statistics', 'tableau', 'power bi', 'sql', 'pandas'],
  }

  // Backward compatibility for older conversations that used generic categories
  const legacyKeywords: Record<string, string[]> = {
    engineering: ['engineer', 'b.tech', 'btech', 'computer', 'mechanical', 'civil', 'electrical'],
    medical: ['medical', 'medic', 'doctor', 'mbbs', 'nursing', 'pharma'],
    commerce: ['commerce', 'business', 'mba', 'account', 'finance', 'bcom'],
    arts: ['arts', 'art', 'humanities', 'literature', 'design'],
  }

  const allKeywords = { ...techKeywords, ...legacyKeywords }
  const terms = allKeywords[prefNorm] || []
  return terms.some((term) => haystack.includes(term))
}

function subjectsInterestMatches(pref: string, course: Record<string, unknown>): boolean {
  const prefNorm = pref.toLowerCase().trim()
  if (!prefNorm) return true

  const subjects = (Array.isArray(course.subjects_covered) ? course.subjects_covered : [])
    .map((subject) => String(subject).toLowerCase().trim())
    .filter(Boolean)

  // If course has no subjects listed, treat as a soft pass — don't hard-reject
  // (the course field / study_mode score will still apply)
  if (!subjects.length) return true

  const prefParts = prefNorm
    .split(/[,;/]+|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean)

  const terms = prefParts.length > 0 ? prefParts : [prefNorm]

  // Match if ANY preference term appears in ANY subject (or vice versa)
  return terms.some((term) =>
    subjects.some((subject) => {
      if (subject === term) return true
      if (subject.includes(term) || term.includes(subject)) return true
      // Token-level partial match: "python" matches "python programming"
      const termTokens = term.split(/\s+/).filter((t) => t.length > 2)
      const subjTokens = subject.split(/\s+/).filter((t) => t.length > 2)
      return termTokens.some((tt) => subjTokens.some((st) => st.includes(tt) || tt.includes(st)))
    })
  )
}


function scoreCourse(course: Record<string, unknown>, prefs: CatalogPreferences): number {
  if (prefs.study_mode && course.course_type) {
    const prefMode = prefs.study_mode.toLowerCase()
    const courseType = String(course.course_type).toLowerCase()

    // study_mode now stores the actual course_type value (online/offline/hybrid)
    // Allow hybrid to match both online and offline preferences
    const allowed: Record<string, string[]> = {
      online: ['online', 'hybrid'],
      offline: ['offline', 'hybrid'],
      hybrid: ['online', 'offline', 'hybrid'],
      // Legacy study mode mappings for older conversations
      full_time: ['offline', 'hybrid'],
      part_time: ['offline', 'hybrid'],
    }

    const allowedTypes = allowed[prefMode] || [prefMode]
    if (!allowedTypes.includes(courseType)) {
      return 0
    }
  }

  if (prefs.course && !courseNameMatches(prefs.course, course)) {
    return 0
  }

  // subjects_interest filter — returns true even if course has no subjects (soft pass)
  if (prefs.subjects_interest && !subjectsInterestMatches(prefs.subjects_interest, course)) {
    return 0
  }

  let score = 0

  // Study mode / course type match
  if (prefs.study_mode) score += 3

  // Course field match (e.g. coding, web_development, ai_ml)
  if (prefs.course) {
    score += 4
    // Bonus: course name directly mentions the category keyword (stronger match)
    const courseName = String(course.name || '').toLowerCase()
    const prefNorm = prefs.course.toLowerCase()
    if (courseName.includes(prefNorm.replace('_', ' ')) || courseName.includes(prefNorm)) {
      score += 1
    }
  }

  // Subjects of interest — proportional: more matching terms = higher score (max +4)
  if (prefs.subjects_interest) {
    const subjects = (Array.isArray(course.subjects_covered) ? course.subjects_covered : [])
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean)

    const prefParts = prefs.subjects_interest
      .toLowerCase()
      .split(/[,;/]+|\band\b/)
      .map((p) => p.trim())
      .filter(Boolean)

    if (prefParts.length > 0 && subjects.length > 0) {
      const matchedCount = prefParts.filter((term) =>
        subjects.some((subject) => {
          if (subject === term || subject.includes(term) || term.includes(subject)) return true
          const termTokens = term.split(/\s+/).filter((t) => t.length > 2)
          const subjTokens = subject.split(/\s+/).filter((t) => t.length > 2)
          return termTokens.some((tt) => subjTokens.some((st) => st.includes(tt) || tt.includes(st)))
        })
      ).length
      // Proportional points: full match = 4, partial match = scaled
      score += Math.round((matchedCount / prefParts.length) * 4)
    } else if (prefs.subjects_interest) {
      // subjects_interest was given but course has no subjects — still give base credit
      score += 1
    }
  }

  return score
}

// Maps user-facing vehicle_type selections to DB vehicle_type values + optional condition keywords
const VEHICLE_TYPE_MAP: Record<string, { baseType: string; usedOnly?: boolean }> = {
  car: { baseType: 'car' },
  bike: { baseType: 'bike' },
  used_car: { baseType: 'car', usedOnly: true },
  used_bike: { baseType: 'bike', usedOnly: true },
  // common aliases that might come from AI extraction
  automobile: { baseType: 'car' },
  motorcycle: { baseType: 'bike' },
  scooter: { baseType: 'bike' },
  suv: { baseType: 'car' },
  sedan: { baseType: 'car' },
  hatchback: { baseType: 'car' },
  truck: { baseType: 'truck' },
  van: { baseType: 'van' },
}

function vehicleTypeMatches(pref: string, vehicle: Record<string, unknown>): boolean {
  const prefNorm = pref.toLowerCase().trim()
  const vehicleType = String(vehicle.vehicle_type || '').toLowerCase().trim()
  const condition = String(vehicle.condition || vehicle.vehicle_condition || '').toLowerCase()
  const haystack = [vehicle.vehicle_type, vehicle.model, vehicle.brand, vehicle.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const mapping = VEHICLE_TYPE_MAP[prefNorm]

  if (mapping) {
    const { baseType, usedOnly } = mapping

    // Check if the DB vehicle's type matches the base type (exact, contains, or reverse contains)
    const typeMatches =
      vehicleType === baseType ||
      vehicleType.includes(baseType) ||
      baseType.includes(vehicleType) ||
      haystack.includes(baseType)

    if (!typeMatches) return false

    // If user wants "used" vehicle, verify the condition or title indicates used/second-hand
    if (usedOnly) {
      const isUsed = /\bused\b|\bsecond.?hand\b|\bpre.?owned\b|\bpre-?owned\b/.test(condition + ' ' + haystack)
      return isUsed
    }

    return true
  }

  // Fallback: direct comparison
  return vehicleType === prefNorm || vehicleType.includes(prefNorm) || prefNorm.includes(vehicleType)
}

function vehicleBrandMatches(pref: string, vehicle: Record<string, unknown>): boolean {
  const prefNorm = pref.toLowerCase().trim()
  if (!prefNorm) return true

  const brand = String(vehicle.brand || '').toLowerCase().trim()
  const model = String(vehicle.model || '').toLowerCase().trim()
  const haystack = [brand, model, vehicle.description].filter(Boolean).join(' ').toLowerCase()

  // Direct match
  if (brand === prefNorm || brand.includes(prefNorm) || prefNorm.includes(brand)) return true

  // Token-level partial match: "maruti suzuki" matches "maruti", "suzuki" matches "maruti suzuki"
  const prefTokens = prefNorm.split(/\s+/).filter((t) => t.length > 2)
  const brandTokens = brand.split(/\s+/).filter((t) => t.length > 2)
  if (prefTokens.some((pt) => brandTokens.some((bt) => bt.includes(pt) || pt.includes(bt)))) return true

  // Match against haystack (catches brand in model name or description)
  return prefTokens.some((pt) => haystack.includes(pt))
}

function scoreVehicle(vehicle: Record<string, unknown>, prefs: CatalogPreferences): number {
  const budgetMax = parseBudgetString(prefs.budget)
  const price = parsePropertyPrice(vehicle.price)

  if (prefs.vehicle_type && !vehicleTypeMatches(prefs.vehicle_type, vehicle)) {
    return 0
  }

  if (prefs.brand && !vehicleBrandMatches(prefs.brand, vehicle)) {
    return 0
  }

  if (budgetMax > 0) {
    if (price <= 0) return 0
    if (price > budgetMax * 1.15) return 0
  }

  let score = 0
  if (prefs.vehicle_type) score += 4
  if (prefs.brand) score += 3
  if (budgetMax > 0 && price > 0) {
    score += price <= budgetMax ? 3 : 1
  }

  return score
}

function rankItems<T extends Record<string, unknown>>(
  items: T[],
  prefs: CatalogPreferences,
  scorer: (item: T, prefs: CatalogPreferences) => number
): T[] {
  return items
    .map((item) => ({ item, score: scorer(item, prefs) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}

async function invokeSendWhatsAppMessage(payload: {
  conversation_id: string
  body: string
  file_urls?: string[] | null
  file_names?: string[] | null
  file_types?: string[] | null
}): Promise<boolean> {
  const base = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  const res = await fetch(`${base}/functions/v1/send-whatsapp-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error('send-whatsapp-message failed:', await res.text())
    return false
  }

  return true
}

async function sendPropertySuggestion(conversationId: string, property: Record<string, unknown>) {
  const message = formatPropertyMessage(property)
  const images = Array.isArray(property.images) ? property.images.slice(0, 3) : []

  if (images.length > 0) {
    await invokeSendWhatsAppMessage({
      conversation_id: conversationId,
      body: message.trim(),
      file_urls: [images[0]],
      file_names: [`${property.title} - Image 1`],
      file_types: ['image'],
    })

    for (let i = 1; i < images.length; i++) {
      await invokeSendWhatsAppMessage({
        conversation_id: conversationId,
        body: '',
        file_urls: [images[i]],
        file_names: [`${property.title} - Image ${i + 1}`],
        file_types: ['image'],
      })
    }
    return
  }

  await invokeSendWhatsAppMessage({
    conversation_id: conversationId,
    body: message.trim(),
  })
}

async function sendCourseSuggestion(conversationId: string, course: Record<string, unknown>) {
  await invokeSendWhatsAppMessage({
    conversation_id: conversationId,
    body: formatCourseMessage(course).trim(),
  })
}

async function sendVehicleSuggestion(conversationId: string, vehicle: Record<string, unknown>) {
  const message = formatVehicleMessage(vehicle)
  const images = Array.isArray(vehicle.images) ? vehicle.images.slice(0, 3) : []

  if (images.length > 0) {
    await invokeSendWhatsAppMessage({
      conversation_id: conversationId,
      body: message.trim(),
      file_urls: [images[0]],
      file_names: [`${vehicle.brand} ${vehicle.model} - Image 1`],
      file_types: ['image'],
    })

    for (let i = 1; i < images.length; i++) {
      await invokeSendWhatsAppMessage({
        conversation_id: conversationId,
        body: '',
        file_urls: [images[i]],
        file_names: [`${vehicle.brand} ${vehicle.model} - Image ${i + 1}`],
        file_types: ['image'],
      })
    }
    return
  }

  await invokeSendWhatsAppMessage({
    conversation_id: conversationId,
    body: message.trim(),
  })
}

export async function sendMatchedCatalogSuggestions(
  supabase: any,
  conversationId: string,
  companyId: string,
  industry: string,
  _preferences?: CatalogPreferences
) {
  try {
    if (industry === 'internal_crm') return

    // Always load full preferences from DB — webhook only passes flow state fields,
    // and updateData on the final step contains just the last answer.
    const { data: conversation, error: convError } = await supabase
      .from('whatsapp_conversations')
      .select('purpose, property_type, budget, location, vehicle_type, brand, interest, course, study_mode, subjects_interest')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('Failed to load conversation preferences for catalog suggestions:', convError)
      return
    }

    const preferences: CatalogPreferences = conversation

    let intro = ''
    let matches: Record<string, unknown>[] = []
    let sendItem: (item: Record<string, unknown>) => Promise<void>

    if (industry === 'real_estate') {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'available')

      if (error) throw error

      matches = rankItems(data || [], preferences, scoreProperty).slice(0, MAX_SUGGESTIONS)
      console.log('Property match preferences:', preferences, 'matched count:', matches.length)
      intro = '🏠 Based on your preferences, here are some properties that may interest you:'
      sendItem = (item) => sendPropertySuggestion(conversationId, item)
    } else if (industry === 'education') {
      const { data, error } = await supabase
        .from('courses')
        .select('*, teachers:instructor_id ( name )')
        .eq('company_id', companyId)
        .eq('status', 'active')

      if (error) throw error

      matches = rankItems(data || [], preferences, scoreCourse).slice(0, MAX_SUGGESTIONS)
      console.log('Course match preferences:', preferences, 'matched count:', matches.length)
      intro = '📚 Based on your interests, here are some courses you may like:'
      sendItem = (item) => sendCourseSuggestion(conversationId, item)
    } else if (industry === 'automobile_dealers') {
      if (preferences.purpose?.toLowerCase() === 'service') {
        console.log('Skipping vehicle suggestions for service intent')
        return
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'available')

      if (error) throw error

      matches = rankItems(data || [], preferences, scoreVehicle).slice(0, MAX_SUGGESTIONS)
      console.log('Vehicle match preferences:', preferences, 'matched count:', matches.length)
      intro = '🚗 Based on your preferences, here are some vehicles we recommend:'
      sendItem = (item) => sendVehicleSuggestion(conversationId, item)
    } else {
      return
    }

    if (!matches.length) {
      await invokeSendWhatsAppMessage({
        conversation_id: conversationId,
        body:
          "We couldn't find an exact match in our current listings right now. Our team will contact you shortly with personalized options.",
      })
      return
    }

    await invokeSendWhatsAppMessage({
      conversation_id: conversationId,
      body: intro,
    })

    for (const item of matches) {
      await sendItem(item)
    }

    console.log(`✅ Sent ${matches.length} catalog suggestion(s) for ${industry}`)
  } catch (error) {
    console.error('Error sending catalog suggestions:', error)
  }
}
