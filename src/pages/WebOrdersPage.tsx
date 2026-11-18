import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Globe, Truck, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { WebOrderStatus } from '@/types/webOrders'

const STATUS_LABELS: Record<WebOrderStatus, string> = {
  payment_pending: 'Payment pending',
  payment_failed: 'Payment failed',
  completed: 'Completed online',
  ready_to_fulfill: 'Ready for delivery',
  fulfilled: 'Fulfilled',
  receipt_issued: 'Receipt issued',
  needs_review: 'Needs review',
}

const STATUS_STYLES: Record<WebOrderStatus, string> = {
  payment_pending: 'bg-amber-50 text-amber-700',
  payment_failed: 'bg-rose-50 text-rose-700',
  completed: 'bg-emerald-50 text-emerald-700',
  ready_to_fulfill: 'bg-sky-50 text-sky-700',
  fulfilled: 'bg-emerald-50 text-emerald-700',
  receipt_issued: 'bg-slate-100 text-slate-600',
  needs_review: 'bg-rose-50 text-rose-700',
}

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(amount)

const formatDate = (value: string) => new Date(value).toLocaleString()

export const WebOrdersPage: React.FC = () => {
  const { currentUser } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['web-orders-dashboard', currentUser.id],
    queryFn: () => api.webOrders.dashboard(currentUser),
  })

  if (isLoading) return <p className="p-6 text-sm text-slate-500">Loading Web Orders…</p>

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load Web Orders. Check your assigned company and branch access.
      </div>
    )
  }

  const outlets = data?.outlets ?? []
  if (outlets.length === 0) {
    return (
      <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Web Orders access not available</h2>
        <p className="mt-2 text-sm text-slate-500">
          Website orders are available to staff with POS access and scoped managers.
        </p>
      </div>
    )
  }

  const orders = data?.orders ?? []
  const outletName = (outletId: string) =>
    outlets.find((outlet) => outlet.id === outletId)?.name ?? 'Unknown outlet'
  const instantCount = orders.filter((order) => order.fulfillmentMode === 'instant').length
  const deliveryCount = orders.filter((order) => order.fulfillmentMode === 'requires_logistics').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Web Orders</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review online purchases separately from walk-in POS sales and delivery work.
        </p>
      </div>

      {data?.dataMode === 'demo' && (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Demo mode: orders and payment statuses are synthetic. Paystack events must be verified by a secure backend in production.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">Instant / no delivery</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{instantCount}</p>
            </div>
            <Zap className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">Delivery required</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{deliveryCount}</p>
            </div>
            <Truck className="h-5 w-5 text-sky-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Online order register</CardTitle>
          <CardDescription>
            Instant orders complete after verified payment; only paid delivery orders create Logistics tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.length === 0 && <p className="text-sm text-slate-500">No website orders in this scope.</p>}
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{order.sourceOrderId}</h3>
                  <p className="text-xs text-slate-500">
                    {order.sourceDomain} · {order.customerLabel} · {outletName(order.outletId)}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">Ordered {formatDate(order.createdAt)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${STATUS_STYLES[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <ul className="my-3 space-y-1 text-xs text-slate-600">
                {order.lines.map((line, index) => (
                  <li key={`${line.itemId}-${index}`} className="flex justify-between gap-3">
                    <span>{line.quantity} × {line.itemName}</span>
                    <span>{formatMoney(line.unitPrice * line.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
                <div>
                  <p className="font-bold text-slate-900">{formatMoney(order.total)}</p>
                  <p className="text-[10px] text-slate-500">
                    Payment: {order.paymentStatus}
                    {order.paymentReference ? ` · ${order.paymentReference}` : ''}
                  </p>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  {order.fulfillmentMode === 'instant' ? (
                    <><Zap className="h-3.5 w-3.5" /> No Logistics task</>
                  ) : (
                    <><Truck className="h-3.5 w-3.5" /> Routed to Logistics after payment</>
                  )}
                </p>
              </div>

              {order.fulfilledByName && (
                <p className="mt-2 text-xs text-slate-600">
                  Fulfilled by {order.fulfilledByName}{order.fulfilledAt ? ` · ${formatDate(order.fulfilledAt)}` : ''}
                </p>
              )}
              {order.receiptId && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <CreditCard className="h-3.5 w-3.5" /> POS receipt {order.receiptId}
                </p>
              )}
            </article>
          ))}
        </CardContent>
      </Card>
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Globe className="h-3.5 w-3.5" />
        Website orders never appear as walk-in POS checkouts.
      </p>
    </div>
  )
}
