import { useMemo, useState } from 'react';
import { useWalletTransactions } from '@/hooks/useWallet';
import type { WalletTransaction } from '@/hooks/useWallet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatMessageCategory } from './WhatsAppUsageStats';

function transactionTypeLabel(row: WalletTransaction): string {
  if (row.provider === 'callerdesk') return 'Telephony';
  if (row.type === 'credit') return 'Top-up';
  if (row.service_type === 'call') return 'Call';
  if (row.service_type === 'whatsapp') return 'WhatsApp';
  return 'Usage';
}

function transactionDescription(row: WalletTransaction): string {
  if (row.type === 'credit') {
    return row.notes?.trim() || 'Wallet recharge';
  }
  const parts: string[] = [];
  if (row.destination_country) parts.push(row.destination_country);
  if (row.message_category) {
    parts.push(formatMessageCategory(row.message_category, row.provider));
  }
  if (row.service_type === 'call' && row.call_duration_minutes != null) {
    parts.push(`${row.call_duration_minutes} min`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function transactionProviderLabel(row: WalletTransaction): string {
  if (row.provider === 'callerdesk') return 'CallerDesk';
  if (row.type === 'credit') return 'Razorpay';
  return row.provider ?? '—';
}

export function TransactionHistory() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit' | 'telephony'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'twilio' | 'meta' | 'callerdesk'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'whatsapp' | 'call'>('all');

  const filters = useMemo(() => {
    const f: {
      type?: 'credit' | 'debit';
      provider?: 'twilio' | 'meta' | 'callerdesk';
      exclude_provider?: string;
      service_type?: 'whatsapp' | 'call';
      date_from?: string;
      date_to?: string;
      limit?: number;
    } = { limit: 1000 };
    if (typeFilter === 'telephony') {
      f.type = 'credit';
      f.provider = 'callerdesk';
    } else if (typeFilter === 'credit') {
      f.type = 'credit';
      f.exclude_provider = 'callerdesk';
    } else if (typeFilter !== 'all') {
      f.type = typeFilter;
    }
    if (providerFilter !== 'all' && typeFilter !== 'telephony') f.provider = providerFilter;
    if (serviceFilter !== 'all') f.service_type = serviceFilter;
    if (dateFrom) f.date_from = new Date(`${dateFrom}T00:00:00`).toISOString();
    if (dateTo) f.date_to = new Date(`${dateTo}T23:59:59.999`).toISOString();
    return f;
  }, [dateFrom, dateTo, typeFilter, providerFilter, serviceFilter]);

  const { data: rows = [], isLoading } = useWalletTransactions(filters);

  const exportCsv = () => {
    const header = [
      'Date',
      'Type',
      'Source',
      'Description',
      'Amount INR',
      'Messages/Qty',
      'Twilio Price',
      'Reference',
      'Status',
    ];
    const lines = rows.map((r) =>
      [
        r.created_at ? format(parseISO(r.created_at), 'yyyy-MM-dd HH:mm') : '',
        r.type,
        transactionProviderLabel(r),
        transactionDescription(r),
        r.type === 'credit' ? Number(r.amount_inr) : -Number(r.amount_inr),
        r.usage_quantity ?? '',
        r.twilio_actual_price != null
          ? `${r.twilio_actual_price} ${r.twilio_price_currency ?? ''}`.trim()
          : '',
        r.reference_id ?? '',
        r.status ?? '',
      ].join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-[160px]" />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-[160px]" />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Type</span>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'credit' | 'debit' | 'telephony')}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="credit">Top-ups</SelectItem>
              <SelectItem value="debit">Usage</SelectItem>
              <SelectItem value="telephony">Telephony</SelectItem>
            </SelectContent>
          </Select>
        </div>
         <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Provider</span>
          <Select
            value={providerFilter}
            onValueChange={(v) => setProviderFilter(v as 'all' | 'twilio' | 'meta' | 'callerdesk')}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="callerdesk">CallerDesk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Service</span>
          <Select
            value={serviceFilter}
            onValueChange={(v) => setServiceFilter(v as 'all' | 'whatsapp' | 'call')}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="call">Call</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={exportCsv} className="w-full sm:w-auto">
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="text-muted-foreground">Twilio cost</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No transactions
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const isCredit = r.type === 'credit';
                const amount = Number(r.amount_inr);

                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {r.created_at ? format(parseISO(r.created_at), 'MMM d, yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isCredit ? 'default' : 'outline'}
                        className={cn(
                          'capitalize',
                          isCredit && 'border-green-600 bg-green-600 hover:bg-green-600'
                        )}
                      >
                        {transactionTypeLabel(r)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{transactionProviderLabel(r)}</TableCell>
                    <TableCell className="max-w-[280px] break-words" title={transactionDescription(r)}>
                      {transactionDescription(r)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {isCredit ? '—' : (r.usage_quantity ?? '—')}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        isCredit ? 'text-green-600 dark:text-green-400' : ''
                      )}
                    >
                      {isCredit ? '+' : '−'}₹{amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {isCredit || r.twilio_actual_price == null
                        ? '—'
                        : `${r.twilio_actual_price} ${r.twilio_price_currency ?? ''}`.trim()}
                    </TableCell>
                    <TableCell className="font-mono text-xs" title={r.reference_id ?? undefined}>
                      {r.reference_id ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status ?? 'completed'}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
