import React from 'react'
import { format } from 'date-fns'
import { Receipt, CreditCard, Users, RefreshCw, Package, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCompanyPaymentHistory, type SubscriptionPaymentHistoryRow } from '@/hooks/useSubscription'
import type { Company } from '@/hooks/useCompany'

interface CompanyBillingHistoryDialogProps {
  company: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getPaymentLabel(row: SubscriptionPaymentHistoryRow): {
  label: string
  description: string
  icon: React.ReactNode
  badgeClass: string
} {
  const type = row.payment_type ?? 'plan'
  const planName = row.plan_slug
    ? row.plan_slug.charAt(0).toUpperCase() + row.plan_slug.slice(1)
    : 'Unknown'
  const cycle = row.billing_cycle
    ? row.billing_cycle.charAt(0).toUpperCase() + row.billing_cycle.slice(1)
    : ''

  switch (type) {
    case 'plan':
      return {
        label: 'Plan Purchase',
        description: `Purchased ${planName} plan (${cycle})`,
        icon: <Package className="w-4 h-4" />,
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'seat_purchase':
      return {
        label: 'Extra Seats',
        description: `Added ${row.seat_quantity ?? 0} extra seat(s) — prorated charge`,
        icon: <Users className="w-4 h-4" />,
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      }
    case 'renewal':
      return {
        label: 'Renewal',
        description: row.seat_quantity && row.seat_quantity > 0
          ? `Renewed ${planName} plan with ${row.seat_quantity} adjusted extra seat(s)`
          : `Renewed ${planName} plan (${cycle})`,
        icon: <RefreshCw className="w-4 h-4" />,
        badgeClass: 'bg-green-50 text-green-700 border-green-200',
      }
    default:
      return {
        label: 'Payment',
        description: `${planName} plan`,
        icon: <CreditCard className="w-4 h-4" />,
        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
      }
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Completed</Badge>
    case 'pending':
      return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Pending</Badge>
    case 'failed':
      return <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">Failed</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>
  }
}

export function CompanyBillingHistoryDialog({
  company, open, onOpenChange
}: CompanyBillingHistoryDialogProps) {
  const { data: payments = [], isLoading } = useCompanyPaymentHistory(
    open ? company?.id ?? null : null  // only fetch when dialog is open
  )

  // Summary stats computed from payments
  const completedPayments = payments.filter(p => p.status === 'completed')
  const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount_inr), 0)
  const planPurchases = completedPayments.filter(p => (p.payment_type ?? 'plan') === 'plan').length
  const seatPurchases = completedPayments.filter(p => p.payment_type === 'seat_purchase').length
  const renewals = completedPayments.filter(p => p.payment_type === 'renewal').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Billing History — {company?.name}
          </DialogTitle>
          <DialogDescription>
            Complete payment history for this company
          </DialogDescription>
        </DialogHeader>

        {/* Summary cards — show 4 stat boxes */}
        {!isLoading && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold">
                ₹{totalPaid.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Plan Purchases</p>
              <p className="text-lg font-bold">{planPurchases}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Renewals</p>
              <p className="text-lg font-bold">{renewals}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Seat Purchases</p>
              <p className="text-lg font-bold">{seatPurchases}</p>
            </div>
          </div>
        )}

        {/* Payment history table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No billing history found for this company.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((row) => {
                const { label, description, icon, badgeClass } = getPaymentLabel(row)
                const date = row.paid_at ?? row.created_at
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${badgeClass} flex items-center gap-1 w-fit text-xs`}
                      >
                        {icon}
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[220px]">
                      {description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.period_start && row.period_end
                        ? `${format(new Date(row.period_start), 'dd MMM yy')} → ${format(new Date(row.period_end), 'dd MMM yy')}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      ₹{Number(row.amount_inr).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(row.status)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
