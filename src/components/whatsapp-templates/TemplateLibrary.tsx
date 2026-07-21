import React from 'react';
import { TEMPLATE_LIBRARY, LibraryTemplate } from '@/lib/templateLibrary';
import { useCurrentCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare, Plus } from 'lucide-react';

interface TemplateLibraryProps {
  onUseTemplate: (template: LibraryTemplate) => void;
  onBack: () => void;
}

export function TemplateLibrary({ onUseTemplate, onBack }: TemplateLibraryProps) {
  const { data: company } = useCurrentCompany();
  const companyIndustry = company?.industry || 'real_estate';

  // Filter templates: internal_crm sees all libraries; others see only their industry templates
  const filteredTemplates = TEMPLATE_LIBRARY.filter((tpl) => {
    if (companyIndustry === 'internal_crm') return true;
    return tpl.industry === companyIndustry;
  });

  const getIndustryLabel = (industry: string) => {
    switch (industry) {
      case 'real_estate':
        return 'Real Estate';
      case 'education':
        return 'Education';
      case 'automobile_dealers':
        return 'Automobile';
      default:
        return industry;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back to Templates
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Template Library</h2>
          <p className="text-xs text-muted-foreground">Quick-start with pre-approved industry templates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.name} className="flex flex-col hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <Badge variant={template.category === 'MARKETING' ? 'default' : 'secondary'} className="text-[10px]">
                  {template.category}
                </Badge>
                {companyIndustry === 'internal_crm' && (
                  <Badge variant="outline" className="text-[10px]">
                    {getIndustryLabel(template.industry)}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base truncate font-bold text-foreground">
                {template.name.replace(/_/g, ' ')}
              </CardTitle>
              <CardDescription className="text-xs font-mono truncate">{template.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="bg-secondary/40 border rounded-lg p-3 max-h-[140px] overflow-y-auto text-xs leading-relaxed text-card-foreground">
                {template.body_text.split(/(\{\{\s*\w+\s*\}\})/).map((part, index) => {
                  if (part.startsWith('{{') && part.endsWith('}}')) {
                    return (
                      <span key={index} className="text-primary font-semibold bg-primary/10 px-0.5 rounded">
                        {part}
                      </span>
                    );
                  }
                  return part;
                })}
              </div>

              {template.variables.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3" /> Required Variables:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {template.variables.map((v) => (
                      <span key={v} className="bg-secondary text-secondary-foreground text-[9px] px-2 py-0.5 rounded border">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0 border-t border-border/50 px-6 py-4 bg-muted/20">
              <Button onClick={() => onUseTemplate(template)} className="w-full text-xs font-medium" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1" /> Use Template
              </Button>
            </CardFooter>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
            <MessageSquare className="w-8 h-8 mx-auto opacity-20 mb-2" />
            <p className="text-sm">No templates available for your industry in the library.</p>
          </div>
        )}
      </div>
    </div>
  );
}
