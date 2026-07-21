import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowRight, RefreshCw, HelpCircle, Save } from 'lucide-react';

interface BotQuestion {
    id?: string;
    step_number: number;
    question_text: string;
    buttons: string[];
    button_payloads: string[];
    keyword_key: string;
    next_step: number;
}

// System defaults
const DEFAULT_QUESTIONS: Record<string, Omit<BotQuestion, 'id'>[]> = {
    automobile_dealers: [
        {
            step_number: 1,
            question_text: "Welcome to our Automobile services! Are you looking to Buy or Service a vehicle?",
            buttons: ["Buy", "Service"],
            button_payloads: ["buy", "service"],
            keyword_key: "purpose",
            next_step: 2
        },
        {
            step_number: 2,
            question_text: "What type of vehicle are you interested in?",
            buttons: ["Car", "Bike", "Used Car", "Used Bike"],
            button_payloads: ["car", "bike", "used_car", "used_bike"],
            keyword_key: "vehicle_type",
            next_step: 3
        },
        {
            step_number: 3,
            question_text: "What's your preferred brand?",
            buttons: [],
            button_payloads: [],
            keyword_key: "brand",
            next_step: 4
        },
        {
            step_number: 4,
            question_text: "What's your budget range?",
            buttons: [],
            button_payloads: [],
            keyword_key: "budget",
            next_step: 5
        },
        {
            step_number: 5,
            question_text: "Thank you for your interest! Our team will contact you shortly with the best vehicle options matching your preferences.",
            buttons: [],
            button_payloads: [],
            keyword_key: "none",
            next_step: 0
        }
    ],
    education: [
        {
            step_number: 1,
            question_text: "Welcome to our Education services! Are you interested in enrolling in a course?",
            buttons: ["Yes", "Get Info"],
            button_payloads: ["yes", "info"],
            keyword_key: "interest",
            next_step: 2
        },
        {
            step_number: 2,
            question_text: "Which field are you interested in?",
            buttons: ["Coding", "Web Development", "AI & ML", "Data Science"],
            button_payloads: ["coding", "web_development", "ai_ml", "data_science"],
            keyword_key: "course",
            next_step: 3
        },
        {
            step_number: 3,
            question_text: "What Course Type do you prefer?",
            buttons: ["Online", "Offline", "Hybrid"],
            button_payloads: ["online", "offline", "hybrid"],
            keyword_key: "study_mode",
            next_step: 4
        },
        {
            step_number: 4,
            question_text: "Which subjects are you interested in? (e.g. Python, React, Machine Learning, UI/UX)",
            buttons: [],
            button_payloads: [],
            keyword_key: "subjects_interest",
            next_step: 5
        },
        {
            step_number: 5,
            question_text: "Thank you for your interest! Our counselors will contact you shortly with detailed course information.",
            buttons: [],
            button_payloads: [],
            keyword_key: "none",
            next_step: 0
        }
    ],
    real_estate: [
        {
            step_number: 1,
            question_text: "Welcome to our Real Estate services! Are you looking to Buy or Rent a property?",
            buttons: ["Buy", "Rent"],
            button_payloads: ["buy", "rent"],
            keyword_key: "purpose",
            next_step: 2
        },
        {
            step_number: 2,
            question_text: "Great! What type of property are you interested in?",
            buttons: ["Apartment", "Villa", "Plot", "Commercial"],
            button_payloads: ["apartment", "villa", "plot", "commercial"],
            keyword_key: "property_type",
            next_step: 3
        },
        {
            step_number: 3,
            question_text: "What's your budget?",
            buttons: [],
            button_payloads: [],
            keyword_key: "budget",
            next_step: 4
        },
        {
            step_number: 4,
            question_text: "What is your preferred location?",
            buttons: [],
            button_payloads: [],
            keyword_key: "location",
            next_step: 5
        },
        {
            step_number: 5,
            question_text: "Thank you for providing your requirements! Our team will contact you shortly with the best property options matching your criteria.",
            buttons: [],
            button_payloads: [],
            keyword_key: "none",
            next_step: 0
        }
    ]
};

const INDUSTRY_KEYWORDS: Record<string, { key: string; label: string; desc: string }[]> = {
    real_estate: [
        { key: 'purpose', label: 'Purpose', desc: 'Rent/Buy intent' },
        { key: 'property_type', label: 'Property Type', desc: 'Apartment, Villa, Plot, Commercial' },
        { key: 'budget', label: 'Budget', desc: 'Pricing preferences' },
        { key: 'location', label: 'Location', desc: 'Preferred area or city' },
        { key: 'none', label: 'None', desc: 'No keyword matching needed (e.g. final step)' }
    ],
    education: [
        { key: 'interest', label: 'Enrollment Interest', desc: 'Yes/No enrollment intent' },
        { key: 'course', label: 'Course Category', desc: 'Coding, Web Dev, AI/ML' },
        { key: 'study_mode', label: 'Study Mode', desc: 'Online, Offline, Hybrid' },
        { key: 'subjects_interest', label: 'Subjects of Interest', desc: 'Python, React, etc.' },
        { key: 'none', label: 'None', desc: 'No keyword matching needed (e.g. final step)' }
    ],
    automobile_dealers: [
        { key: 'purpose', label: 'Purpose', desc: 'Buy/Service intent' },
        { key: 'vehicle_type', label: 'Vehicle Type', desc: 'Car, Bike, Used Car, etc.' },
        { key: 'brand', label: 'Preferred Brand', desc: 'Toyota, Honda, Suzuki' },
        { key: 'budget', label: 'Budget', desc: 'Price limit' },
        { key: 'none', label: 'None', desc: 'No keyword matching needed (e.g. final step)' }
    ]
};

export function BotQuestionsView() {
    const { data: company, isLoading: companyLoading } = useCurrentCompany();
    const [questions, setQuestions] = useState<BotQuestion[]>([]);
    const [isCustom, setIsCustom] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const industry = company?.industry === 'education' ? 'education' :
        company?.industry === 'automobile_dealers' ? 'automobile_dealers' : 'real_estate';

    const keywords = INDUSTRY_KEYWORDS[industry] || INDUSTRY_KEYWORDS.real_estate;
    const defaultList = DEFAULT_QUESTIONS[industry] || DEFAULT_QUESTIONS.real_estate;

    useEffect(() => {
        if (company?.id) {
            loadBotQuestions();
        }
    }, [company?.id, industry]);

    const loadBotQuestions = async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase
                .from('whatsapp_bot_questions' as any)
                .select('*')
                .eq('company_id', company!.id)
                .order('step_number', { ascending: true }) as any);

            if (error) throw error;

            if (data && data.length > 0) {
                setQuestions(data as BotQuestion[]);
                setIsCustom(true);
            } else {
                // Load default values into view (but not saved to DB yet)
                setQuestions(defaultList.map((q, idx) => ({ ...q, id: `default-${idx}` })));
                setIsCustom(false);
            }
        } catch (err: any) {
            console.error('Error loading bot questions:', err);
            toast.error('Failed to load bot questions');
        } finally {
            setLoading(false);
        }
    };

    const handleCustomize = () => {
        setIsCustom(true);
        // Convert default keys to pure list ready for saving (strip fake ids)
        setQuestions(prev => prev.map(q => ({
            ...q,
            id: undefined
        })));
        toast.success('Customize mode active! Make your changes and click Save.');
    };

    const handleResetToDefault = async () => {
        if (window.confirm('Are you sure you want to restore default questions? This will delete your custom configuration.')) {
            try {
                setSaving(true);
                const { error } = await (supabase
                    .from('whatsapp_bot_questions' as any)
                    .delete()
                    .eq('company_id', company!.id) as any);

                if (error) throw error;

                setIsCustom(false);
                setQuestions(defaultList.map((q, idx) => ({ ...q, id: `default-${idx}` })));
                toast.success('Successfully restored default questions.');
            } catch (err: any) {
                console.error('Error deleting custom questions:', err);
                toast.error('Failed to restore defaults');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleAddStep = () => {
        const nextStepNum = questions.length + 1;
        const newStep: BotQuestion = {
            step_number: nextStepNum,
            question_text: '',
            buttons: [],
            button_payloads: [],
            keyword_key: 'none',
            next_step: 0
        };

        // Update previous step's next_step pointer to point to this new step
        const updated = [...questions];
        if (updated.length > 0) {
            updated[updated.length - 1].next_step = nextStepNum;
        }
        setQuestions([...updated, newStep]);
    };

    const handleDeleteStep = (index: number) => {
        const updated = questions.filter((_, i) => i !== index);

        // Recalculate step numbers and next step pointers sequentially
        const recalculated = updated.map((q, i) => {
            const step_number = i + 1;
            const isLast = i === updated.length - 1;
            return {
                ...q,
                step_number,
                next_step: isLast ? 0 : step_number + 1
            };
        });

        setQuestions(recalculated);
    };

    const handleUpdateField = (index: number, field: keyof BotQuestion, value: any) => {
        const updated = [...questions];
        updated[index] = {
            ...updated[index],
            [field]: value
        };
        setQuestions(updated);
    };

    const handleSave = async () => {
        // Validate
        const invalid = questions.some(q => !q.question_text.trim());
        if (invalid) {
            toast.error('Please enter question text for all steps.');
            return;
        }

        try {
            setSaving(true);
            // Delete existing
            await (supabase
                .from('whatsapp_bot_questions' as any)
                .delete()
                .eq('company_id', company!.id) as any);

            // Insert new
            const payload = questions.map((q) => ({
                company_id: company!.id,
                step_number: q.step_number,
                question_text: q.question_text,
                buttons: q.buttons || [],
                button_payloads: q.button_payloads || [],
                keyword_key: q.keyword_key,
                next_step: q.next_step
            }));

            const { error } = await (supabase
                .from('whatsapp_bot_questions' as any)
                .insert(payload) as any);

            if (error) throw error;

            setIsCustom(true);
            toast.success('Successfully saved custom bot questions!');
            loadBotQuestions();
        } catch (err: any) {
            console.error('Error saving bot questions:', err);
            toast.error('Failed to save questions.');
        } finally {
            setSaving(false);
        }
    };

    if (companyLoading || loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">WhatsApp Bot Configuration</h2>
                    <p className="text-muted-foreground">
                        Configure the automated lead qualification questions asked by your WhatsApp bot.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!isCustom ? (
                        <Button onClick={handleCustomize} className="gap-2">
                            <RefreshCw className="h-4 w-4" /> Customize Questions
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleResetToDefault} disabled={saving} className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" /> Restore Defaults
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Keywords Hint Box */}
            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        Keywords Guide ({industry.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Industry)
                    </CardTitle>
                    <CardDescription>
                        Map each question to a keyword key so the AI match engine knows how to process and filter answers against your listings database.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {keywords.map(kw => (
                            <div key={kw.key} className="bg-card p-3 rounded-lg border text-xs space-y-1">
                                <code className="font-semibold text-primary">{kw.key}</code>
                                <div className="font-medium text-card-foreground">{kw.label}</div>
                                <div className="text-muted-foreground leading-tight">{kw.desc}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Questions list */}
            <div className="space-y-4">
                {questions.map((question, index) => {
                    const isLast = index === questions.length - 1;
                    return (
                        <Card key={question.id || question.step_number} className="relative overflow-hidden group">
                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" />
                            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span className="flex items-center justify-center bg-primary/10 text-primary w-6 h-6 rounded-full text-xs font-bold">
                                            {question.step_number}
                                        </span>
                                        Step {question.step_number}
                                    </CardTitle>
                                    <CardDescription>
                                        {question.next_step > 0 ? (
                                            <span className="flex items-center gap-1 text-xs">
                                                Transitions to Step {question.next_step} <ArrowRight className="h-3 w-3" />
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold text-emerald-600">Final Step / Completed</span>
                                        )}
                                    </CardDescription>
                                </div>
                                {isCustom && questions.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteStep(index)}
                                        className="text-destructive opacity-80 hover:opacity-100 hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Question Text / Message Body</label>
                                    <Input
                                        value={question.question_text}
                                        onChange={(e) => handleUpdateField(index, 'question_text', e.target.value)}
                                        placeholder="Enter the message sent to the WhatsApp user..."
                                        disabled={!isCustom}
                                        className="bg-card text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Select Keyword */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Extract & Save Answer to Keyword</label>
                                        <Select
                                            value={question.keyword_key}
                                            onValueChange={(val) => handleUpdateField(index, 'keyword_key', val)}
                                            disabled={!isCustom}
                                        >
                                            <SelectTrigger className="w-full bg-card">
                                                <SelectValue placeholder="Select keyword mapping" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {keywords.map(kw => (
                                                    <SelectItem key={kw.key} value={kw.key}>
                                                        {kw.label} ({kw.key})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Buttons / Options */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Button Options (Comma-separated, optional)
                                        </label>
                                        <Input
                                            value={question.buttons.join(', ')}
                                            onChange={(e) => {
                                                const btns = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                const payloads = btns.map(s => s.toLowerCase().replace(/\s+/g, '_'));
                                                handleUpdateField(index, 'buttons', btns);
                                                handleUpdateField(index, 'button_payloads', payloads);
                                            }}
                                            placeholder="e.g. Buy, Rent, Get Info"
                                            disabled={!isCustom}
                                            className="bg-card text-sm"
                                        />
                                        {question.buttons.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {question.buttons.map((btn, bIdx) => (
                                                    <span key={bIdx} className="bg-muted px-2 py-0.5 rounded text-xs text-muted-foreground font-medium">
                                                        {btn}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {isCustom && (
                <Button onClick={handleAddStep} variant="outline" className="w-full border-dashed py-6 gap-2">
                    <Plus className="h-4 w-4" /> Add New Custom Question Step
                </Button>
            )}
        </div>
    );
}
