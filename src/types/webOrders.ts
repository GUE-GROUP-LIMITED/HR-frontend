import { PosOutlet } from '@/types/pos'

export type WebOrderPaymentStatus = 'pending' | 'verified' | 'failed'
export type WebOrderFulfillmentMode = 'instant' | 'requires_logistics'
export type WebOrderStatus =
  | 'payment_pending'
  | 'payment_failed'
  | 'completed'
  | 'ready_to_fulfill'
  | 'fulfilled'
  | 'receipt_issued'
  | 'needs_review'

export interface WebOrderLine {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
}

export interface WebOrder {
  id: string
  sourceOrderId: string
  sourceDomain: string
  outletId: string
  customerLabel: string
  fulfillmentMode: WebOrderFulfillmentMode
  paymentStatus: WebOrderPaymentStatus
  status: WebOrderStatus
  total: number
  currency: 'NGN'
  lines: WebOrderLine[]
  createdAt: string
  paymentReference?: string
  fulfilledById?: string
  fulfilledByName?: string
  fulfilledAt?: string
  receiptIssuedById?: string
  receiptIssuedByName?: string
  receiptIssuedAt?: string
  receiptId?: string
  reviewNote?: string
}

export interface WebOrdersDashboardData {
  outlets: PosOutlet[]
  orders: WebOrder[]
  dataMode: 'demo' | 'live'
}
