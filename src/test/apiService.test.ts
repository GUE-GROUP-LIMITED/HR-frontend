import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '@/services/api'
import { MockApiService } from '@/services/mockAdapter'

describe('GUE HR API & Service Layer', () => {
  beforeEach(() => {
    MockApiService.resetData()
  })

  describe('Messages Service', () => {
    it('retrieves messages list with meta pagination', async () => {
      const response = await api.messages.list()
      expect(response).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
      expect(response.meta?.total).toBeGreaterThanOrEqual(response.data.length)
    })

    it('filters messages by website_id', async () => {
      const res = await api.messages.list({ website_id: 'w2' })
      expect(res.data.every((m) => m.website_id === 'w2')).toBe(true)
    })

    it('filters messages by status', async () => {
      const res = await api.messages.list({ status: 'new' })
      expect(res.data.every((m) => m.status === 'new')).toBe(true)
    })

    it('retrieves detailed message with responses, notes, and events', async () => {
      const detail = await api.messages.get('msg_101')
      expect(detail.message).toBeDefined()
      expect(detail.message.id).toBe('msg_101')
      expect(Array.isArray(detail.responses)).toBe(true)
      expect(Array.isArray(detail.notes)).toBe(true)
      expect(Array.isArray(detail.events)).toBe(true)
    })

    it('assigns message to staff member and updates status', async () => {
      const updated = await api.messages.assign('msg_103', 'u3', {
        id: 'u2',
        name: 'Elena Rostova',
      })
      expect(updated.assigned_to?.id).toBe('u3')
      expect(updated.status).toBe('assigned')

      // Check event was recorded
      const detail = await api.messages.get('msg_103')
      const assignEvent = detail.events.find((e:any) => e.action === 'assigned')
      expect(assignEvent).toBeDefined()
    })

    it('updates message status to resolved and records resolved_at timestamp', async () => {
      const updated = await api.messages.updateStatus('msg_101', 'resolved', {
        id: 'u3',
        name: 'Chika Nwosu',
      })
      expect(updated.status).toBe('resolved')
      expect(updated.resolved_at).toBeDefined()
    })

    it('sends an official response and sets first_response flag', async () => {
      const resp = await api.messages.sendResponse(
        'msg_103',
        { body: 'Thanks for reaching out! We are investigating.', send_to_sender: true },
        { id: 'u5', name: 'Alex Chen' }
      )
      expect(resp.body).toContain('investigating')
      expect(resp.sent_to_sender).toBe(true)
      expect(resp.first_response).toBe(true)

      const detail = await api.messages.get('msg_103')
      expect(detail.message.first_response_at).toBeDefined()
      expect(detail.message.responses_count).toBeGreaterThan(0)
    })
  })

  describe('Public Contact Intake (API 7.1)', () => {
    it('accepts intake from one of the 4 websites with site key and auto-routes', async () => {
      const intake = await api.publicIntake.submit({
        name: 'Tunde Bakare',
        email: 'tunde@lagosfintech.com',
        phone: '+234 1 234 5678',
        subject: 'Enterprise API Access Proposal',
        message: 'We are requesting white-label API partnership documentation.',
        category: 'c2', // Partnerships
        website_key: 'gk_live_shop_33190ab78f3c',
      })

      expect(intake.status).toBe('created')
      expect(intake.message_id).toBeDefined()

      // Verify in inbox
      const msg = await api.messages.get(intake.message_id)
      expect(msg.message.sender_name).toBe('Tunde Bakare')
      expect(msg.message.category_id).toBe('c2')
      expect(msg.message.assigned_to).toBeDefined() // Routed to default assignee for c2
    })
  })

  describe('Websites and Key Management (API 7.5)', () => {
    it('retrieves the 4 company websites', async () => {
      const websites = await api.websites.list()
      expect(websites.length).toBeGreaterThanOrEqual(4)
      expect(websites.some((w) => w.name.includes('Corporate'))).toBe(true)
      expect(websites.some((w) => w.name.includes('Commerce'))).toBe(true)
    })

    it('rotates site key for a website and records audit log', async () => {
      const before = (await api.websites.list()).find((w) => w.id === 'w1')!
      const rotated = await api.websites.rotateKey('w1')
      expect(rotated.site_key).not.toBe(before.site_key)

      const logs = await api.auditLogs.list()
      const rotateLog = logs.find((l) => l.action === 'ROTATED_SITE_KEY')
      expect(rotateLog).toBeDefined()
    })
  })

  describe('Response Monitoring (API 7.4c)', () => {
    it('calculates monitoring overview metrics accurately', async () => {
      const overview = await api.monitoring.getOverview()
      expect(overview.total_messages).toBeGreaterThan(0)
      expect(overview.counts_by_website.length).toBeGreaterThanOrEqual(4)
      expect(overview.sla_compliance_rate).toBeGreaterThan(0)
    })

    it('returns per-staff performance statistics', async () => {
      const staffList = await api.monitoring.getStaffList()
      expect(staffList.length).toBeGreaterThan(0)
      expect(staffList[0].staff_name).toBeDefined()
      expect(typeof staffList[0].avg_first_response_hours).toBe('number')
    })
  })
})

