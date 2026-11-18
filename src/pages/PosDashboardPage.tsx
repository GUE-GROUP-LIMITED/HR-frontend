import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleDollarSign, ReceiptText, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { PosPaymentMethod, PosSale } from '@/types/pos'

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount)

const formatDate = (value: string) => new Date(value).toLocaleString()

type InPersonPaymentMethod = Exclude<PosPaymentMethod, 'online'>

const isInPersonPaymentMethod = (value: string): value is InPersonPaymentMethod =>
  value === 'cash' || value === 'bank_transfer' || value === 'pos_terminal'

export const PosDashboardPage: React.FC = () => {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [reportOutletId, setReportOutletId] = useState('all')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<InPersonPaymentMethod>('cash')
  const [notice, setNotice] = useState('')
  const [lastSale, setLastSale] = useState<PosSale | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['pos-dashboard', currentUser.id],
    queryFn: () => api.pos.dashboard(currentUser),
  })

  const saleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.pos.createSale>[0]) =>
      api.pos.createSale(payload, currentUser),
    onSuccess: async (sale) => {
      await queryClient.invalidateQueries({ queryKey: ['pos-dashboard', currentUser.id] })
      setQuantities({})
      setLastSale(sale)
      setNotice(`Sale recorded. Receipt ${sale.externalReceiptId} issued.`)
    },
    onError: (mutationError) => {
      setNotice(mutationError instanceof Error ? mutationError.message : 'Unable to record this sale.')
    },
  })

  const outlets = data?.outlets ?? []
  const selectedOutlet = outlets.find((outlet) => outlet.id === selectedOutletId) ?? outlets[0]
  const selectedOutletAccess = selectedOutlet ? data?.outletAccess?.[selectedOutlet.id] : undefined
  const canSellHere = selectedOutletAccess?.canSell ?? false
  const summaryOutlets = outlets.filter((outlet) => data?.outletAccess?.[outlet.id]?.canViewSummary)
  const canSeeSummary = summaryOutlets.length > 0
  const reportOutletIds = new Set(
    canSeeSummary
      ? reportOutletId === 'all'
        ? summaryOutlets.map((outlet) => outlet.id)
        : [reportOutletId]
      : selectedOutlet ? [selectedOutlet.id] : []
  )
  const sales = (data?.sales ?? []).filter((sale) => reportOutletIds.has(sale.outletId))
  const catalog = (data?.catalog ?? []).filter((item) => item.outletId === selectedOutlet?.id)
  const cartLines = catalog
    .filter((item) => (quantities[item.id] ?? 0) > 0)
    .map((item) => ({
      itemId: item.id,
      itemName: item.name,
      quantity: quantities[item.id],
      unitPrice: item.unitPrice,
    }))
  const saleTotal = cartLines.reduce((total, line) => total + line.unitPrice * line.quantity, 0)
  const todaySales = sales.filter((sale) => sale.soldAt.slice(0, 10) === today)
  const grossToday = todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const salesByStaff = new Map<string, { name: string; outlet: string; count: number; total: number }>()
  for (const sale of todaySales) {
    const outletName = outlets.find((outlet) => outlet.id === sale.outletId)?.name ?? sale.outletId
    const current = salesByStaff.get(sale.sellerId) ?? {
      name: sale.sellerName,
      outlet: outletName,
      count: 0,
      total: 0,
    }
    current.count += 1
    current.total += sale.total
    salesByStaff.set(sale.sellerId, current)
  }

  if (isLoading) return <p className="p-6 text-sm text-slate-500">Loading POS dashboard…</p>

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load POS data. Check the secure Loyverse integration and your outlet access.
      </div>
    )
  }

  if (outlets.length === 0 || !selectedOutlet) {
    return (
      <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">POS access not available</h2>
        <p className="mt-2 text-sm text-slate-500">
          POS data is limited to assigned sellers and managers within their company, branch, and location scope.
        </p>
      </div>
    )
  }

  const renderSale = (sale: PosSale) => (
    <tr key={sale.id} className="border-t border-slate-100">
      {canSeeSummary && reportOutletId === 'all' && (
        <td className="px-4 py-3 text-slate-600">
          {outlets.find((outlet) => outlet.id === sale.outletId)?.name ?? sale.outletId}
        </td>
      )}
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-800">{sale.externalReceiptId}</p>
        <p className="text-[10px] capitalize text-slate-400">{sale.channel.replace('_', ' ')}</p>
      </td>
      <td className="px-4 py-3 text-slate-600">{sale.sellerName}</td>
      <td className="px-4 py-3 capitalize text-slate-600">{sale.paymentMethod.replace('_', ' ')}</td>
      <td className="px-4 py-3 text-slate-500">{formatDate(sale.soldAt)}</td>
      <td className="px-4 py-3 text-right font-bold text-slate-900">{formatMoney(sale.total)}</td>
    </tr>
  )

  return (
    <div>
      <div className="space-y-6 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Point of Sale</h2>
          <p className="mt-1 text-sm text-slate-500">
            Make in-person sales and issue receipts here. Website orders have a separate Logistics fulfillment workflow.
          </p>
        </div>
        <label className="min-w-64 text-xs font-semibold text-slate-600">
          Selling outlet
          <select
            value={selectedOutlet.id}
            onChange={(event) => {
              setSelectedOutletId(event.target.value)
              setQuantities({})
            }}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} · {outlet.workLocation}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data?.dataMode === 'demo' && (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Demo mode: sample products, prices, sales, and receipts are synthetic. Nothing is sent to Loyverse or charged to a customer.
        </div>
      )}
      {notice && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
          <span>{notice}</span>
          {lastSale && (
            <Button size="sm" onClick={() => window.print()}>Print customer receipt</Button>
          )}
        </div>
      )}

      {canSellHere && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-600" />New sale</CardTitle>
            <CardDescription>
              Select items and payment method. The secure backend validates the current Loyverse catalog and creates the receipt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {catalog.length === 0 ? (
              <p className="text-sm text-slate-500">No catalog items are available for this outlet.</p>
            ) : (
              <div className="space-y-2">
                {catalog.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {item.category} · {formatMoney(item.unitPrice)}
                        {item.trackStock ? ` · Stock ${item.stockOnHand ?? 'unavailable'}` : ''}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                      Qty
                      <input
                        type="number"
                        min="0"
                        max={item.trackStock ? item.stockOnHand : undefined}
                        value={quantities[item.id] ?? 0}
                        onChange={(event) => {
                          const quantity = Number(event.target.value)
                          setQuantities((current) => ({ ...current, [item.id]: quantity }))
                        }}
                        className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-xs text-slate-900"
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
              <label className="text-xs font-semibold text-slate-600">
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => {
                    if (isInPersonPaymentMethod(event.target.value)) {
                      setPaymentMethod(event.target.value)
                    }
                  }}
                  className="mt-1 block h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-xs"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="pos_terminal">POS terminal</option>
                </select>
              </label>
              <div className="flex items-center gap-4">
                <p className="text-sm font-extrabold text-slate-900">Total: {formatMoney(saleTotal)}</p>
                <Button
                  disabled={saleMutation.isPending || cartLines.length === 0 || saleTotal <= 0}
                  onClick={() => {
                    setNotice('')
                    saleMutation.mutate({
                      outletId: selectedOutlet.id,
                      lines: cartLines.map(({ itemId, quantity }) => ({ itemId, quantity })),
                      paymentMethod,
                    })
                  }}
                >
                  {saleMutation.isPending ? 'Recording…' : 'Complete sale & issue receipt'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">{canSeeSummary ? 'Sales today' : 'Your sales today'}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{todaySales.length}</p>
            </div>
            <ReceiptText className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold text-slate-500">{canSeeSummary ? 'Gross sales today' : 'Your gross today'}</p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">{formatMoney(grossToday)}</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      {canSeeSummary && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Sales overview</CardTitle>
              <CardDescription>Summary follows your assigned branch, company, operations, or group scope.</CardDescription>
            </div>
            <label className="min-w-48 text-xs font-semibold text-slate-600">
              Report scope
              <select
                value={reportOutletId}
                onChange={(event) => setReportOutletId(event.target.value)}
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="all">All authorized outlets</option>
                {summaryOutlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                ))}
              </select>
            </label>
          </CardHeader>
          <CardContent>
            {salesByStaff.size === 0 ? (
              <p className="text-sm text-slate-500">No sales recorded in this scope today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                    <tr>
                      {reportOutletId === 'all' && <th className="px-4 py-2">Outlet</th>}
                      <th className="px-4 py-2">Employee</th>
                      <th className="px-4 py-2">Receipts</th>
                      <th className="px-4 py-2 text-right">Gross sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...salesByStaff.entries()].map(([staffId, item]) => (
                      <tr key={staffId} className="border-t border-slate-100">
                        {reportOutletId === 'all' && <td className="px-4 py-3 text-slate-600">{item.outlet}</td>}
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.count}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receipt history</CardTitle>
          <CardDescription>{canSeeSummary ? 'Sales within your authorized reporting scope.' : 'Your own sales only.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-slate-500">No receipt history is available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    {canSeeSummary && reportOutletId === 'all' && <th className="px-4 py-2">Outlet</th>}
                    <th className="px-4 py-2">Receipt</th>
                    <th className="px-4 py-2">Issued by</th>
                    <th className="px-4 py-2">Payment</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>{sales.map(renderSale)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {lastSale && (
        <section className="pos-receipt-print hidden max-w-sm bg-white p-8 text-slate-900">
          <h1 className="text-center text-xl font-bold">
            {outlets.find((outlet) => outlet.id === lastSale.outletId)?.companyName ?? 'GUE Group Limited'}
          </h1>
          <p className="mt-1 text-center text-xs">
            {outlets.find((outlet) => outlet.id === lastSale.outletId)?.name ?? lastSale.outletId}
          </p>
          <p className="mt-4 text-xs">Receipt: {lastSale.externalReceiptId}</p>
          <p className="text-xs">Date: {formatDate(lastSale.soldAt)}</p>
          <p className="text-xs">Served by: {lastSale.sellerName}</p>
          <p className="text-xs">Payment: {lastSale.paymentMethod.replace('_', ' ')}</p>
          <div className="my-4 border-t border-dashed border-slate-400" />
          {lastSale.lines.map((line) => (
            <div key={line.itemId} className="flex justify-between gap-3 py-1 text-xs">
              <span>{line.quantity} × {line.itemName}</span>
              <span>{formatMoney(line.lineTotal)}</span>
            </div>
          ))}
          <div className="my-3 border-t border-dashed border-slate-400" />
          <div className="flex justify-between text-sm font-bold">
            <span>Total paid</span>
            <span>{formatMoney(lastSale.total)}</span>
          </div>
          <p className="mt-4 text-center text-xs">Thank you for your business.</p>
        </section>
      )}
    </div>
  )
}
