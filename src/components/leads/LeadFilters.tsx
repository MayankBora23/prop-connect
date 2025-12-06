import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Lead, LeadStage } from '@/data/mockData';

export interface LeadFilters {
  search: string;
  stage: string;
  source: string;
  assignedTo: string;
}

interface LeadFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  leads: Lead[];
}

const stages: LeadStage[] = ['new', 'contacted', 'follow-up', 'site-visit', 'negotiation', 'closed-won', 'closed-lost'];
const sources = ['Website', 'Facebook Ads', '99acres', 'MagicBricks', 'Referral', 'Walk-in', 'Other'];

export function LeadFiltersDialog({ open, onOpenChange, filters, onFiltersChange, leads }: LeadFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<LeadFilters>(filters);

  // Sync localFilters when dialog opens or filters prop changes
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  // Get unique assigned agents from leads
  const assignedAgents = Array.from(new Set(leads.map(l => l.assignedTo).filter(Boolean)));

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters: LeadFilters = {
      search: '',
      stage: '',
      source: '',
      assignedTo: '',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onOpenChange(false);
  };

  const hasActiveFilters = filters.search || filters.stage || filters.source || filters.assignedTo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Leads</DialogTitle>
          <DialogDescription>
            Filter leads by various criteria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by name, email, phone..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <Select
              value={localFilters.stage}
              onValueChange={(value) => setLocalFilters({ ...localFilters, stage: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={localFilters.source}
              onValueChange={(value) => setLocalFilters({ ...localFilters, source: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select
              value={localFilters.assignedTo}
              onValueChange={(value) => setLocalFilters({ ...localFilters, assignedTo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All agents</SelectItem>
                {assignedAgents.map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2">
              {filters.search && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                  Search: {filters.search}
                </span>
              )}
              {filters.stage && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                  Stage: {filters.stage}
                </span>
              )}
              {filters.source && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                  Source: {filters.source}
                </span>
              )}
              {filters.assignedTo && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                  Agent: {filters.assignedTo}
                </span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

