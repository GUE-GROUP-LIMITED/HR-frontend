import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '@/services/api'
import { MockApiService } from '@/services/mockAdapter'
import { INITIAL_USERS } from '@/services/mockData'
import { canManageStaffMember } from '@/lib/access'
import {
  DEMO_PAYROLL_PERIOD,
  GROUP_HEAD_DEMO_USER,
  WORKBOOK_ROLE_DEMO_USERS,
  WORKBOOK_STAFF_DIRECTORY,
} from '@/services/operationsData'

describe('GUE HR API & Service Layer', () => {
  beforeEach(() => {
    MockApiService.resetData()
  })

  describe('Recruitment workflow', () => {
    const hrUser = INITIAL_USERS.find((user) => user.role === 'hr')!

    it('restricts candidate records to active HR and Super Admin users', async () => {
      const staffUser = INITIAL_USERS.find((user) => user.role === 'staff')!
      await expect(api.recruitment.list(staffUser)).rejects.toThrow('active HR and Super Admin')

      const records = await api.recruitment.list(hrUser)
      expect(records.openings.length).toBeGreaterThan(0)
      expect(records.applications.length).toBeGreaterThan(0)
    })

    it('gates offers on completed evaluations and starts onboarding after acceptance', async () => {
      await expect(api.recruitment.issueOffer('application-demo-002', hrUser))
        .rejects.toThrow('Complete the scheduled interview and evaluation')

      await api.recruitment.moveToScreening('application-demo-001', hrUser)
      await api.recruitment.scheduleInterview('application-demo-001', {
        scheduledAt: '2026-12-01T10:00:00.000Z',
        interviewer: 'Demo Hiring Panel',
      }, hrUser)
      await api.recruitment.recordInterview('application-demo-001', {
        rating: 4,
        feedback: 'Meets the role criteria and demonstrated relevant experience.',
      }, hrUser)

      const offer = await api.recruitment.issueOffer('application-demo-001', hrUser)
      expect(offer.stage).toBe('offer_pending')
      expect(offer.offer?.response).toBe('awaiting_response')

      const hired = await api.recruitment.respondToOffer('application-demo-001', 'accepted', hrUser)
      expect(hired.stage).toBe('hired')
      expect(hired.onboarding?.tasks).toHaveLength(5)
      expect(hired.onboarding?.tasks.every((task) => !task.isComplete)).toBe(true)

      const task = hired.onboarding!.tasks[0]
      const updated = await api.recruitment.updateOnboardingTask(
        hired.id,
        task.id,
        true,
        hrUser
      )
      expect(updated.onboarding?.tasks.find((item) => item.id === task.id)?.isComplete).toBe(true)
      await expect(api.recruitment.respondToOffer('application-demo-001', 'accepted', hrUser))
        .rejects.toThrow('no offer awaiting a response')
    })

    it('rejects invalid interview evaluations and duplicate candidate applications', async () => {
      await expect(api.recruitment.recordInterview('application-demo-002', {
        rating: 6,
        feedback: 'Invalid rating.',
      }, hrUser)).rejects.toThrow('rating from 1 to 5')

      await expect(api.recruitment.createApplication({
        openingId: 'opening-education-trainer',
        candidateName: 'Duplicate Demo Candidate',
        candidateEmail: 'candidate.one@example.invalid',
      }, hrUser)).rejects.toThrow('already has an application')
    })

    it('requires a reason to close an application and prevents later progression', async () => {
      await expect(api.recruitment.rejectApplication('application-demo-001', '  ', hrUser))
        .rejects.toThrow('Provide a reason')

      const rejected = await api.recruitment.rejectApplication(
        'application-demo-001',
        'Required certification was not demonstrated.',
        hrUser
      )
      expect(rejected.stage).toBe('rejected')
      expect(rejected.rejectionReason).toBe('Required certification was not demonstrated.')
      await expect(api.recruitment.moveToScreening('application-demo-001', hrUser))
        .rejects.toThrow('Only new applications can move to screening')
    })
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

    it('creates a routed internal request and filters it separately from public messages', async () => {
      const requester = INITIAL_USERS.find((user) => user.id === 'u2')!
      const request = await api.messages.createInternalRequest(
        {
          category_id: 'c12',
          target_unit_id: 'gue-cyber',
          assignee_id: 'workbook-staff-39',
          subject: 'Review device access',
          message: 'Please review access for the shared device.',
        },
        requester
      )

      const detail = await api.messages.get(request.message_id)
      expect(detail.message).toMatchObject({
        source_type: 'internal',
        source_unit_name: 'GUE Group Limited',
        target_unit_name: 'GUE Cyber Limited',
        category_id: 'c12',
        assigned_to: { id: 'workbook-staff-39' },
      })

      const internalMessages = await api.messages.list({ source_type: 'internal' })
      const publicMessages = await api.messages.list({ source_type: 'public' })
      expect(internalMessages.data.some((message) => message.id === request.message_id)).toBe(true)
      expect(publicMessages.data.some((message) => message.id === request.message_id)).toBe(false)
    })

    it('rejects internal requests assigned outside the selected destination scope', async () => {
      const requester = INITIAL_USERS.find((user) => user.id === 'u2')!
      await expect(
        api.messages.createInternalRequest(
          {
            category_id: 'c12',
            target_unit_id: 'gue-cyber',
            assignee_id: 'u4',
            subject: 'Review device access',
            message: 'Please review access for the shared device.',
          },
          requester
        )
      ).rejects.toThrow('The selected assignee is not assigned to the destination unit')
    })

    it('records an external request and limits it to the requester and scoped managers', async () => {
      const requester = WORKBOOK_STAFF_DIRECTORY.find(
        (user) => user.company_id === 'guemoni' && user.job_title === 'UBA Moni Agent'
      )!
      const manager = WORKBOOK_ROLE_DEMO_USERS.find(
        (user) => user.role === 'operations_manager'
      )!
      const outOfScopeManager = WORKBOOK_ROLE_DEMO_USERS.find(
        (user) => user.id === 'workbook-staff-52'
      )!
      const unrelatedStaff = INITIAL_USERS.find((user) => user.id === 'u5')!

      const request = await api.messages.createExternalRequest(
        {
          category_id: 'c18',
          organization_name: 'UBA',
          subject: 'Agent terminal not connecting',
          message: 'The agent terminal at the Wannune branch is not connecting.',
        },
        requester
      )

      const ownRequest = await api.messages.get(request.message_id, requester)
      expect(ownRequest.message).toMatchObject({
        source_type: 'external',
        requester_id: requester.id,
        source_company_id: 'guemoni',
        external_organization: 'UBA',
        status: 'new',
      })

      const managerRequests = await api.messages.list({ source_type: 'external' }, manager)
      const unrelatedRequests = await api.messages.list(
        { source_type: 'external' },
        unrelatedStaff
      )
      const outOfScopeRequests = await api.messages.list(
        { source_type: 'external' },
        outOfScopeManager
      )
      expect(managerRequests.data.some((message) => message.id === request.message_id)).toBe(true)
      expect(unrelatedRequests.data.some((message) => message.id === request.message_id)).toBe(false)
      expect(outOfScopeRequests.data.some((message) => message.id === request.message_id)).toBe(false)
      await expect(api.messages.get(request.message_id, unrelatedStaff))
        .rejects.toThrow('Message with ID')
    })
  })

  describe('Staff job descriptions', () => {
    it('backfills demo job titles for older saved profiles and searches by title', async () => {
      localStorage.setItem(
        'gue_hr_users_v1',
        JSON.stringify(
          INITIAL_USERS.map((user) => ({
            ...user,
            job_title: undefined,
            company_id: undefined,
          }))
        )
      )

      const staff = await api.staff.list({ q: 'Technical Operations Engineer (Demo)' })
      expect(staff).toHaveLength(1)
      expect(staff[0].name).toBe('Alex Chen')
      expect(staff[0].job_title).toBe('Technical Operations Engineer (Demo)')
    })

    describe('Workforce governance', () => {
      it('limits profile edits to managers in scope and reserves personal dates for HR', async () => {
        const manager = WORKBOOK_ROLE_DEMO_USERS.find((user) => user.role === 'branch_manager')!
        const staff = WORKBOOK_STAFF_DIRECTORY.find(
          (user) => user.role === 'staff' && canManageStaffMember(manager, user)
        )!

        const updated = await api.staff.update(
          staff.id,
          { job_title: 'Updated role for test' },
          manager
        )
        expect(updated.job_title).toBe('Updated role for test')
        await expect(api.staff.update(
          staff.id,
          { date_of_birth: '1990-01-01' },
          manager
        )).rejects.toThrow('Only HR can update date-of-birth and hire-date fields')
        await expect(api.staff.update(
          staff.id,
          { work_location: 'A new branch' },
          manager
        )).rejects.toThrow('Use the transfer workflow')
        await expect(api.staff.update(
          staff.id,
          { job_title: 'Out of scope edit' },
          WORKBOOK_ROLE_DEMO_USERS.find((user) =>
            user.role === 'branch_manager' && !canManageStaffMember(user, staff)
          )!
        )).rejects.toThrow('You do not have permission to edit this staff member')
      })

      it('requires HR and executive approval before deactivating an account', async () => {
        const manager = WORKBOOK_ROLE_DEMO_USERS.find((user) => user.role === 'branch_manager')!
        const staff = WORKBOOK_STAFF_DIRECTORY.find(
          (user) => user.role === 'staff' && canManageStaffMember(manager, user)
        )!
        const request = await api.staff.requestTermination(
          staff.id,
          'Position is no longer required.',
          manager
        )
        expect(request.status).toBe('pending_hr')
        expect((await api.staff.list()).find((user) => user.id === staff.id)?.is_active).toBe(true)

        const hrReview = await api.staff.decideTermination(
          request.id,
          { decision: 'approved' },
          INITIAL_USERS.find((user) => user.role === 'hr')!
        )
        expect(hrReview.status).toBe('pending_executive')
        expect((await api.staff.list()).find((user) => user.id === staff.id)?.is_active).toBe(true)

        const finalReview = await api.staff.decideTermination(
          request.id,
          { decision: 'approved' },
          GROUP_HEAD_DEMO_USER
        )
        expect(finalReview).toMatchObject({
          status: 'approved',
          email_status: 'simulated',
        })
        expect((await api.staff.list()).find((user) => user.id === staff.id)?.is_active).toBe(false)
      })

      it('records transfers and promotions with a simulated letter and celebration', async () => {
        const staff = WORKBOOK_STAFF_DIRECTORY.find((user) => user.role === 'staff')!
        const transfer = await api.staff.transfer(staff.id, {
          company_id: 'gue-farming',
          unit_id: 'gue-farming',
          work_location: 'Wannune',
          department: 'Agriculture',
          job_title: 'Farm Operations Associate',
          effective_date: new Date().toISOString().slice(0, 10),
          reason: 'Operational staffing requirement.',
        }, GROUP_HEAD_DEMO_USER)
        expect(transfer).toMatchObject({
          staff: { company_id: 'gue-farming', job_title: 'Farm Operations Associate' },
          email_status: 'simulated',
        })
        expect(transfer.letter_text).toContain('STAFF TRANSFER LETTER')

        const promoted = await api.staff.promote(staff.id, {
          new_job_title: 'Senior Farm Operations Associate',
          effective_date: new Date().toISOString().slice(0, 10),
          reason: 'Successful performance review.',
        }, GROUP_HEAD_DEMO_USER)
        expect(promoted.promotion_history?.at(-1)?.new_job_title)
          .toBe('Senior Farm Operations Associate')
        expect((await api.notifications.list(staff)).some((item) =>
          item.title === 'Congratulations on your promotion'
        )).toBe(true)
      })

      it('requires a reason when a branch manager requests higher-rank attendance', async () => {
        const organizer = WORKBOOK_ROLE_DEMO_USERS.find((user) => user.role === 'branch_manager')!
        const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const basePayload = {
          kind: 'meeting' as const,
          title: 'Quarterly planning',
          description: 'Review unit priorities and resource needs.',
          starts_at: startsAt.toISOString(),
          ends_at: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
          audience: 'scoped_team' as const,
          invitee_ids: [GROUP_HEAD_DEMO_USER.id],
        }

        await expect(api.meetings.create(basePayload, organizer))
          .rejects.toThrow('Explain why the higher-rank officer needs to attend')

        const { meeting } = await api.meetings.create({
          ...basePayload,
          higher_invite_reason: 'Approval is needed for the proposed unit budget.',
        }, organizer)
        expect(meeting.invitees).toContainEqual(expect.objectContaining({
          user_id: GROUP_HEAD_DEMO_USER.id,
          status: 'pending_response',
        }))
        const accepted = await api.meetings.respond(meeting.id, 'accepted', GROUP_HEAD_DEMO_USER)
        expect(accepted.invitees.find((invitee) => invitee.user_id === GROUP_HEAD_DEMO_USER.id)?.status)
          .toBe('accepted')
        const higherOfficerNotifications = await api.notifications.list(GROUP_HEAD_DEMO_USER)
        const organizerNotifications = await api.notifications.list(organizer)
        expect(higherOfficerNotifications.some((item) =>
          item.title === 'Meeting attendance requested' && item.message.includes(meeting.title)
        )).toBe(true)
        expect(organizerNotifications.some((item) =>
          item.title === 'Meeting attendance requested' && item.message.includes(meeting.title)
        )).toBe(false)
      })

      it('sends birthday and work-anniversary notifications once per year', async () => {
        const staff = WORKBOOK_STAFF_DIRECTORY.find((user) => user.role === 'staff')!
        const today = new Date()
        const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const hr = INITIAL_USERS.find((user) => user.role === 'hr')!
        await api.staff.update(staff.id, {
          date_of_birth: `1990-${monthDay}`,
          hire_date: `${today.getFullYear() - 2}-${monthDay}`,
        }, hr)

        await api.notifications.list(staff)
        await api.notifications.list(staff)
        const notifications = await api.notifications.list(staff)
        expect(notifications.filter((item) => item.title === 'Happy birthday!')).toHaveLength(1)
        expect(notifications.filter((item) => item.title === '2-year work anniversary')).toHaveLength(1)
      })
    })

    describe('Final payroll approval', () => {
      it('simulates one payslip delivery per staff member only after group approval', async () => {
        const readyPeriod = {
          ...DEMO_PAYROLL_PERIOD,
          submissions: DEMO_PAYROLL_PERIOD.submissions.map((submission) => ({
            ...submission,
            status: 'entity_head_approved' as const,
          })),
        }
        const approved = await api.payroll.approveGroup(readyPeriod, GROUP_HEAD_DEMO_USER)

        expect(approved.groupApproval?.userId).toBe(GROUP_HEAD_DEMO_USER.id)
        expect(approved.payslipDelivery).toMatchObject({
          status: 'simulated',
          recipientCount: 53,
        })
        await expect(api.payroll.approveGroup(readyPeriod, INITIAL_USERS[1]))
          .rejects.toThrow('You are not authorized to give final group payroll approval')
      })
    })
  })

  describe('Public Contact Intake (API 7.1)', () => {
    it('accepts intake from a registered website with site key and auto-routes', async () => {
      const intake = await api.publicIntake.submit({
        name: 'Tunde Bakare',
        email: 'tunde@lagosfintech.com',
        phone: '+234 1 234 5678',
        subject: 'Enterprise API Access Proposal',
        message: 'We are requesting white-label API partnership documentation.',
        category: 'c2', // Partnerships
        website_key: 'gk_demo_cyber',
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
    it('retrieves all ten company websites with their registered domains', async () => {
      const websites = await api.websites.list()

      expect(websites).toHaveLength(10)
      expect(websites.map((website) => website.domain)).toEqual([
        'www.guegroup.com',
        'cyber.guegroup.com',
        'edu.guegroup.com',
        'stc.edu.guegroup.com',
        'eng.guegroup.com',
        'farm.guegroup.com',
        'ind.guegroup.com',
        'mobility.guegroup.com',
        'moni.guegroup.com',
        'realty.guegroup.com',
      ])
    })

    it('updates legacy demo websites without losing their intake keys', async () => {
      localStorage.setItem(
        'gue_hr_websites_v1',
        JSON.stringify([
          {
            id: 'w1',
            name: 'GUE Global Corporate',
            domain: 'corporate.gueholdings.com',
            site_key: 'existing-demo-key',
            is_active: true,
            created_at: '2026-08-12T09:00:00Z',
          },
        ])
      )

      const websites = await api.websites.list()

      expect(websites).toHaveLength(10)
      expect(websites[0]).toMatchObject({
        name: 'GUE Group Limited',
        domain: 'www.guegroup.com',
        site_key: 'existing-demo-key',
      })
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

