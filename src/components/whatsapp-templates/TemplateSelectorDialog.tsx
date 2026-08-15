import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApprovedTemplates, useSendTemplate, WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';
import { Search, Sparkles, MessageSquare, ChevronRight, ArrowLeft, Send } from 'lucide-react';

interface TemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  contactName?: string;
  onSent: () => void;
}

export function TemplateSelectorDialog({
  open,
  onOpenChange,
  conversationId,
  contactName,
  onSent
}: TemplateSelectorDialogProps) {
  const { data: approvedTemplates = [], isLoading } = useApprovedTemplates();
  const sendTemplateMutation = useSendTemplate();

  const [step, setStep] = useState<1 | 2>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setStep(1);
      setSearchTerm('');
      setSelectedTemplate(null);
      setVariableValues({});
    }
  }, [open]);

  // Pre-fill student_name/customer_name if contactName is provided
  useEffect(() => {
    if (selectedTemplate && contactName) {
      const vals: Record<string, string> = {};
      selectedTemplate.variables.forEach((v) => {
        if (['customer_name', 'student_name', 'name'].includes(v.toLowerCase())) {
          vals[v] = contactName;
        } else {
          vals[v] = '';
        }
      });
      setVariableValues(vals);
    }
  }, [selectedTemplate, contactName]);

  const filteredTemplates = useMemo(() => {
    return approvedTemplates.filter(t =>
      t.template_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [approvedTemplates, searchTerm]);

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    const initialVals: Record<string, string> = {};
    template.variables.forEach((v) => {
      initialVals[v] = '';
    });
    setVariableValues(initialVals);
    setStep(2);
  };

  const handleVariableChange = (varName: string, val: string) => {
    setVariableValues(prev => ({
      ...prev,
      [varName]: val
    }));
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    try {
      await sendTemplateMutation.mutateAsync({
        conversationId,
        templateId: selectedTemplate.id,
        variableValues
      });
      onOpenChange(false);
      onSent();
    } catch (err) {
      console.error(err);
    }
  };

  // Preview body text with values replaced
  const previewText = useMemo(() => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.body_text;
    selectedTemplate.variables.forEach((v) => {
      const val = variableValues[v] || `{{${v}}}`;
      text = text.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, 'g'), val);
    });
    return text;
  }, [selectedTemplate, variableValues]);

  const isSendDisabled = useMemo(() => {
    if (!selectedTemplate) return true;
    return selectedTemplate.variables.some(v => !variableValues[v]?.trim());
  }, [selectedTemplate, variableValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold flex items-center gap-1.5">
            <MessageSquare className="w-5 h-5 text-primary" />
            {step === 1 ? 'Select WhatsApp Template' : 'Fill Template Variables'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 1
              ? 'Choose one of your Meta-approved message templates.'
              : `Configure details for "${selectedTemplate?.template_name}".`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Template List */}
            <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading approved templates...
                </div>
              ) : filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="p-3.5 hover:bg-secondary/40 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {template.template_name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {template.body_text}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No approved templates found.
                </div>
              )}
            </div>
          </div>
        ) : (
          selectedTemplate && (
            <div className="space-y-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 -ml-2 text-muted-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to List
              </Button>

              {/* Variable Input Fields */}
              {selectedTemplate.variables.length > 0 ? (
                <div className="space-y-3 bg-secondary/20 p-4 border border-border rounded-lg">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Template Inputs
                  </span>
                  <div className="grid gap-3 pt-2">
                    {selectedTemplate.variables.map((v, index) => (
                      <div key={v} className="grid grid-cols-3 items-center gap-3">
                        <label className="text-xs font-medium text-foreground col-span-1 flex items-center gap-1.5">
                          <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">
                            {`{{${index + 1}}}`}
                          </span>
                          <span className="truncate">{v}</span>
                        </label>
                        <Input
                          placeholder={`Enter value for ${v}...`}
                          className="h-8 text-xs col-span-2"
                          value={variableValues[v] || ''}
                          onChange={(e) => handleVariableChange(v, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/20 p-4 border border-border rounded-lg text-center text-xs text-muted-foreground">
                  This template does not require any variables.
                </div>
              )}

              {/* Message Live Preview Mockup */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground block">
                  Live Message Preview
                </span>
                <div className="bg-[#E5DDD5] p-4 rounded-xl border border-border bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat min-h-[120px] flex flex-col justify-end">
                  <div className="bg-white rounded-lg shadow-sm max-w-[90%] ml-auto overflow-hidden text-card-foreground">
                    {/* Media Header Preview */}
                    {selectedTemplate.header_type === 'image' && (
                      <div className="bg-secondary/40 aspect-video w-full flex items-center justify-center border-b border-secondary overflow-hidden">
                        {selectedTemplate.header_media_url ? (
                          <img
                            src={selectedTemplate.header_media_url}
                            alt="Header preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground p-4">
                            <span className="text-xs">Image Header</span>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedTemplate.header_type === 'video' && (
                      <div className="bg-secondary/40 aspect-video w-full flex items-center justify-center border-b border-secondary">
                        <div className="flex flex-col items-center gap-1 text-muted-foreground p-4">
                          <span className="text-xs">Video Header</span>
                        </div>
                      </div>
                    )}
                    {selectedTemplate.header_type === 'document' && (
                      <div className="bg-secondary/40 py-3 px-4 w-full flex items-center gap-2 border-b border-secondary">
                        <span className="text-xs text-muted-foreground">Document Header</span>
                      </div>
                    )}

                    <div className="p-2.5 space-y-1">
                      {selectedTemplate.header_type === 'text' && selectedTemplate.header_text && (
                        <h4 className="font-bold text-sm text-foreground">{selectedTemplate.header_text}</h4>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewText}</p>
                      {selectedTemplate.footer_text && (
                        <p className="text-[10px] text-muted-foreground pt-1">{selectedTemplate.footer_text}</p>
                      )}
                    </div>
                  </div>
                  {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                    <div className="max-w-[90%] ml-auto space-y-1 mt-1">
                      {selectedTemplate.buttons.map((btn, i) => (
                        <div key={i} className="bg-white border text-center text-xs py-1.5 rounded-lg text-blue-500 font-semibold shadow-sm">
                          {btn.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 2 && (
            <Button
              onClick={handleSend}
              disabled={isSendDisabled || sendTemplateMutation.isPending}
              className="gradient-primary border-0"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {sendTemplateMutation.isPending ? 'Sending...' : 'Send Template'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
