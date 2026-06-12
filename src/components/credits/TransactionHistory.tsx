import { useMemo, useState } from 'react';
import { useWalletTransactions } from '@/hooks/useWallet';
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

export function TransactionHistory() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'twilio' | 'meta' | 'razorpay'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'whatsapp' | 'call' | 'recharge'>('all');

  const filters = useMemo(() => {
    const f: {
      type?: 'debit' | 'credit' | 'all';
      provider?: 'twilio' | 'meta' | 'razorpay';
      service_type?: 'whatsapp' | 'call' | 'recharge';
      date_from?: string;
      date_to?: string;
      limit?: number;
    } = { limit: 1000, type: typeFilter };
    if (providerFilter !== 'all') f.provider = providerFilter;
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
      'Provider',
      'Service',
      'Destination',
      'Category',
      'Quantity',
      'Amount INR',
      'Reference',
      'Status',
    ];
    const lines = rows.map((r) =>
      [
        r.created_at ? format(parseISO(r.created_at), 'yyyy-MM-dd HH:mm') : '',
        r.type ?? '',
        r.provider ?? '',
        r.service_type ?? '',
        r.destination_country ?? '',
        r.message_category ?? '',
        r.usage_quantity ?? '',
        r.amount_inr ?? '',
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
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Type</span>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'debit' | 'credit')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="debit">Usage</SelectItem>
              <SelectItem value="credit">Recharge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Provider</span>
          <Select
            value={providerFilter}
            onValueChange={(v) => setProviderFilter(v as 'all' | 'twilio' | 'meta' | 'razorpay')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="razorpay">Razorpay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">Service</span>
          <Select
            value={serviceFilter}
            onValueChange={(v) => setServiceFilter(v as 'all' | 'whatsapp' | 'call' | 'recharge')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="recharge">Recharge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Amount</TableHead>
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
                return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {r.created_at ? format(parseISO(r.created_at), 'MMM d, yyyy HH:mm') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isCredit ? 'default' : 'secondary'} className="capitalize">
                      {isCredit ? 'Recharge' : 'Usage'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.provider ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{r.service_type ?? '—'}</TableCell>
                  <TableCell>{r.destination_country ?? '—'}</TableCell>
                  <TableCell className="text-right">{r.usage_quantity ?? '—'}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${isCredit ? 'text-emerald-600' : ''}`}
                  >
                    {isCredit ? '+' : '−'}₹{Number(r.amount_inr).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.reference_id ? r.reference_id.slice(0, 14) : '—'}
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
