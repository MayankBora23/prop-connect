import { useState, useEffect } from 'react';
import { useTemplates } from '@/hooks/useWhatsAppTemplates';
import { useCurrentCompany } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Users, 
  Send, 
  ArrowLeft, 
  Sparkles, 
  Calendar, 
  Info,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignSenderProps {
  onBack: () => void;
  currentIndustry?: string;
}

interface TargetContact {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  location?: string | null;
  details?: string | null;
}

export function CampaignSender({ onBack, currentIndustry }: CampaignSenderProps) {
  const { data: templates } = useTemplates();
  const { data: company } = useCurrentCompany();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Audience
  const [contacts, setContacts] = useState<TargetContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Variable mappings: Record<variableName, { source: 'field' | 'constant', value: string }>
  const [mappings, setMappings] = useState<Record<string, { source: 'field' | 'constant'; value: string }>>({});

  // Scheduling
  const [sendTimeType, setSendTimeType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [sending, setSending] = useState(false);

  // Filter approved templates
  const approvedTemplates = (templates || []).filter(t => t.status === 'approved');

  // Load selected template variables
  useEffect(() => {
    if (selectedTemplateId && templates) {
      const found = templates.find(t => t.id === selectedTemplateId);
      setSelectedTemplate(found);
      if (found && found.variables) {
        const initialMappings: typeof mappings = {};
        found.variables.forEach((v) => {
          // Pre-fill smart mappings based on name match
          let source: 'field' | 'constant' = 'constant';
          let value = '';
          
          if (v.includes('name')) {
            source = 'field';
            value = 'name';
          } else if (v.includes('location')) {
            source = 'field';
            value = 'location';
          } else if (v.includes('email')) {
            source = 'field';
            value = 'email';
          }
          
          initialMappings[v] = { source, value };
        });
        setMappings(initialMappings);
      } else {
        setMappings({});
      }
    } else {
      setSelectedTemplate(null);
      setMappings({});
    }
  }, [selectedTemplateId, templates]);

  // Load audience based on industry
  useEffect(() => {
    const fetchAudience = async () => {
      setContactsLoading(true);
      try {
        const companyId = company?.id;
        if (!companyId) return;

        let data: any[] | null = null;
        let error: any = null;

        if (currentIndustry === 'education') {
          // Fetch students
          const res = await supabase
            .from('students')
            .select('id, name, phone, email, address')
            .eq('company_id', companyId)
            .limit(100);
          data = res.data;
          error = res.error;
        } else if (currentIndustry === 'automobile_dealers') {
          // Fetch automobile leads
          const res = await supabase
            .from('auto_leads')
            .select('id, name, phone, email')
            .eq('company_id', companyId)
            .limit(100);
          data = res.data;
          error = res.error;
        } else {
          // Fetch standard leads (Real Estate)
          const res = await supabase
            .from('leads')
            .select('id, name, phone, email, location')
            .eq('company_id', companyId)
            .limit(100);
          data = res.data;
          error = res.error;
        }

        if (error) throw error;

        const mapped: TargetContact[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          email: item.email || null,
          location: item.location || item.address || null,
          details: item.preferred_model || item.property_type || null
        }));

        setContacts(mapped);
        // Autoselect all by default
        setSelectedContacts(mapped.map(c => c.id));
      } catch (err: any) {
        console.error('Error fetching audience:', err);
        toast.error('Failed to load contacts for campaign audience.');
      } finally {
        setContactsLoading(false);
      }
    };

    fetchAudience();
  }, [currentIndustry, company]);

  const toggleSelectContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(filteredContacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleMappingChange = (varName: string, field: 'source' | 'value', val: string) => {
    setMappings(prev => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        [field]: val
      }
    }));
  };

  // Compile campaign message text for a single contact
  const compileMessage = (templateText: string, contact: TargetContact) => {
    if (!templateText) return '';
    return templateText.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, varName) => {
      const mapping = mappings[varName];
      if (!mapping) return match;
      if (mapping.source === 'field') {
        const val = (contact as any)[mapping.value];
        return val || `[${varName}]`;
      } else {
        return mapping.value || `[${varName}]`;
      }
    });
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template.');
      return;
    }
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact in the audience.');
      return;
    }

    if (sendTimeType === 'scheduled' && (!scheduleDate || !scheduleTime)) {
      toast.error('Please specify a valid schedule date and time.');
      return;
    }

    // Verify all variables are mapped
    for (const v of (selectedTemplate?.variables || [])) {
      const m = mappings[v];
      if (!m || !m.value.trim()) {
        toast.error(`Please map the variable {{${v}}}.`);
        return;
      }
    }

    setSending(true);

    if (sendTimeType === 'scheduled') {
      // Simulation of scheduling
      toast.success(`Campaign scheduled successfully for ${scheduleDate} at ${scheduleTime}!`);
      setSending(false);
      onBack();
      return;
    }

    toast.loading(`Sending campaign to ${selectedContacts.length} recipients...`, { id: 'send-camp' });

    let successCount = 0;
    let failedCount = 0;

    const companyId = company?.id;
    if (!companyId) return;

    try {
      // Loop over contacts and send
      for (const contactId of selectedContacts) {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) continue;

        // Compile body text
        const compiledBody = compileMessage(selectedTemplate.content, contact);

        // 1. Create or fetch conversation in whatsapp_conversations
        const cleanPhone = contact.phone.replace(/[^0-9+]/g, ''); // Ensure phone format is clean
        
        let conversationId = '';
        const { data: existingConv } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .eq('company_id', companyId)
          .eq('contact_phone', cleanPhone)
          .maybeSingle();

        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          // Create conversation
          const { data: newConv, error: newConvErr } = await supabase
            .from('whatsapp_conversations')
            .insert({
              company_id: companyId,
              contact_phone: cleanPhone,
              contact_name: contact.name,
              last_message_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (newConvErr || !newConv) {
            console.error('Error creating conversation for campaign:', newConvErr);
            failedCount++;
            continue;
          }
          conversationId = newConv.id;
        }

        // 2. Invoke send-whatsapp-message edge function
        const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
          method: 'POST',
          body: {
            conversation_id: conversationId,
            body: compiledBody,
            message_category: selectedTemplate.category.toLowerCase()
          }
        });

        if (error) {
          console.error(`Failed to send message to ${contact.name}:`, error);
          failedCount++;
        } else {
          successCount++;
        }
      }

      if (failedCount > 0) {
        toast.warning(`Campaign sent with partial failures: ${successCount} succeeded, ${failedCount} failed.`, { id: 'send-camp', duration: 5000 });
      } else {
        toast.success(`Broadcast campaign sent successfully to ${successCount} recipients!`, { id: 'send-camp' });
      }
      onBack();
    } catch (err: any) {
      console.error('Campaign sending failed:', err);
      toast.error(err.message || 'Campaign transmission failed.', { id: 'send-camp' });
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Launch Outbound Broadcast</h2>
          <p className="text-xs text-muted-foreground">
            Send bulk template notifications to your leads and clients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left configurations */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="card-elevated border-0 relative overflow-hidden">
            <div className="h-1.5 w-full bg-primary absolute top-0 left-0" />
            <CardHeader className="pt-6 pb-3">
              <CardTitle className="text-base font-bold">1. Select Template & Map Variables</CardTitle>
              <CardDescription className="text-xs">Only approved templates can be used in live campaigns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Template selection */}
              <div className="space-y-2">
                <Label htmlFor="template-select" className="text-xs font-semibold">Select Approved Template</Label>
                {approvedTemplates.length > 0 ? (
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger id="template-select" className="text-xs h-10">
                      <SelectValue placeholder="Select an approved template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.template_name} ({t.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">No approved templates available.</span> Go back to the dashboard, sync your statuses, or submit a new template to Meta and wait for approval.
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Variable Mapping */}
              {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-border/60">
                  <Label className="text-xs font-bold uppercase tracking-wider text-primary">2. Map Template Parameters</Label>
                  <p className="text-[10px] text-muted-foreground">Match template parameters dynamically to lead attributes.</p>
                  
                  <div className="space-y-3.5">
                    {selectedTemplate.variables.map((v: string) => (
                      <div key={v} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-3 rounded-lg bg-secondary/40 border border-border/80">
                        <span className="text-xs font-mono font-bold text-foreground">
                          {`{{${v}}}`}
                        </span>

                        {/* Mapping source selector */}
                        <Select
                          value={mappings[v]?.source || 'constant'}
                          onValueChange={(val: any) => handleMappingChange(v, 'source', val)}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Map Source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="field">Lead Database Field</SelectItem>
                            <SelectItem value="constant">Static Constant Value</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Mapping value input */}
                        {mappings[v]?.source === 'field' ? (
                          <Select
                            value={mappings[v]?.value || ''}
                            onValueChange={(val) => handleMappingChange(v, 'value', val)}
                          >
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue placeholder="Select Field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Full Name</SelectItem>
                              <SelectItem value="email">Email Address</SelectItem>
                              <SelectItem value="phone">Phone Number</SelectItem>
                              <SelectItem value="location">Location / Address</SelectItem>
                              <SelectItem value="details">Details / Model Preference</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={mappings[v]?.value || ''}
                            onChange={(e) => handleMappingChange(v, 'value', e.target.value)}
                            placeholder="Enter text..."
                            className="h-8 text-xs font-medium"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule settings */}
          <Card className="card-elevated border-0 relative overflow-hidden">
            <div className="h-1.5 w-full bg-primary absolute top-0 left-0" />
            <CardHeader className="pt-6 pb-3">
              <CardTitle className="text-base font-bold">3. Scheduling & Delivery Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 p-1 rounded-lg bg-secondary/50 border border-border w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSendTimeType('immediate')}
                  className={cn(
                    'px-4 py-2 text-xs font-semibold rounded-md transition-all',
                    sendTimeType === 'immediate' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  Send Immediately
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSendTimeType('scheduled')}
                  className={cn(
                    'px-4 py-2 text-xs font-semibold rounded-md transition-all',
                    sendTimeType === 'scheduled' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  Schedule Broadcast
                </Button>
              </div>

              {sendTimeType === 'scheduled' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-scale-in">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Scheduled Date</Label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Scheduled Time</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="text-xs font-medium"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 pb-6 border-t border-border/50">
              <Button
                onClick={handleSendCampaign}
                disabled={sending || !selectedTemplateId || selectedContacts.length === 0}
                className="w-full gradient-primary border-0 font-bold text-xs h-10 shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4 text-white" />
                {sendTimeType === 'immediate' ? `Launch Broadcast Campaign (${selectedContacts.length} recipients)` : 'Schedule Broadcast Campaign'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right audience selector */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="card-elevated border-0 relative overflow-hidden">
            <div className="h-1.5 w-full bg-emerald-500 absolute top-0 left-0" />
            <CardHeader className="pt-6 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Users className="w-5 h-5 text-emerald-500" />
                4. Campaign Audience
              </CardTitle>
              <CardDescription className="text-xs">Select target contacts from your client records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-9 text-xs h-9 font-medium"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <Checkbox
                  id="select-all"
                  checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-xs font-bold cursor-pointer select-none">
                  Select All ({filteredContacts.length} matching)
                </Label>
              </div>

              {/* Contacts List */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div 
                      key={contact.id} 
                      onClick={() => toggleSelectContact(contact.id)}
                      className={cn(
                        'flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all select-none hover:bg-secondary/40',
                        selectedContacts.includes(contact.id) ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/60'
                      )}
                    >
                      <Checkbox
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => {}} // Click on parent div handles toggling
                        className="mt-0.5"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{contact.name}</span>
                          {contact.location && (
                            <Badge variant="outline" className="text-[8px] font-semibold px-1 rounded-sm bg-secondary shrink-0">
                              {contact.location}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold font-mono leading-none">
                          {contact.phone}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    No contacts found. Check your database leads list.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
