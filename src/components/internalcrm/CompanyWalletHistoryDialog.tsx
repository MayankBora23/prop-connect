import { format } from 'date-fns'
import { Wallet, CreditCard, Clock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { useCompanyWalletHistory } from '@/hooks/useWallet'
import type { WalletTransaction } from '@/types/credits'
import type { Company } from '@/hooks/useCompany'

interface CompanyWalletHistoryDialogProps {
  company: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Completed</Badge>
    case 'pending':
      return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Pending</Badge>
    case 'failed':
      return <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Failed</Badge>
    default:
      return status
        ? <Badge variant="outline" className="text-xs">{status}</Badge>
        : <Badge variant="outline" className="text-xs">—</Badge>
  }
}

export function CompanyWalletHistoryDialog({
  company, open, onOpenChange
}: CompanyWalletHistoryDialogProps) {
  const { data: transactions = [], isLoading } = useCompanyWalletHistory(
    open ? company?.id ?? null : null  // only fetch when dialog is open
  )

  const completed = transactions.filter(t => t.status === 'completed')
  const totalAdded = completed.reduce((sum, t) => sum + Number(t.amount_inr), 0)
  const pending = transactions.filter(t => t.status === 'pending').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet Top-up History — {company?.name}
          </DialogTitle>
          <DialogDescription>
            All credit balance additions for this company
          </DialogDescription>
        </DialogHeader>

        {/* Summary cards */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Total Added</p>
              <p className="text-lg font-bold">
                ₹{totalAdded.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Recharges</p>
              <p className="text-lg font-bold">{completed.length}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold">{pending}</p>
            </div>
          </div>
        )}

        {/* Transactions table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No wallet top-ups found for this company.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount Added</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {row.created_at
                      ? format(new Date(row.created_at), 'dd MMM yyyy, hh:mm a')
                      : '—'}
                  </TableCell>
                  <TableCell className="font-semibold text-green-700">
                    +₹{Number(row.amount_inr).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {row.reference_id
                      ? row.reference_id.slice(0, 20) + (row.reference_id.length > 20 ? '…' : '')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[280px] break-words" title={row.notes ?? undefined}>
                    {row.notes ?? '—'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(row.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
