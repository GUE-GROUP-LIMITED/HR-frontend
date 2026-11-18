import { PosOutlet } from '@/types/pos'
import { WebOrder } from '@/types/webOrders'

export interface LogisticsDashboardData {
  outlets: PosOutlet[]
  tasks: WebOrder[]
  taskAccess: Record<string, { canFulfill: boolean; canIssueReceipt: boolean }>
  dataMode: 'demo' | 'live'
}
