import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentCompany } from '@/hooks/useCompany'
import {
  useAiFlowConfig,
  useSaveAiFlowConfig,
  useResetAiFlowConfig,
  type CustomStep
} from '@/hooks/useAiFlowConfig'
import { useProperties } from '@/hooks/useProperties'
import { useVehicles } from '@/hooks/useVehicles'
import { useCourses } from '@/hooks/useCourses'
import { Loader2, Plus, X, RotateCcw, Save, Sparkles, Database, Info, PlusCircle, HelpCircle } from 'lucide-react'

// Default configurations helper
function getDefaultSteps(industry: string): CustomStep[] {
  switch (industry) {
    case 'automobile_dealers':
      return [
        {
          step: 1,
          message: "Welcome to our Automobile services! Are you looking to Buy or Service a vehicle?",
          buttons: ["Buy", "Service"]
        },
        {
          step: 2,
          message: "What type of vehicle are you interested in?",
          buttons: ["Car", "Bike", "Used Car", "Used Bike"]
        },
        {
          step: 3,
          message: "What's your preferred brand?",
          buttons: []
        },
        {
          step: 4,
          message: "What's your budget range?",
          buttons: []
        },
        {
          step: 5,
          message: "Thank you for your interest! Our team will contact you shortly with the best vehicle options matching your preferences.",
          buttons: []
        }
      ]
    case 'education':
      return [
        {
          step: 1,
          message: "Welcome to our Education services! Are you interested in enrolling in a course?",
          buttons: ["Yes", "Get Info"]
        },
        {
          step: 2,
          message: "Which field are you interested in?",
          buttons: ["Coding", "Web Development", "AI & ML", "Data Science"]
        },
        {
          step: 3,
          message: "What Course Type do you prefer?",
          buttons: ["Online", "Offline", "Hybrid"]
        },
        {
          step: 4,
          message: "Which subjects are you interested in? (e.g. Python, React, Machine Learning, UI/UX)",
          buttons: []
        },
        {
          step: 5,
          message: "Thank you for your interest! Our counselors will contact you shortly with detailed course information.",
          buttons: []
        }
      ]
    case 'internal_crm':
      return [
        {
          step: 1,
          message: "Welcome to AiLeadX! Are you looking to manage Real Estate, Education, or Automobile leads?",
          buttons: ["Real Estate", "Education", "Automobile"]
        },
        {
          step: 2,
          message: "Great! How many leads does your team manage per month?",
          buttons: ["< 100", "100-500", "500+"]
        },
        {
          step: 3,
          message: "Would you like to schedule a demo of AiLeadX CRM?",
          buttons: ["Yes, Schedule Demo", "Send More Info", "Not Now"]
        },
        {
          step: 4,
          message: "Thank you! Our AiLeadX team will reach out to you soon. We look forward to helping you streamline your lead management! 🚀",
          buttons: []
        },
        {
          step: 5,
          message: "Thank you for your interest! Our team will contact you shortly to schedule your personalized demo. In the meantime, visit our website for more information.",
          buttons: []
        }
      ]
    case 'real_estate':
    default:
      return [
        {
          step: 1,
          message: "Welcome to our Real Estate services! Are you looking to Buy or Rent a property?",
          buttons: ["Buy", "Rent"]
        },
        {
          step: 2,
          message: "Great! What type of property are you interested in?",
          buttons: ["Apartment", "Villa", "Plot", "Commercial"]
        },
        {
          step: 3,
          message: "What's your budget?",
          buttons: []
        },
        {
          step: 4,
          message: "What is your preferred location?",
          buttons: []
        },
        {
          step: 5,
          message: "Thank you for providing your requirements! Our team will contact you shortly with the best property options matching your criteria.",
          buttons: []
        }
      ]
  }
}

// Step labels map
const STEP_LABELS: Record<string, Record<number, string>> = {
  real_estate: {
    1: "Captures: Lead intent",
    2: "Captures: Property type",
    3: "Captures: Budget",
    4: "Captures: Location",
    5: "Captures: Closing thank you message"
  },
  automobile_dealers: {
    1: "Captures: Lead intent (buy/service)",
    2: "Captures: Vehicle type",
    3: "Captures: Brand",
    4: "Captures: Budget",
    5: "Captures: Closing thank you message"
  },
  education: {
    1: "Captures: Enrollment interest",
    2: "Captures: Course category",
    3: "Captures: Study mode (Online/Offline/Hybrid)",
    4: "Captures: Subjects of interest",
    5: "Captures: Closing thank you message"
  },
  internal_crm: {
    1: "Captures: Core CRM vertical",
    2: "Captures: Lead volume tier",
    3: "Captures: Demo booking intent",
    4: "Captures: Lead routing thank you message",
    5: "Captures: Final fallback thank you message"
  }
}

// Available fields to query values for
interface CaptureField {
  value: string
  label: string
  defaultOptions: string[]
}

const FIELDS_PER_INDUSTRY: Record<string, CaptureField[]> = {
  real_estate: [
    { value: 'intent', label: 'Lead Intent (Buy/Rent)', defaultOptions: ['Buy', 'Rent'] },
    { value: 'property_type', label: 'Property Type', defaultOptions: ['Apartment', 'Villa', 'Plot', 'Commercial'] },
    { value: 'bhk', label: 'BHK Configurations', defaultOptions: ['1 BHK', '2 BHK', '3 BHK', '4 BHK'] },
    { value: 'city', label: 'City / Location', defaultOptions: ['New Delhi', 'Mumbai', 'Bangalore', 'Noida'] },
    { value: 'budget', label: 'Budget Range', defaultOptions: ['Under 50 Lacs', '50 Lacs - 1 Cr', '1 Cr - 2 Cr', '2 Cr+'] }
  ],
  automobile_dealers: [
    { value: 'intent', label: 'Lead Intent (Buy/Service)', defaultOptions: ['Buy', 'Service'] },
    { value: 'vehicle_type', label: 'Vehicle Type', defaultOptions: ['Car', 'Bike', 'Used Car', 'Used Bike'] },
    { value: 'brand', label: 'Brand', defaultOptions: ['Maruti', 'Hyundai', 'Honda', 'Tata', 'Toyota'] },
    { value: 'transmission', label: 'Transmission', defaultOptions: ['Manual', 'Automatic'] },
    { value: 'fuel_type', label: 'Fuel Type', defaultOptions: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] },
    { value: 'budget', label: 'Budget Range', defaultOptions: ['Under 5 Lacs', '5 - 10 Lacs', '10 - 20 Lacs', '20 Lacs+'] }
  ],
  education: [
    { value: 'intent', label: 'Enrollment Interest', defaultOptions: ['Yes', 'Get Info'] },
    { value: 'course', label: 'Course Category', defaultOptions: ['Coding', 'Web Development', 'AI & ML', 'Data Science'] },
    { value: 'study_mode', label: 'Study Mode', defaultOptions: ['Online', 'Offline', 'Hybrid'] },
    { value: 'subjects', label: 'Subjects of Interest', defaultOptions: ['React', 'Python', 'Machine Learning', 'UI/UX'] }
  ],
  internal_crm: [
    { value: 'intent', label: 'Vertical Intent', defaultOptions: ['Real Estate', 'Education', 'Automobile'] },
    { value: 'volume', label: 'Lead Volume', defaultOptions: ['< 100', '100-500', '500+'] },
    { value: 'demo', label: 'Demo Booking', defaultOptions: ['Yes, Schedule Demo', 'Send More Info', 'Not Now'] }
  ]
}

export function AiBotSettings() {
  const { data: company, isLoading: companyLoading } = useCurrentCompany()
  const industry = company?.industry || 'real_estate'

  const { data: customConfig, isLoading: configLoading } = useAiFlowConfig(industry)
  const saveMutation = useSaveAiFlowConfig()
  const resetMutation = useResetAiFlowConfig()

  // Dynamic values stored in DB
  const { data: properties = [] } = useProperties()
  const { data: vehicles = [] } = useVehicles()
  const { data: courses = [] } = useCourses()

  // Local state
  const [editedSteps, setEditedSteps] = useState<CustomStep[]>([])
  const [newButtonText, setNewButtonText] = useState<{ [step: number]: string }>({})
  const [selectedFieldForStep, setSelectedFieldForStep] = useState<{ [step: number]: string }>({})

  // Initialize selected field based on default step configs
  useEffect(() => {
    if (companyLoading || configLoading) return

    const defaults = getDefaultSteps(industry)
    const synced = defaults.map(dStep => {
      const custom = customConfig?.steps?.find(s => s.step === dStep.step)
      return {
        step: dStep.step,
        message: custom?.message !== undefined ? custom.message : dStep.message,
        buttons: custom?.buttons !== undefined ? custom.buttons : dStep.buttons,
      }
    })
    setEditedSteps(synced)

    // Setup initial fields select dropdown
    const initialFields: { [step: number]: string } = {}
    synced.forEach(s => {
      if (industry === 'real_estate') {
        if (s.step === 1) initialFields[s.step] = 'intent'
        else if (s.step === 2) initialFields[s.step] = 'property_type'
        else if (s.step === 3) initialFields[s.step] = 'budget'
        else if (s.step === 4) initialFields[s.step] = 'city'
      } else if (industry === 'automobile_dealers') {
        if (s.step === 1) initialFields[s.step] = 'intent'
        else if (s.step === 2) initialFields[s.step] = 'vehicle_type'
        else if (s.step === 3) initialFields[s.step] = 'brand'
        else if (s.step === 4) initialFields[s.step] = 'budget'
      } else if (industry === 'education') {
        if (s.step === 1) initialFields[s.step] = 'intent'
        else if (s.step === 2) initialFields[s.step] = 'course'
        else if (s.step === 3) initialFields[s.step] = 'study_mode'
        else if (s.step === 4) initialFields[s.step] = 'subjects'
      } else {
        if (s.step === 1) initialFields[s.step] = 'intent'
        else if (s.step === 2) initialFields[s.step] = 'volume'
        else if (s.step === 3) initialFields[s.step] = 'demo'
      }
    })
    setSelectedFieldForStep(initialFields)
  }, [customConfig, industry, companyLoading, configLoading])

  const handleMessageChange = (stepNum: number, newMessage: string) => {
    setEditedSteps(prev =>
      prev.map(s => (s.step === stepNum ? { ...s, message: newMessage } : s))
    )
  }

  const handleAddButton = (stepNum: number, label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return

    setEditedSteps(prev =>
      prev.map(s => {
        if (s.step !== stepNum) return s
        if (s.buttons.length >= 5) return s
        if (s.buttons.includes(trimmed)) return s
        return { ...s, buttons: [...s.buttons, trimmed] }
      })
    )
    setNewButtonText(prev => ({ ...prev, [stepNum]: '' }))
  }

  const handleRemoveButton = (stepNum: number, labelToRemove: string) => {
    setEditedSteps(prev =>
      prev.map(s => {
        if (s.step !== stepNum) return s
        return { ...s, buttons: s.buttons.filter(b => b !== labelToRemove) }
      })
    )
  }

  const handleSave = () => {
    saveMutation.mutate({
      industry,
      steps: editedSteps
    })
  }

  const handleReset = () => {
    resetMutation.mutate(industry)
  }

  if (companyLoading || configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Calculate dynamic pick lists from db based on selected capture field
  const getPickOptions = (stepNum: number): string[] => {
    const fieldType = selectedFieldForStep[stepNum]
    if (!fieldType) return []

    // Start with default values defined for this field
    const fieldConfig = FIELDS_PER_INDUSTRY[industry]?.find(f => f.value === fieldType)
    const defaults = fieldConfig?.defaultOptions || []

    // Fetch live items matching this schema type
    let liveValues: string[] = []
    if (industry === 'real_estate') {
      if (fieldType === 'property_type') {
        liveValues = properties.map(p => p.property_type).filter(Boolean) as string[]
      } else if (fieldType === 'city') {
        liveValues = properties.map(p => p.city).filter(Boolean) as string[]
      } else if (fieldType === 'bhk') {
        liveValues = properties.map(p => p.bhk).filter(Boolean) as string[]
      }
    } else if (industry === 'automobile_dealers') {
      if (fieldType === 'vehicle_type') {
        liveValues = vehicles.map((v: any) => v.vehicle_type).filter(Boolean) as string[]
      } else if (fieldType === 'brand') {
        liveValues = vehicles.map((v: any) => v.brand).filter(Boolean) as string[]
      }
    } else if (industry === 'education') {
      if (fieldType === 'course') {
        // Truncate course names to 3 words
        const names = courses.map(c => c.name).filter(Boolean) as string[]
        liveValues = names.map(str => {
          const w = str.split(/\s+/)
          return w.length <= 3 ? str : w.slice(0, 3).join(' ') + '...'
        })
      } else if (fieldType === 'study_mode') {
        liveValues = courses.map(c => c.course_type).filter(Boolean) as string[]
      } else if (fieldType === 'subjects') {
        liveValues = courses.flatMap(c => c.subjects_covered || []).filter(Boolean) as string[]
      }
    }

    // Merge default preset list + unique live values from actual DB listings
    return Array.from(new Set([...defaults, ...liveValues])).filter(Boolean)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Questions customize form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              AI Bot Questions
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Customize the questions your WhatsApp bot asks leads. Default questions are used until you save custom ones.
            </p>
          </div>

          {customConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {resetMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reset to Defaults
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {editedSteps.map(stepObj => {
            const label = STEP_LABELS[industry]?.[stepObj.step] || `Step ${stepObj.step}`
            const hasButtons = stepObj.buttons.length > 0
            const responseType = hasButtons ? 'options' : 'qna'

            const setResponseType = (type: 'qna' | 'options') => {
              if (type === 'qna') {
                setEditedSteps(prev =>
                  prev.map(s => (s.step === stepObj.step ? { ...s, buttons: [] } : s))
                )
              } else {
                // Initialize default options
                const defaultStep = getDefaultSteps(industry).find(s => s.step === stepObj.step)
                setEditedSteps(prev =>
                  prev.map(s =>
                    s.step === stepObj.step
                      ? { ...s, buttons: defaultStep?.buttons?.length ? defaultStep.buttons : ['Yes', 'No'] }
                      : s
                  )
                )
              }
            }

            const currentField = selectedFieldForStep[stepObj.step] || ''
            const pickOptions = getPickOptions(stepObj.step)

            return (
              <Card key={stepObj.step} className="border border-border/80 shadow-sm">
                <CardHeader className="py-4 bg-muted/20 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">
                      Step {stepObj.step}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-0.5 rounded-full">
                      {label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Q&A vs Options Choice */}
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        Response Type
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {responseType === 'options' ? 'Interactive buttons replies' : 'Records user typed message/number'}
                      </span>
                    </div>
                    <Select
                      value={responseType}
                      onValueChange={(val: 'qna' | 'options') => setResponseType(val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qna">Free Text Q&A (No Buttons)</SelectItem>
                        <SelectItem value="options">Quick Reply Buttons</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Question Message Body
                    </label>
                    <Textarea
                      value={stepObj.message}
                      onChange={e => handleMessageChange(stepObj.step, e.target.value)}
                      placeholder="Enter question text..."
                      className="min-h-[70px] resize-y text-sm"
                    />
                  </div>

                  {/* Pick and Add Option Mode */}
                  {responseType === 'options' && (
                    <div className="space-y-4 border-t pt-4">
                      {/* Pick Field Selector */}
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="space-y-0.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                            Field to Ask Client For
                          </label>
                          <span className="text-[10px] text-muted-foreground">
                            Choose matching data target
                          </span>
                        </div>
                        <Select
                          value={currentField}
                          onValueChange={(val) => {
                            setSelectedFieldForStep(prev => ({ ...prev, [stepObj.step]: val }))
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select target field" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELDS_PER_INDUSTRY[industry]?.map(f => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Display suggestions to "pick" and drop as buttons */}
                      {pickOptions.length > 0 && (
                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border border-border/80">
                          <span className="text-[11px] font-bold text-muted-foreground block">
                            💡 Available Values (Click to Add as Button):
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {pickOptions.map(opt => {
                              const alreadyAdded = stepObj.buttons.includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleAddButton(stepObj.step, opt)}
                                  disabled={alreadyAdded || stepObj.buttons.length >= 5}
                                  className={`px-2 py-0.5 text-[11px] rounded border transition-all flex items-center gap-1 ${
                                    alreadyAdded
                                      ? 'bg-muted text-muted-foreground/60 border-border/30 cursor-not-allowed'
                                      : 'bg-background hover:border-primary/50 text-foreground cursor-pointer'
                                  }`}
                                >
                                  <PlusCircle className="w-3 h-3 text-muted-foreground/80" />
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Active Buttons List */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                          Active Quick Reply Buttons (Max 3 for Meta, 5 total)
                        </label>
                        <div className="flex flex-wrap items-center gap-2 border border-input rounded-md p-2 bg-background/50 min-h-[42px]">
                          {stepObj.buttons.map(btn => (
                            <span
                              key={btn}
                              className="inline-flex items-center gap-1 text-xs bg-muted border text-muted-foreground pl-2.5 pr-1 py-1 rounded-full font-medium"
                            >
                              {btn}
                              <button
                                type="button"
                                onClick={() => handleRemoveButton(stepObj.step, btn)}
                                className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-muted-foreground/20 text-muted-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {stepObj.buttons.length < 5 && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <Input
                                placeholder="Custom label..."
                                value={newButtonText[stepObj.step] || ''}
                                onChange={e => {
                                  const val = e.target.value
                                  setNewButtonText(prev => ({ ...prev, [stepObj.step]: val }))
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddButton(stepObj.step, newButtonText[stepObj.step] || '')
                                  }
                                }}
                                className="h-7 w-28 text-xs font-medium"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAddButton(stepObj.step, newButtonText[stepObj.step] || '')}
                                className="h-7 w-7 border hover:bg-muted"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {responseType === 'qna' && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 p-3 rounded-md flex items-start gap-2">
                      <HelpCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <div>
                        <strong>Free Text Q&A reply format:</strong> Client will reply by typing their custom response. The AI matching system automatically processes text inputs for captures like budget, locations, or descriptions.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-5 font-semibold text-sm shadow-md"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Custom Questions
        </Button>
      </div>

      {/* Right Sidebar: Dynamic Directory */}
      <div className="space-y-6">
        {industry !== 'internal_crm' && (
          <Card className="border border-border/80">
            <CardHeader className="py-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                Live Catalog Directory
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time listings from Supabase database. These listings will immediately update here when you add new items.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto space-y-3">
              {/* Real Estate Listings */}
              {industry === 'real_estate' && (
                properties.length > 0 ? (
                  properties.map(p => (
                    <div key={p.id} className="border border-border/50 rounded-lg p-3 bg-muted/20 space-y-1 text-xs hover:border-primary/45 transition-all">
                      <div className="font-semibold text-foreground truncate">{p.title}</div>
                      <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                        <span className="bg-background px-1.5 py-0.5 border rounded">{p.property_type || 'Unknown Type'}</span>
                        {p.bhk && <span>{p.bhk} BHK</span>}
                        {p.city && <span>📍 {p.city}</span>}
                      </div>
                      {p.price && <div className="font-semibold text-primary">Budget: ₹{parseFloat(p.price).toLocaleString()}</div>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No properties found. Add listings to see them here.</p>
                )
              )}

              {/* Automobile Inventory */}
              {industry === 'automobile_dealers' && (
                vehicles.length > 0 ? (
                  vehicles.map((v: any) => (
                    <div key={v.id} className="border border-border/50 rounded-lg p-3 bg-muted/20 space-y-1 text-xs hover:border-primary/45 transition-all">
                      <div className="font-semibold text-foreground truncate">{v.brand} {v.model}</div>
                      <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                        <span className="bg-background px-1.5 py-0.5 border rounded uppercase text-[10px]">{v.vehicle_type}</span>
                        {v.fuel_type && <span>{v.fuel_type}</span>}
                        {v.transmission && <span>{v.transmission}</span>}
                      </div>
                      {v.price && <div className="font-semibold text-primary">Price: ₹{v.price.toLocaleString()}</div>}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No vehicles found. Add inventory to see them here.</p>
                )
              )}

              {/* Education Courses */}
              {industry === 'education' && (
                courses.length > 0 ? (
                  courses.map(c => (
                    <div key={c.id} className="border border-border/50 rounded-lg p-3 bg-muted/20 space-y-1 text-xs hover:border-primary/45 transition-all">
                      <div className="font-semibold text-foreground truncate">{c.name}</div>
                      <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                        <span className="bg-background px-1.5 py-0.5 border rounded uppercase text-[10px]">{c.course_type}</span>
                        {c.duration_months && <span>{c.duration_months} Months</span>}
                      </div>
                      {c.price && <div className="font-semibold text-primary">Fees: ₹{c.price}</div>}
                      {c.subjects_covered && c.subjects_covered.length > 0 && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          Syllabus: {c.subjects_covered.join(', ')}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No courses found. Add courses to see them here.</p>
                )
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
