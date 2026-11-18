import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, ReceiptText, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { WebOrderStatus } from '@/types/webOrders'

const ORDER_STATUS_LABELS: Record<WebOrderStatus, string> = {
  payment_pending: 'Payment pending',
  payment_failed: 'Payment failed',
  completed: 'Completed online',
  ready_to_fulfill: 'Ready to fulfill',
  fulfilled: 'Fulfilled',
  receipt_issued: 'Receipt issued',
  needs_review: 'Needs review',
}

const ORDER_STATUS_STYLES: Record<WebOrderStatus, string> = {
  payment_pending: 'bg-amber-50 text-amber-700',
  payment_failed: 'bg-rose-50 text-rose-700',
  completed: 'bg-emerald-50 text-emerald-700',
  ready_to_fulfill: 'bg-sky-50 text-sky-700',
  fulfilled: 'bg-emerald-50 text-emerald-700',
  receipt_issued: 'bg-slate-100 text-slate-600',
  needs_review: 'bg-rose-50 text-rose-700',
}

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount)

const formatDate = (value: string) => new Date(value).toLocaleString()

export const LogisticsPage: React.FC = () => {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedOutletId, setSelectedOutletId] = useState('all')
  const [notice, setNotice] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['logistics-dashboard', currentUser.id],
    queryFn: () => api.logistics.dashboard(currentUser),
  })

  const refreshDashboards = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['logistics-dashboard', currentUser.id] }),
      queryClient.invalidateQueries({ queryKey: ['pos-dashboard', currentUser.id] }),
    ])
  }

  const fulfillMutation = useMutation({
    mutationFn: (taskId: string) => api.logistics.fulfillTask(taskId, currentUser),
    onSuccess: async (order) => {
      await refreshDashboards()
      setNotice(`Order ${order.sourceOrderId} marked fulfilled by ${order.fulfilledByName}.`)
    },
    onError: (mutationError) => {
      setNotice(mutationError instanceof Error ? mutationError.message : 'Unable to fulfill this order.')
    },
  })

  const receiptMutation = useMutation({
    mutationFn: (taskId: string) => api.logistics.issueTaskReceipt(taskId, currentUser),
    onSuccess: async ({ order, sale }) => {
      await refreshDashboards()
      setNotice(`Receipt ${sale.externalReceiptId} issued by ${order.receiptIssuedByName}.`)
    },
    onError: (mutationError) => {
      setNotice(mutationError instanceof Error ? mutationError.message : 'Unable to issue this receipt.')
    },
  })

  const outlets = data?.outlets ?? []
  const visibleOutlets = outlets.filter((outlet) =>
    selectedOutletId === 'all' || outlet.id === selectedOutletId
  )
  const visibleOutletIds = new Set(visibleOutlets.map((outlet) => outlet.id))
  const tasks = (data?.tasks ?? []).filter((task) => visibleOutletIds.has(task.outletId))

  if (isLoading) return <p className="p-6 text-sm text-slate-500">Loading Logistics orders…</p>

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load Logistics orders. Check your assigned company, branch, and department access.
      </div>
    )
  }

  if (outlets.length === 0) {
    return (
      <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Logistics access not available</h2>
        <p className="mt-2 text-sm text-slate-500">
          Website orders are available to assigned Logistics employees and scoped managers.
        </p>
      </div>
    )
  }

  const readyToFulfill = tasks.filter((task) => task.status === 'ready_to_fulfill').length
  const awaitingReceipt = tasks.filter((task) => task.status === 'fulfilled').length
  const completed = tasks.filter((task) => task.status === 'receipt_issued').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Logistics & Fulfillment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Only paid website orders that require delivery appear here. Instant online orders stay in Web Orders.
          </p>
        </div>
        <label className="min-w-64 text-xs font-semibold text-slate-600">
          Outlet scope
          <select
            value={selectedOutletId}
            onChange={(event) => setSelectedOutletId(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
          >
            <option value="all">All assigned outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>{outlet.name} · {outlet.workLocation}</option>
            ))}
          </select>
        </label>
      </div>

      {data?.dataMode === 'demo' && (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Demo mode: these fulfillment tasks and receipt numbers are synthetic; nothing is sent to Loyverse.
        </div>
      )}
      {notice && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">Ready to fulfill</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{readyToFulfill}</p>
            </div>
            <Truck className="h-5 w-5 text-sky-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">Fulfilled; receipt pending</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{awaitingReceipt}</p>
            </div>
            <PackageCheck className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">Receipt issued</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{completed}</p>
            </div>
            <ReceiptText className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paid delivery tasks</CardTitle>
          <CardDescription>Each fulfillment and receipt action records the responsible employee.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 && <p className="text-sm text-slate-500">No paid delivery tasks in this scope.</p>}
          {tasks.map((order) => {
            const access = data?.taskAccess[order.id]
            const busy = fulfillMutation.isPending || receiptMutation.isPending
            return (
              <article key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{order.sourceOrderId}</h3>
                    <p className="text-xs text-slate-500">
                      {order.sourceDomain} · {order.customerLabel} · {outlets.find((outlet) => outlet.id === order.outletId)?.name}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">Ordered {formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${ORDER_STATUS_STYLES[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
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

                {order.fulfilledByName && (
                  <p className="mb-1 text-xs text-slate-600">
                    Fulfilled by {order.fulfilledByName}{order.fulfilledAt ? ` · ${formatDate(order.fulfilledAt)}` : ''}
                  </p>
                )}
                {order.receiptIssuedByName && (
                  <p className="mb-3 text-xs text-slate-600">
                    Receipt {order.receiptId} issued by {order.receiptIssuedByName}
                  </p>
                )}
                {order.reviewNote && <p className="mb-2 text-xs text-rose-700">{order.reviewNote}</p>}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="font-bold text-slate-900">{formatMoney(order.total)}</p>
                    <p className="text-[10px] text-slate-500">Verified payment: {order.paymentReference ?? 'confirmed'}</p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'ready_to_fulfill' && access?.canFulfill && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => fulfillMutation.mutate(order.id)}
                      >
                        Mark fulfilled
                      </Button>
                    )}
                    {order.status === 'fulfilled' && access?.canIssueReceipt && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => receiptMutation.mutate(order.id)}
                      >
                        Issue Loyverse receipt
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
