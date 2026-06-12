import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateTemplate, useUpdateTemplate, WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';
import { toast } from 'sonner';
import {
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Plus,
  Trash2,
  HelpCircle,
  Eye,
  Info,
  Sparkles,
  Link,
  PhoneCall,
  MessageSquare,
  ArrowLeft,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateBuilderProps {
  initialTemplate?: WhatsAppTemplate | null;
  prefilledLibraryTemplate?: any | null;
  onBack: () => void;
  currentIndustry?: string;
}

const industryVariables: Record<string, string[]> = {
  real_estate: ['customer_name', 'project_name', 'location', 'price', 'brochure_link', 'date', 'time'],
  education: ['student_name', 'course_name', 'amount', 'date', 'time'],
  automobile: ['customer_name', 'vehicle_name', 'date', 'time'],
  general: ['customer_name', 'date', 'time']
};

const sampleValues: Record<string, string> = {
  customer_name: 'John Doe',
  student_name: 'Aditya Sharma',
  project_name: 'AiLeadX Greenwood',
  location: 'Sector 62, Gurgaon',
  price: '85,00,000',
  brochure_link: 'https://aileadx.com/brochure/greenwood',
  date: 'June 15, 2026',
  time: '11:30 AM',
  vehicle_name: 'Audi e-tron GT',
  course_name: 'AI & Data Science Masterclass',
  amount: '12,500'
};

export function TemplateBuilder({ initialTemplate, prefilledLibraryTemplate, onBack, currentIndustry }: TemplateBuilderProps) {
  const isEditing = !!initialTemplate;
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [content, setContent] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<any[]>([]);
  const [customVar, setCustomVar] = useState('');

  // Track cursor focus for variable insertions
  const [lastFocusedField, setLastFocusedField] = useState<'headerText' | 'content' | null>(null);
  const headerRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill state
  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.template_name);
      setCategory(initialTemplate.category);
      setLanguage(initialTemplate.language);
      setHeaderType(initialTemplate.header_type);
      setHeaderText(initialTemplate.header_text || '');
      setHeaderMediaUrl(initialTemplate.header_media_url || '');
      setContent(initialTemplate.content);
      setFooterText(initialTemplate.footer_text || '');
      setButtons(initialTemplate.buttons || []);
    } else if (prefilledLibraryTemplate) {
      setName(prefilledLibraryTemplate.name || '');
      setCategory(prefilledLibraryTemplate.category || 'MARKETING');
      setLanguage(prefilledLibraryTemplate.language || 'en_US');
      setHeaderType(prefilledLibraryTemplate.headerType || 'NONE');
      setHeaderText(prefilledLibraryTemplate.headerText || '');
      setHeaderMediaUrl(prefilledLibraryTemplate.headerMediaUrl || '');
      setContent(prefilledLibraryTemplate.content || '');
      setFooterText(prefilledLibraryTemplate.footerText || '');
      setButtons(prefilledLibraryTemplate.buttons || []);
    }
  }, [initialTemplate, prefilledLibraryTemplate]);

  // Dynamic preview helper: replaces {{var_name}} with dummy data or variable label
  const getPreviewText = (text: string) => {
    if (!text) return '';
    return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
      return sampleValues[varName] ? `[${sampleValues[varName]}]` : `[${varName}]`;
    });
  };

  // Variable insertion handler
  const insertVariable = (varName: string) => {
    const field = lastFocusedField;
    const cleanVar = `{{${varName}}}`;

    if (field === 'headerText') {
      const input = headerRef.current;
      if (!input) return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const val = headerText;
      const newVal = val.substring(0, start) + cleanVar + val.substring(end);
      setHeaderText(newVal);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + cleanVar.length, start + cleanVar.length);
      }, 0);
    } else if (field === 'content' || !field) {
      const textarea = bodyRef.current;
      if (!textarea) {
        // Default insert to body
        setContent(prev => prev + cleanVar);
        return;
      }
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? 0;
      const val = content;
      const newVal = val.substring(0, start) + cleanVar + val.substring(end);
      setContent(newVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + cleanVar.length, start + cleanVar.length);
      }, 0);
    }
  };

  const handleAddCustomVar = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = customVar.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!formatted) return;
    insertVariable(formatted);
    setCustomVar('');
  };

  // Buttons management
  const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') => {
    const quickReplies = buttons.filter(b => b.type === 'QUICK_REPLY');
    const ctas = buttons.filter(b => b.type === 'URL' || b.type === 'PHONE_NUMBER');

    if (type === 'QUICK_REPLY') {
      if (quickReplies.length >= 3) {
        toast.error('Maximum of 3 Quick Reply buttons allowed.');
        return;
      }
      if (ctas.length > 0) {
        toast.error('Cannot mix Quick Reply and Call to Action buttons.');
        return;
      }
      setButtons(prev => [...prev, { type: 'QUICK_REPLY', text: 'Quick Action' }]);
    } else {
      if (ctas.length >= 2) {
        toast.error('Maximum of 2 Call-to-Action buttons allowed.');
        return;
      }
      if (quickReplies.length > 0) {
        toast.error('Cannot mix Call to Action and Quick Reply buttons.');
        return;
      }
      if (type === 'URL') {
        setButtons(prev => [...prev, { type: 'URL', text: 'Visit Website', url: 'https://' }]);
      } else {
        setButtons(prev => [...prev, { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '+91' }]);
      }
    }
  };

  const removeButton = (idx: number) => {
    setButtons(prev => prev.filter((_, i) => i !== idx));
  };

  const updateButtonField = (idx: number, fieldName: string, value: string) => {
    setButtons(prev => prev.map((btn, i) => {
      if (i === idx) {
        return { ...btn, [fieldName]: value };
      }
      return btn;
    }));
  };

  // Form saving handler
  const handleSave = async (submitAfterSave = false) => {
    // 1. Validation checks
    if (!name.trim()) {
      toast.error('Template name is required.');
      return;
    }
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      toast.error('Template name must contain only lowercase alphanumeric characters and underscores (e.g. site_visit_rem).');
      return;
    }

    if (!content.trim()) {
      toast.error('Body content is required.');
      return;
    }

    if (headerType === 'TEXT' && headerText.length > 60) {
      toast.error('Header text must not exceed 60 characters.');
      return;
    }

    if (content.length > 1024) {
      toast.error('Body content must not exceed 1024 characters.');
      return;
    }

    if (footerText.length > 60) {
      toast.error('Footer text must not exceed 60 characters.');
      return;
    }

    // Buttons validation
    for (const btn of buttons) {
      if (!btn.text.trim()) {
        toast.error('All button texts must be configured.');
        return;
      }
      if (btn.text.length > 25) {
        toast.error('Button text must not exceed 25 characters.');
        return;
      }
      if (btn.type === 'URL' && (!btn.url || !btn.url.startsWith('http'))) {
        toast.error('All URL buttons must have a valid URL starting with http:// or https://');
        return;
      }
      if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) {
        toast.error('All Phone Number buttons must have a phone number configured.');
        return;
      }
    }

    const payload = {
      templateName: name,
      category,
      language,
      content,
      headerType,
      headerText: headerType === 'TEXT' ? headerText : undefined,
      headerMediaUrl: ['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerType) ? headerMediaUrl : undefined,
      footerText: footerText || undefined,
      buttons
    };

    try {
      let savedTemplate: WhatsAppTemplate;

      if (isEditing && initialTemplate) {
        savedTemplate = await updateMutation.mutateAsync({
          id: initialTemplate.id,
          ...payload
        });
        toast.success('Template updated successfully as draft!');
      } else {
        savedTemplate = await createMutation.mutateAsync(payload);
        toast.success('Template created successfully as draft!');
      }

      if (submitAfterSave && savedTemplate) {
        // Call submit mutation
        toast.loading('Submitting template to Meta review...', { id: 'submit-meta' });
        
        // Simulating or calling edge function via useSubmitTemplate equivalent
        const { data, error } = await supabase.functions.invoke('whatsapp-templates/submit', {
          method: 'POST',
          body: { templateId: savedTemplate.id }
        });

        if (error) {
          toast.error(`Meta submission failed: ${error.message || error}`, { id: 'submit-meta' });
        } else {
          toast.success('Template submitted to Meta successfully! Status: Pending review', { id: 'submit-meta' });
          onBack();
        }
      } else {
        onBack();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template draft.');
    }
  };

  // Get current industry variables
  const resolvedIndustry =
    currentIndustry === 'education'
      ? 'education'
      : currentIndustry === 'automobile_dealers'
      ? 'automobile'
      : 'real_estate';
  const variableOptions = industryVariables[resolvedIndustry] || industryVariables.general;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isEditing ? `Edit Template: ${name}` : 'Create WhatsApp Template'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Design drafts and submit review requests directly to Meta WhatsApp Business.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="card-elevated border-0 relative overflow-hidden">
            <div className="h-1.5 w-full bg-primary absolute top-0 left-0" />
            <CardHeader className="pt-6 pb-4">
              <CardTitle className="text-base font-bold">Template Configurations</CardTitle>
              <CardDescription className="text-xs">Define header formats, text parameters, buttons, and variables.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Template Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name" className="text-xs font-semibold">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isEditing}
                    placeholder="e.g., pricing_drop_alert"
                    className="text-xs font-medium"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Lowercase, numbers, and underscores only. Locked once created.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-semibold">Category *</Label>
                  <Select
                    value={category}
                    onValueChange={(val: any) => setCategory(val)}
                  >
                    <SelectTrigger id="category" className="text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing (Offers, Launches)</SelectItem>
                      <SelectItem value="UTILITY">Utility (Reminders, Updates)</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication (OTPs, Security)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language" className="text-xs font-semibold">Language *</Label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                >
                  <SelectTrigger id="language" className="text-xs">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="en_GB">English (UK)</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Header Configuration */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary">Header Section</Label>
                <div className="space-y-2">
                  <Label htmlFor="header-type" className="text-xs font-semibold">Header Type</Label>
                  <Select
                    value={headerType}
                    onValueChange={(val: any) => {
                      setHeaderType(val);
                      setHeaderText('');
                      setHeaderMediaUrl('');
                    }}
                  >
                    <SelectTrigger id="header-type" className="text-xs">
                      <SelectValue placeholder="Select Header Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="TEXT">Text Message Header</SelectItem>
                      <SelectItem value="IMAGE">Image Media Header</SelectItem>
                      <SelectItem value="DOCUMENT">Document (PDF) Header</SelectItem>
                      <SelectItem value="VIDEO">Video Media Header</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* TEXT Header Fields */}
                {headerType === 'TEXT' && (
                  <div className="space-y-2 pt-2 animate-scale-in">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="header-text" className="text-xs font-semibold">Header Text</Label>
                      <span className="text-[10px] text-muted-foreground">{headerText.length}/60 chars</span>
                    </div>
                    <div className="relative">
                      <Input
                        ref={headerRef}
                        id="header-text"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        onFocus={() => setLastFocusedField('headerText')}
                        placeholder="e.g., Exclusive Project Pre-Launch 🚀"
                        maxLength={60}
                        className="text-xs font-medium pr-10"
                      />
                    </div>
                  </div>
                )}

                {/* MEDIA Header Fields */}
                {['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerType) && (
                  <div className="space-y-2 pt-2 animate-scale-in">
                    <Label htmlFor="header-media" className="text-xs font-semibold">Sample Media / URL</Label>
                    <Input
                      id="header-media"
                      value={headerMediaUrl}
                      onChange={(e) => setHeaderMediaUrl(e.target.value)}
                      placeholder="e.g., https://aileadx.com/images/banner.jpg"
                      className="text-xs font-medium"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Attach a default link to show in previews and verify file extensions.
                    </p>
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <div className="flex justify-between items-center">
                  <Label htmlFor="body-content" className="text-xs font-bold uppercase tracking-wider text-primary">Body Content *</Label>
                  <span className="text-[10px] text-muted-foreground">{content.length}/1024 chars</span>
                </div>
                
                {/* Variable Selector Panel */}
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-secondary/30 border border-border/70 mb-2">
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center mr-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary mr-1" /> Variable Picker:
                  </span>
                  {variableOptions.map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(v)}
                      className="h-6 text-[10px] px-2 font-mono font-bold hover:bg-primary/5 hover:text-primary hover:border-primary/50"
                    >
                      {`+ {{${v}}}`}
                    </Button>
                  ))}
                  
                  {/* Custom Variable Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 hover:bg-primary/5 border-dashed"
                      >
                        + Custom Var
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-3 w-56">
                      <form onSubmit={handleAddCustomVar} className="space-y-2">
                        <Label className="text-[10px] font-bold">Custom Variable Name</Label>
                        <Input
                          value={customVar}
                          onChange={(e) => setCustomVar(e.target.value)}
                          placeholder="e.g., voucher_code"
                          className="h-8 text-xs font-medium"
                        />
                        <Button type="submit" size="sm" className="w-full text-xs h-7">
                          Insert Variable
                        </Button>
                      </form>
                    </PopoverContent>
                  </Popover>
                </div>

                <Textarea
                  ref={bodyRef}
                  id="body-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setLastFocusedField('content')}
                  placeholder="Type your message here. Wrap parameters in curly brackets, like {{customer_name}}..."
                  rows={6}
                  maxLength={1024}
                  className="text-xs font-medium leading-relaxed"
                />
              </div>

              {/* Footer Text */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <div className="flex justify-between items-center">
                  <Label htmlFor="footer-text" className="text-xs font-semibold">Footer Text</Label>
                  <span className="text-[10px] text-muted-foreground">{footerText.length}/60 chars</span>
                </div>
                <Input
                  id="footer-text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g., Reply STOP to opt-out"
                  maxLength={60}
                  className="text-xs font-medium"
                />
              </div>

              {/* Buttons Configurations */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-primary">Interactive Buttons</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addButton('QUICK_REPLY')}
                      className="h-7 text-[10px] font-semibold"
                    >
                      <MessageSquare className="w-3 h-3 mr-1" />
                      + Quick Reply
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addButton('URL')}
                      className="h-7 text-[10px] font-semibold"
                    >
                      <Link className="w-3 h-3 mr-1" />
                      + URL Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addButton('PHONE_NUMBER')}
                      className="h-7 text-[10px] font-semibold"
                    >
                      <PhoneCall className="w-3 h-3 mr-1" />
                      + Phone CTA
                    </Button>
                  </div>
                </div>

                {buttons.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="flex gap-3 items-end p-3 rounded-lg bg-secondary/40 border border-border/60 animate-scale-in">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Button #{idx + 1} - {btn.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{btn.text?.length || 0}/25 chars</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold">Button Label *</Label>
                              <Input
                                value={btn.text}
                                onChange={(e) => updateButtonField(idx, 'text', e.target.value)}
                                placeholder="Label text"
                                maxLength={25}
                                className="h-8 text-xs font-medium"
                              />
                            </div>
                            
                            {btn.type === 'URL' && (
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold">Destination URL *</Label>
                                <Input
                                  value={btn.url || ''}
                                  onChange={(e) => updateButtonField(idx, 'url', e.target.value)}
                                  placeholder="https://..."
                                  className="h-8 text-xs font-medium"
                                />
                              </div>
                            )}

                            {btn.type === 'PHONE_NUMBER' && (
                              <div className="space-y-1">
                                <Label className="text-[10px] font-semibold">Phone Number *</Label>
                                <Input
                                  value={btn.phone_number || ''}
                                  onChange={(e) => updateButtonField(idx, 'phone_number', e.target.value)}
                                  placeholder="e.g. +919999999999"
                                  className="h-8 text-xs font-medium"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeButton(idx)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic text-center py-4">
                    No interactive buttons configured yet.
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-3 border-t border-border/50 pt-4 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 text-xs font-semibold h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 text-xs font-semibold h-9"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => handleSave(true)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 gradient-primary border-0 text-xs font-semibold h-9"
              >
                Submit To Meta
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <Card className="card-elevated border-0 overflow-hidden relative bg-slate-900 border-slate-800">
            {/* Background design */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
            
            <CardHeader className="pt-6 pb-2 border-b border-slate-800 relative z-10">
              <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                Live WhatsApp Chat Preview
              </CardTitle>
              <CardDescription className="text-slate-400 text-[10px]">
                Pixel-perfect display of your message structure on user devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 relative z-10">
              {/* WhatsApp Chat Container */}
              <div 
                className="rounded-xl p-4 min-h-[300px] flex flex-col justify-end bg-repeat" 
                style={{ 
                  backgroundColor: '#0b141a', 
                  backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                  backgroundSize: '360px',
                  backgroundBlendMode: 'overlay',
                  opacity: 0.95
                }}
              >
                {/* Chat Bubble */}
                <div className="bg-[#1f2c34] text-slate-100 max-w-[85%] rounded-lg rounded-tl-none p-3 shadow-md relative group select-none">
                  {/* Left pointing arrow */}
                  <div className="absolute top-0 -left-2 w-0 h-0 border-t-[8px] border-t-[#1f2c34] border-l-[8px] border-l-transparent border-r-[8px] border-r-[#1f2c34] filter drop-shadow(0 1px 1px rgba(0,0,0,0.15))" />
                  
                  {/* Header Preview */}
                  {headerType === 'TEXT' && headerText && (
                    <div className="font-bold text-slate-100 text-[13px] mb-1.5 leading-snug break-words">
                      {getPreviewText(headerText)}
                    </div>
                  )}

                  {['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerType) && (
                    <div className="bg-[#101d25] rounded-md border border-slate-800 p-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs mb-2 min-h-[120px] aspect-video">
                      {headerType === 'IMAGE' && <ImageIcon className="w-8 h-8 text-emerald-500" />}
                      {headerType === 'VIDEO' && <VideoIcon className="w-8 h-8 text-emerald-500" />}
                      {headerType === 'DOCUMENT' && <FileText className="w-8 h-8 text-emerald-500" />}
                      <span className="text-[10px] font-semibold tracking-wide uppercase text-slate-400">
                        {headerType} PREVIEW
                      </span>
                      {headerMediaUrl && (
                        <span className="text-[9px] text-slate-500 max-w-full truncate px-4">
                          {headerMediaUrl}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Body Preview */}
                  <div className="text-[12.5px] leading-relaxed break-words whitespace-pre-wrap font-normal text-[#e9edef]">
                    {content ? getPreviewText(content) : <span className="text-slate-500 italic">Body content...</span>}
                  </div>

                  {/* Footer Preview */}
                  {footerText && (
                    <div className="text-[10px] text-slate-400 mt-1.5 font-normal leading-normal">
                      {footerText}
                    </div>
                  )}

                  {/* Timestamp & Sent status */}
                  <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-slate-400 font-normal">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-sky-400">✓✓</span>
                  </div>
                </div>

                {/* Buttons Preview beneath bubble */}
                {buttons.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 max-w-[85%] self-start w-full">
                    {buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="bg-[#1f2c34] hover:bg-[#2a3942] text-[#00a884] text-[12.5px] font-semibold h-9 rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer border-t border-slate-800/40 select-none active:scale-[0.99] transition-all"
                      >
                        {btn.type === 'URL' && <Link className="w-3.5 h-3.5" />}
                        {btn.type === 'PHONE_NUMBER' && <PhoneCall className="w-3.5 h-3.5" />}
                        {btn.type === 'QUICK_REPLY' && <MessageSquare className="w-3.5 h-3.5" />}
                        <span>{btn.text || 'Action Button'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Guidelines / Tips Card */}
          <Card className="bg-slate-900/60 border-slate-800 p-4">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-primary" />
              Meta Submission Tips
            </h4>
            <ul className="space-y-1.5 text-[10px] text-slate-400 leading-normal pl-4 list-disc font-medium">
              <li>Templates are usually reviewed automatically in 2 minutes, but can take up to 24 hours.</li>
              <li>Avoid promotional language in <strong>Utility</strong> or <strong>Authentication</strong> templates, or Meta will reject or enforce a fee upgrade to <strong>Marketing</strong>.</li>
              <li>Include sample values for variables in your media headers so reviewer bots can understand context.</li>
              <li>Ensure template names have no spaces or capital letters (e.g. use `visit_details` instead of `VisitDetails`).</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
