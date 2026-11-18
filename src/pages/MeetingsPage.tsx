import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { canViewStaffMember, USER_ROLE_RANK } from '@/lib/access'
import { UserRole } from '@/types'
import { CreateMeetingPayload, MeetingResponse } from '@/types/api'
import { MeetingAudience, StaffMeeting } from '@/types/operations'

const canCreateMeeting = (role: UserRole) =>
  role === 'super_admin' ||
  role === 'group_head' ||
  role === 'operations_manager' ||
  role === 'subsidiary_head' ||
  role === 'company_manager' ||
  role === 'unit_head' ||
  role === 'branch_manager'

export const MeetingsPage: React.FC = () => {
  const { currentUser, allUsers } = useAuth()
  const { refreshNotifications } = useNotifications()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<'meeting' | 'event'>('meeting')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [location, setLocation] = useState('')
  const [audience, setAudience] = useState<MeetingAudience>('scoped_team')
  const [inviteeIds, setInviteeIds] = useState<string[]>([])
  const [includeBranchManagers, setIncludeBranchManagers] = useState(false)
  const [higherInviteReason, setHigherInviteReason] = useState('')
  const [notice, setNotice] = useState('')

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', currentUser.id],
    queryFn: () => api.meetings.list(currentUser),
  })
  const { data: staff = [] } = useQuery({
    queryKey: ['meeting-invitees'],
    queryFn: () => api.staff.list(),
  })

  const staffById = new Map([...allUsers, ...staff].map((user) => [user.id, user]))
  const uniqueInvitees = new Map<string, (typeof staff)[number]>()
  for (const user of staffById.values()) {
    const key = `${user.name.trim().toLowerCase()}:${user.role}`
    if (!uniqueInvitees.has(key)) uniqueInvitees.set(key, user)
  }
  const visibleInvitees = [...uniqueInvitees.values()].filter((user) =>
    user.is_active &&
    user.id !== currentUser.id &&
    (
      canViewStaffMember(currentUser, user) ||
      USER_ROLE_RANK[user.role] > USER_ROLE_RANK[currentUser.role]
    )
  )
  const hasHigherInvitee = inviteeIds.some((id) => {
    const invitee = visibleInvitees.find((user) => user.id === id)
    return invitee && USER_ROLE_RANK[invitee.role] > USER_ROLE_RANK[currentUser.role]
  })
  const canChooseGroupAudience = currentUser.role === 'group_head' || currentUser.role === 'super_admin'

  const createMutation = useMutation({
    mutationFn: (payload: CreateMeetingPayload) => api.meetings.create(payload, currentUser),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', currentUser.id] })
      await refreshNotifications()
      setTitle('')
      setDescription('')
      setInviteeIds([])
      setHigherInviteReason('')
      setNotice(`Invitation sent to ${result.notified_user_ids.length} staff member(s).`)
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Unable to create the meeting or event.'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ meetingId, response }: { meetingId: string; response: MeetingResponse }) =>
      api.meetings.respond(meetingId, response, currentUser),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', currentUser.id] })
      await refreshNotifications()
      setNotice('Your response was recorded.')
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : 'Unable to record your response.'),
  })

  const submitMeeting = (event: React.FormEvent) => {
    event.preventDefault()
    setNotice('')
    createMutation.mutate({
      kind,
      title,
      description,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      location,
      audience,
      invitee_ids: inviteeIds,
      include_branch_managers: includeBranchManagers,
      higher_invite_reason: higherInviteReason,
    })
  }

  const myInvite = (meeting: StaffMeeting) =>
    meeting.invitees.find((invitee) => invitee.user_id === currentUser.id)

  const changeInvitees = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setInviteeIds(Array.from(event.target.selectedOptions, (option) => option.value))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Meetings & Events</h2>
        <p className="mt-1 text-sm text-slate-500">
          Schedule scoped team meetings, group announcements, and attendance requests.
        </p>
      </div>

      {notice && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">{notice}</p>}

      {canCreateMeeting(currentUser.role) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a meeting or event</CardTitle>
            <CardDescription className="text-xs">
              Higher-ranking invitees receive a request with your reason and can accept or decline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitMeeting} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Type
                  <select value={kind} onChange={(event) => setKind(event.target.value as 'meeting' | 'event')} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
                    <option value="meeting">Meeting</option>
                    <option value="event">Event</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Audience
                  <select value={audience} onChange={(event) => setAudience(event.target.value as MeetingAudience)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
                    <option value="scoped_team">My scoped team</option>
                    {canChooseGroupAudience && <option value="company_managers_hq">Company managers & head office</option>}
                    {canChooseGroupAudience && <option value="group_wide">All active staff group-wide</option>}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Title
                <Input required value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Purpose and details
                <textarea required value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-xs" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-slate-700">
                  Starts
                  <Input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Ends
                  <Input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Location or link
                  <Input value={location} onChange={(event) => setLocation(event.target.value)} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    {audience === 'scoped_team'
                      ? 'Optional invitees (Ctrl/Cmd-click to select multiple)'
                      : 'Request attendance from higher-ranking officers (optional)'}
                    <select multiple size={5} value={inviteeIds} onChange={changeInvitees} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs">
                      {visibleInvitees
                        .filter((user) =>
                          audience === 'scoped_team' ||
                          USER_ROLE_RANK[user.role] > USER_ROLE_RANK[currentUser.role]
                        )
                        .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} — {user.role.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
              </div>
              {hasHigherInvitee && (
                <label className="block text-xs font-semibold text-slate-700">
                  Reason the higher-ranking officer is needed
                  <textarea required value={higherInviteReason} onChange={(event) => setHigherInviteReason(event.target.value)} className="mt-1 min-h-16 w-full rounded-xl border border-slate-200 p-3 text-xs" />
                </label>
              )}
              {audience === 'company_managers_hq' && currentUser.role === 'group_head' && (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={includeBranchManagers} onChange={(event) => setIncludeBranchManagers(event.target.checked)} />
                  Include branch managers.
                </label>
              )}
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Sending invitations...' : 'Create and notify invitees'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Your meetings and invitations</h3>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading meetings...</p>
        ) : meetings.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-slate-500">No meetings or invitations yet.</CardContent></Card>
        ) : meetings.map((meeting) => {
          const invite = myInvite(meeting)
          return (
            <Card key={meeting.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900">{meeting.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] capitalize text-slate-600">{meeting.kind}</span>
                  </div>
                  <p className="text-xs text-slate-600">{meeting.description}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(meeting.starts_at).toLocaleString()} – {new Date(meeting.ends_at).toLocaleTimeString()}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Users className="h-3 w-3" /> Organized by {meeting.organizer_name}
                    {meeting.location && <><MapPin className="ml-2 h-3 w-3" />{meeting.location}</>}
                  </p>
                  {invite?.status === 'pending_response' && (
                    <p className="text-[11px] text-amber-700">Reason for attendance request: {meeting.higher_invite_reason}</p>
                  )}
                  {meeting.invitees.length > 0 && (
                    <p className="text-[10px] text-slate-400">
                      {meeting.invitees.filter((item) => item.status === 'accepted').length} accepted · {' '}
                      {meeting.invitees.filter((item) => item.status === 'pending_response').length} awaiting response
                    </p>
                  )}
                </div>
                {invite?.status === 'pending_response' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondMutation.mutate({ meetingId: meeting.id, response: 'accepted' })}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ meetingId: meeting.id, response: 'declined' })}>Decline</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
