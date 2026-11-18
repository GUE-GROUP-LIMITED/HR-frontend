export type PosPaymentMethod = 'cash' | 'bank_transfer' | 'pos_terminal' | 'online'

export interface PosOutlet {
  id: string
  companyId: string
  companyName: string
  unitId: string
  name: string
  workLocation: string
  websiteDomain: string
}

export interface PosCatalogItem {
  id: string
  outletId: string
  externalItemId: string
  name: string
  category: string
  unitPrice: number
  trackStock: boolean
  stockOnHand?: number
  isAgencyBankingPrincipal?: boolean
  source: 'loyverse' | 'demo'
}

export interface PosSaleLine {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PosSale {
  id: string
  externalReceiptId: string
  outletId: string
  sellerId: string
  sellerName: string
  channel: 'in_person' | 'online'
  paymentMethod: PosPaymentMethod
  total: number
  currency: 'NGN'
  lines: PosSaleLine[]
  soldAt: string
  source: 'loyverse' | 'demo'
  sourceOrderId?: string
}

export interface PosSaleCreatePayload {
  outletId: string
  lines: Array<{ itemId: string; quantity: number }>
  paymentMethod: Exclude<PosPaymentMethod, 'online'>
}

export interface PosDashboardData {
  outlets: PosOutlet[]
  outletAccess: Record<string, { canSell: boolean; canViewSummary: boolean }>
  catalog: PosCatalogItem[]
  sales: PosSale[]
  dataMode: 'demo' | 'live'
}
