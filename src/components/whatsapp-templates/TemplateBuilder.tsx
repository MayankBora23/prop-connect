import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Trash2, Plus, Sparkles, Smartphone, ImageIcon, Video, FileText, CheckCircle, X, Loader2 } from 'lucide-react';
import { useCreateTemplate, useUpdateTemplate, useSubmitTemplate, WhatsAppTemplate, TemplateButton } from '@/hooks/useWhatsAppTemplates';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { useCurrentCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { uploadTemplateMedia } from '@/lib/imageUpload';

const INDUSTRY_VARIABLES: Record<string, { label: string; value: string }[]> = {
  real_estate: [
    { label: 'Customer Name', value: 'customer_name' },
    { label: 'Project Name', value: 'project_name' },
    { label: 'Location', value: 'location' },
    { label: 'Price', value: 'price' },
    { label: 'Date', value: 'date' },
    { label: 'Time', value: 'time' },
    { label: 'Brochure Link', value: 'brochure_link' },
  ],
  education: [
    { label: 'Student Name', value: 'student_name' },
    { label: 'Course Name', value: 'course_name' },
    { label: 'Batch Name', value: 'batch_name' },
    { label: 'Amount (₹)', value: 'amount' },
    { label: 'Date', value: 'date' },
    { label: 'Time', value: 'time' },
    { label: 'Teacher Name', value: 'teacher_name' },
  ],
  automobile_dealers: [
    { label: 'Customer Name', value: 'customer_name' },
    { label: 'Vehicle Name', value: 'vehicle_name' },
    { label: 'Date', value: 'date' },
    { label: 'Time', value: 'time' },
    { label: 'Showroom Name', value: 'showroom_name' },
    { label: 'Offer Amount', value: 'offer_amount' },
  ],
  internal_crm: [
    { label: 'Company Name', value: 'company_name' },
    { label: 'Contact Name', value: 'contact_name' },
    { label: 'Date', value: 'date' },
    { label: 'Plan Name', value: 'plan_name' },
  ],
};

// Fallback to real_estate if industry not matched
function getIndustryVars(industry: string | null | undefined) {
  return INDUSTRY_VARIABLES[industry ?? ''] ?? INDUSTRY_VARIABLES['real_estate'];
}

const buttonSchema = z.object({
  type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
  text: z.string().min(1, 'Button text is required').max(25, 'Max 25 characters'),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal(''))
});

const templateFormSchema = z.object({
  template_name: z
    .string()
    .min(1, 'Template name is required')
    .refine((val) => /^[a-z_]+$/.test(val), {
      message: 'Name must be lowercase and contain underscores instead of spaces'
    }),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  language: z.string().min(1, 'Language code is required'),
  header_type: z.enum(['none', 'text', 'image', 'document', 'video']),
  header_text: z.string().max(60, 'Header text cannot exceed 60 characters').optional(),
  body_text: z.string().min(1, 'Body text is required').max(1024, 'Body text cannot exceed 1024 characters'),
  footer_text: z.string().optional(),
  buttons: z.array(buttonSchema).max(3, 'Maximum of 3 buttons allowed'),
  header_media_url: z.string().url('Must be a valid URL').optional().or(z.literal('')).or(z.null()),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateBuilderProps {
  onBack: () => void;
  initialData?: WhatsAppTemplate | null;
}

export function TemplateBuilder({ onBack, initialData }: TemplateBuilderProps) {
  const { data: profile } = useCurrentProfile();
  const { data: company } = useCurrentCompany();
  const isAdminOrManager = ['super_admin', 'admin', 'manager'].includes(profile?.role || '');

  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const submitTemplateMutation = useSubmitTemplate();

  const [bodyTextVal, setBodyTextVal] = useState(initialData?.body_text || '');
  const [mediaUploading, setMediaUploading] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUploading(true);
    try {
      const result = await uploadTemplateMedia(file, headerType as 'image'|'video'|'document');
      form.setValue('header_media_url', result.url, { shouldValidate: true });
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setMediaUploading(false);
    }
  };

  const defaultValues: Partial<TemplateFormValues> = {
    template_name: initialData?.template_name || '',
    category: initialData?.category || 'MARKETING',
    language: initialData?.language || 'en',
    header_type: initialData?.header_type || 'none',
    header_text: initialData?.header_text || '',
    body_text: initialData?.body_text || '',
    footer_text: initialData?.footer_text || '',
    buttons: initialData?.buttons || [],
    header_media_url: initialData?.header_media_url || '',
  };

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'buttons'
  });

  // Keep track of body text for variable parsing & preview
  const watchBodyText = form.watch('body_text');
  useEffect(() => {
    setBodyTextVal(watchBodyText || '');
  }, [watchBodyText]);

  const headerType = form.watch('header_type');
  const headerText = form.watch('header_text');
  const footerText = form.watch('footer_text');
  const watchButtons = form.watch('buttons');
  const watchHeaderMediaUrl = form.watch('header_media_url');

  // Detect double-curly brace variables
  const detectedVariables = useMemo(() => {
    const matches = bodyTextVal.match(/\{\{\s*(\w+)\s*\}\}/g);
    if (!matches) return [];
    const vars: string[] = [];
    matches.forEach((m) => {
      const v = m.replace(/\{\{|\}\}/g, '').trim();
      if (!vars.includes(v)) {
        vars.push(v);
      }
    });
    return vars;
  }, [bodyTextVal]);

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (varValue: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? bodyTextVal.length;
    const end = textarea.selectionEnd ?? bodyTextVal.length;
    const newText = bodyTextVal.slice(0, start) + `{{${varValue}}}` + bodyTextVal.slice(end);
    form.setValue('body_text', newText, { shouldValidate: true });
    // Restore cursor after inserted text
    setTimeout(() => {
      textarea.focus();
      const newPos = start + varValue.length + 4; // 4 = {{ and }}
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const [previewValues, setPreviewValues] = useState<Record<string, string>>((initialData?.example_values as Record<string, string>) || {});

  // Reset preview values when detected variables change
  useEffect(() => {
    const initial: Record<string, string> = {};
    detectedVariables.forEach(v => {
      initial[v] = previewValues[v] || (initialData?.example_values as Record<string, string>)?.[v] || '';
    });
    setPreviewValues(initial);
  }, [detectedVariables.join(',')]);

  // Computed preview text with values substituted
  const resolvedPreviewText = useMemo(() => {
    let text = bodyTextVal;
    detectedVariables.forEach(v => {
      const val = previewValues[v];
      if (val) {
        text = text.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, 'g'), val);
      }
    });
    return text;
  }, [bodyTextVal, previewValues, detectedVariables]);

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert spaces/dashes to underscores, lowercase, strip invalid chars
    const transformed = e.target.value
      .toLowerCase()
      .replace(/[\s-]/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    form.setValue('template_name', transformed, { shouldValidate: true });
  };

  const onSave = async (values: TemplateFormValues, submitToMeta = false) => {
    if (submitToMeta && ['image', 'video', 'document'].includes(values.header_type) && !values.header_media_url) {
      form.setError('header_media_url', {
        type: 'manual',
        message: 'Please provide a media URL for image/video/document headers.'
      });
      form.setFocus('header_media_url');
      return;
    }

    try {
      const payload = {
        template_name: values.template_name,
        category: values.category,
        language: values.language,
        header_type: values.header_type,
        header_text: values.header_text || null,
        header_media_url: values.header_media_url || null,
        body_text: values.body_text,
        variables: detectedVariables,
        example_values: previewValues,
        variable_labels: getIndustryVars(initialData?.industry || company?.industry).reduce((acc, curr) => {
          acc[curr.value] = curr.label;
          return acc;
        }, {} as Record<string, string>),
        footer_text: values.footer_text || null,
        buttons: (values.buttons || []) as TemplateButton[],
        industry: initialData?.industry || company?.industry || 'real_estate',
        company_id: initialData?.company_id || company?.id || '',
        status: (initialData?.status || 'draft') as 'draft' | 'pending' | 'approved' | 'rejected' | 'paused'
      };

      let result: WhatsAppTemplate;

      if (initialData?.id && initialData.status !== 'approved') {
        result = await updateTemplateMutation.mutateAsync({
          id: initialData.id,
          ...payload
        });
      } else {
        result = await createTemplateMutation.mutateAsync(payload);
      }

      if (submitToMeta && isAdminOrManager) {
        await submitTemplateMutation.mutateAsync(result.id);
      }

      onBack();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Button>
        <h2 className="text-xl font-bold text-foreground">
          {initialData ? 'Edit Template' : 'Create Template'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-3 card-elevated p-6 bg-card border border-border rounded-xl">
          <Form {...form}>
            <form className="space-y-6">
              {/* Template Name */}
              <FormField
                control={form.control}
                name="template_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. site_visit_reminder"
                        {...field}
                        onChange={handleNameInput}
                      />
                    </FormControl>
                    <FormDescription>
                      Meta requires template names to be lowercase and contain only underscores (no spaces or hyphens).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">Utility</SelectItem>
                          <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Language */}
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English (en)</SelectItem>
                          <SelectItem value="es">Spanish (es)</SelectItem>
                          <SelectItem value="pt_BR">Portuguese (pt_BR)</SelectItem>
                          <SelectItem value="hi">Hindi (hi)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Header Configuration */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Header Settings</h3>
                <FormField
                  control={form.control}
                  name="header_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Header Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="text">Text Header</SelectItem>
                          <SelectItem value="image">Image Header</SelectItem>
                          <SelectItem value="document">Document Header</SelectItem>
                          <SelectItem value="video">Video Header</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {headerType === 'text' && (
                  <FormField
                    control={form.control}
                    name="header_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter bold header text..." maxLength={60} {...field} />
                        </FormControl>
                        <FormDescription>Max 60 characters. Bold text above body.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(headerType === 'image' || headerType === 'video' || headerType === 'document') && (
                  <FormItem>
                    <FormLabel>
                      {headerType === 'image' ? 'Header Image' : headerType === 'video' ? 'Header Video' : 'Header Document'}
                    </FormLabel>

                    {/* Show uploaded file URL if exists */}
                    {watchHeaderMediaUrl && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-xs">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="truncate text-muted-foreground">{watchHeaderMediaUrl}</span>
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => form.setValue('header_media_url', '')}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* File picker */}
                    {!watchHeaderMediaUrl && (
                      <div className="border-2 border-dashed border-border rounded-lg p-4
                                      flex flex-col items-center gap-2 cursor-pointer
                                      hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById('template-media-upload')?.click()}
                      >
                        {mediaUploading ? (
                          <React.Fragment>
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <span className="text-xs">Uploading...</span>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            {headerType === 'image' && <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                            {headerType === 'video' && <Video className="w-6 h-6 text-muted-foreground" />}
                            {headerType === 'document' && <FileText className="w-6 h-6 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground">
                              Click to upload {headerType === 'image' ? 'JPG/PNG (max 5MB)' : headerType === 'video' ? 'MP4 (max 16MB)' : 'PDF (max 5MB)'}
                            </span>
                          </React.Fragment>
                        )}
                        <input
                          id="template-media-upload"
                          type="file"
                          className="hidden"
                          accept={
                            headerType === 'image' ? 'image/jpeg,image/png,image/webp' :
                            headerType === 'video' ? 'video/mp4' :
                            'application/pdf'
                          }
                          onChange={handleMediaUpload}
                          disabled={mediaUploading}
                        />
                      </div>
                    )}

                    <FormDescription>
                      File is uploaded to secure storage. Meta uses it as an example during template review.
                    </FormDescription>
                  </FormItem>
                )}
              </div>

              {/* Body Text */}
              <div className="border-t border-border pt-4">
                <FormField
                  control={form.control}
                  name="body_text"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Body Text</FormLabel>
                        <span className="text-xs text-muted-foreground">{bodyTextVal.length}/1024</span>
                      </div>

                      {/* Variable Picker Chips — click to insert */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-xs text-muted-foreground self-center">Insert:</span>
                        {getIndustryVars(company?.industry).map((v) => (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => insertVariable(v.value)}
                            className="text-xs px-2 py-0.5 rounded-full border border-primary/30
                                       bg-primary/5 text-primary hover:bg-primary/15
                                       transition-colors cursor-pointer font-medium"
                          >
                            + {v.label}
                          </button>
                        ))}
                      </div>

                      <FormControl>
                        <Textarea
                          placeholder="Click the chips above to insert variables, or type {{variable_name}} manually."
                          className="min-h-[120px] font-sans"
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            bodyTextareaRef.current = el;
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Detected Variables + Preview Value Inputs */}
                {detectedVariables.length > 0 && (
                  <div className="mt-3 space-y-3 bg-secondary/20 p-3 rounded-lg border border-border">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Preview Values (type to see live preview update)
                    </span>
                    <div className="grid gap-2">
                      {detectedVariables.map((v, i) => (
                        <div key={v} className="grid grid-cols-3 items-center gap-2">
                          <label className="text-xs font-medium text-foreground col-span-1 flex items-center gap-1">
                            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold">
                              {`{{${i + 1}}}`}
                            </span>
                            <span className="truncate">{v}</span>
                          </label>
                          <Input
                            placeholder={`Sample ${v.replace(/_/g, ' ')}`}
                            className="h-7 text-xs col-span-2"
                            value={previewValues[v] || ''}
                            onChange={(e) => setPreviewValues(prev => ({ ...prev, [v]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      ℹ️ When submitted to Meta, variables become {`{{1}}`}, {`{{2}}`}, etc. in the same order shown above.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer Text */}
              <div className="border-t border-border pt-4">
                <FormField
                  control={form.control}
                  name="footer_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Footer Text (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Reply STOP to opt out" {...field} />
                      </FormControl>
                      <FormDescription>Small gray text below body.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Interactive Buttons */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Interactive Buttons</h3>
                    <p className="text-xs text-muted-foreground">Add up to 3 interactive buttons</p>
                  </div>
                  {fields.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ type: 'QUICK_REPLY', text: '' })}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Button
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-3 bg-secondary/30 border border-border rounded-lg space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                        <div>
                          <label className="text-xs font-semibold block mb-1">Button Type</label>
                          <Select
                            onValueChange={(val) => {
                              form.setValue(`buttons.${index}.type` as any, val);
                              form.setValue(`buttons.${index}.url` as any, '');
                              form.setValue(`buttons.${index}.phone_number` as any, '');
                            }}
                            defaultValue={field.type}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                              <SelectItem value="URL">Visit Website (URL)</SelectItem>
                              <SelectItem value="PHONE_NUMBER">Call Phone Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-semibold block mb-1">Button Text</label>
                          <Input
                            placeholder="e.g. Visit Website"
                            className="h-9"
                            {...form.register(`buttons.${index}.text` as any)}
                          />
                        </div>
                      </div>

                      {watchButtons?.[index]?.type === 'URL' && (
                        <div className="grid grid-cols-1 gap-2">
                          <label className="text-xs font-semibold block">URL Destination</label>
                          <Input
                            placeholder="https://example.com"
                            className="h-9"
                            {...form.register(`buttons.${index}.url` as any)}
                          />
                        </div>
                      )}

                      {watchButtons?.[index]?.type === 'PHONE_NUMBER' && (
                        <div className="grid grid-cols-1 gap-2">
                          <label className="text-xs font-semibold block">Phone Number (with country code)</label>
                          <Input
                            placeholder="+919876543210"
                            className="h-9"
                            {...form.register(`buttons.${index}.phone_number` as any)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.handleSubmit((v) => onSave(v, false))}
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  Save Draft
                </Button>
                {isAdminOrManager ? (
                  <Button
                    type="button"
                    onClick={form.handleSubmit((v) => onSave(v, true))}
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending || submitTemplateMutation.isPending}
                    className="gradient-primary border-0"
                  >
                    Save & Submit to Meta
                  </Button>
                ) : (
                  <Button type="button" disabled variant="ghost" className="text-xs">
                    * Submission requires Admin role
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className="sticky top-6 w-full max-w-sm">
            <span className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5 justify-center">
              <Smartphone className="w-4 h-4 text-primary" /> Live Mockup Preview
            </span>

            {/* WhatsApp Bubble Preview Mockup */}
            <div className="w-full bg-[#E5DDD5] border border-border shadow-2xl rounded-2xl overflow-hidden aspect-[9/16] max-h-[600px] flex flex-col">
              {/* WhatsApp Mock Top Header Bar */}
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  WA
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">Business Account</p>
                  <p className="text-[10px] text-white/80">Online</p>
                </div>
              </div>

              {/* Conversation Area with Chat Bubble */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                <div className="bg-white rounded-lg shadow-md max-w-[85%] ml-auto overflow-hidden text-card-foreground">

                  {/* Media Header Preview */}
                  {headerType === 'image' && (
                    <div className="bg-secondary/40 aspect-video w-full flex items-center justify-center border-b border-secondary overflow-hidden">
                      {watchHeaderMediaUrl ? (
                        <img
                          src={watchHeaderMediaUrl}
                          alt="Header preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                          <span className="text-xs">Image header</span>
                        </div>
                      )}
                    </div>
                  )}
                  {headerType === 'video' && (
                    <div className="bg-secondary/40 aspect-video w-full flex items-center justify-center border-b border-secondary">
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Video className="w-8 h-8 opacity-40" />
                        <span className="text-xs">Video header</span>
                      </div>
                    </div>
                  )}
                  {headerType === 'document' && (
                    <div className="bg-secondary/40 py-3 px-4 w-full flex items-center gap-2 border-b border-secondary">
                      <FileText className="w-6 h-6 text-muted-foreground opacity-60" />
                      <span className="text-xs text-muted-foreground">Document header</span>
                    </div>
                  )}

                  {/* Header/Body/Footer Text Content */}
                  <div className="p-2.5 space-y-1">
                    {/* Header text */}
                    {headerType === 'text' && headerText && (
                      <h4 className="font-bold text-sm text-foreground block">{headerText}</h4>
                    )}

                    {/* Body text with variables highlighting */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {bodyTextVal.split(/(\{\{\s*\w+\s*\}\})/).map((part, index) => {
                        if (part.startsWith('{{') && part.endsWith('}}')) {
                          const varName = part.replace(/\{\{|\}\}/g, '').trim();
                          const resolvedVal = previewValues[varName];
                          if (resolvedVal) {
                            return (
                              <span key={index} className="text-green-700 font-semibold bg-green-100 px-1 rounded">
                                {resolvedVal}
                              </span>
                            );
                          }
                          return (
                            <span key={index} className="text-orange-600 font-semibold bg-orange-50 px-1 rounded">
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>

                    {/* Footer text */}
                    {footerText && (
                      <p className="text-[10px] text-muted-foreground pt-1">{footerText}</p>
                    )}
                  </div>

                  {/* Message Metadata Time */}
                  <div className="px-2 pb-1.5 text-right">
                    <span className="text-[9px] text-muted-foreground">10:47 AM</span>
                  </div>
                </div>

                {/* Buttons Preview Block */}
                {watchButtons && watchButtons.length > 0 && (
                  <div className="max-w-[85%] ml-auto space-y-1">
                    {watchButtons.map((btn, i) => {
                      if (!btn.text) return null;
                      return (
                        <div
                          key={i}
                          className="bg-white hover:bg-slate-50 transition-colors border border-border/80 shadow-sm rounded-lg py-2 px-3 text-center text-xs font-semibold text-blue-500 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {btn.text}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
