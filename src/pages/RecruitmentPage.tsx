import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { canManageRecruitment, getNextRecruitmentStage } from '@/lib/recruitment'
import { api } from '@/services/api'
import { CandidateApplication, RecruitmentStage } from '@/types/recruitment'

const STAGE_LABELS: Record<RecruitmentStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer_pending: 'Offer awaiting response',
  hired: 'Hired / onboarding',
  rejected: 'Closed',
}

const STAGE_STYLES: Record<RecruitmentStage, string> = {
  applied: 'bg-sky-50 text-sky-700',
  screening: 'bg-amber-50 text-amber-700',
  interview: 'bg-violet-50 text-violet-700',
  offer_pending: 'bg-orange-50 text-orange-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-600',
}

type InterviewDraft = { scheduledAt: string; interviewer: string }
type EvaluationDraft = { rating: string; feedback: string }

const emptyEvaluation: EvaluationDraft = { rating: '', feedback: '' }

export const RecruitmentPage: React.FC = () => {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [openingId, setOpeningId] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, InterviewDraft>>({})
  const [evaluationDrafts, setEvaluationDrafts] = useState<Record<string, EvaluationDraft>>({})
  const [rejectionDrafts, setRejectionDrafts] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['recruitment'],
    queryFn: () => api.recruitment.list(currentUser),
    enabled: canManageRecruitment(currentUser),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['recruitment'] })

  const createMutation = useMutation({
    mutationFn: () => api.recruitment.createApplication({
      openingId,
      candidateName,
      candidateEmail,
    }, currentUser),
    onSuccess: async () => {
      await refresh()
      setCandidateName('')
      setCandidateEmail('')
      setNotice('Application added to the recruitment pipeline.')
    },
    onError: (mutationError) => {
      setNotice(mutationError instanceof Error ? mutationError.message : 'Unable to add this application.')
    },
  })

  const workflowMutation = useMutation({
    mutationFn: (action: () => Promise<CandidateApplication>) => action(),
    onSuccess: async () => {
      await refresh()
      setNotice('Recruitment workflow updated.')
    },
    onError: (mutationError) => {
      setNotice(mutationError instanceof Error ? mutationError.message : 'Unable to update the workflow.')
    },
  })

  if (!canManageRecruitment(currentUser)) {
    return (
      <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Access not available</h2>
        <p className="mt-2 text-sm text-slate-500">Only active HR and Super Admin demo users can view candidate records.</p>
      </div>
    )
  }

  const openings = data?.openings ?? []
  const applications = data?.applications ?? []
  const openingById = new Map(openings.map((opening) => [opening.id, opening]))
  const activeCount = applications.filter((application) =>
    application.stage !== 'hired' && application.stage !== 'rejected'
  ).length
  const interviewCount = applications.filter((application) => application.stage === 'interview').length
  const onboardingCount = applications.filter((application) =>
    application.onboarding?.tasks.some((task) => !task.isComplete)
  ).length

  const updateScheduleDraft = (id: string, field: keyof InterviewDraft, value: string) => {
    setScheduleDrafts((drafts) => {
      const current = drafts[id] ?? { scheduledAt: '', interviewer: '' }
      return { ...drafts, [id]: { ...current, [field]: value } }
    })
  }

  const updateEvaluationDraft = (id: string, field: keyof EvaluationDraft, value: string) => {
    setEvaluationDrafts((drafts) => ({
      ...drafts,
      [id]: { ...emptyEvaluation, ...drafts[id], [field]: value },
    }))
  }

  const run = (action: () => Promise<CandidateApplication>) => {
    setNotice('')
    workflowMutation.mutate(action)
  }

  const renderNextStep = (application: CandidateApplication) => {
    if (application.stage === 'applied') {
      return (
        <Button size="sm" disabled={workflowMutation.isPending} onClick={() =>
          run(() => api.recruitment.moveToScreening(application.id, currentUser))
        }>
          Move to screening
        </Button>
      )
    }

    if (application.stage === 'screening') {
      const draft = scheduleDrafts[application.id] ?? { scheduledAt: '', interviewer: '' }
      return (
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            run(() => api.recruitment.scheduleInterview(application.id, {
              scheduledAt: new Date(draft.scheduledAt).toISOString(),
              interviewer: draft.interviewer,
            }, currentUser))
          }}
        >
          <Input
            required
            type="datetime-local"
            aria-label={`Interview date for ${application.candidateName}`}
            value={draft.scheduledAt}
            onChange={(event) => updateScheduleDraft(application.id, 'scheduledAt', event.target.value)}
          />
          <Input
            required
            aria-label={`Interviewer for ${application.candidateName}`}
            placeholder="Interviewer / panel"
            value={draft.interviewer}
            onChange={(event) => updateScheduleDraft(application.id, 'interviewer', event.target.value)}
          />
          <Button size="sm" type="submit" disabled={workflowMutation.isPending}>Schedule interview</Button>
        </form>
      )
    }

    if (application.stage === 'interview' && application.interview) {
      if (!application.interview.completedAt) {
        const draft = evaluationDrafts[application.id] ?? emptyEvaluation
        return (
          <form
            className="grid gap-2 sm:grid-cols-[120px_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              run(() => api.recruitment.recordInterview(application.id, {
                rating: Number(draft.rating),
                feedback: draft.feedback,
              }, currentUser))
            }}
          >
            <label className="text-xs font-semibold text-slate-600">
              Score (1-5)
              <select
                required
                aria-label={`Interview score for ${application.candidateName}`}
                value={draft.rating}
                onChange={(event) => updateEvaluationDraft(application.id, 'rating', event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Evaluation notes
              <Input
                required
                aria-label={`Interview feedback for ${application.candidateName}`}
                value={draft.feedback}
                onChange={(event) => updateEvaluationDraft(application.id, 'feedback', event.target.value)}
              />
            </label>
            <Button className="self-end" size="sm" type="submit" disabled={workflowMutation.isPending}>Record evaluation</Button>
          </form>
        )
      }

      return (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-slate-600">
            Evaluation: {application.interview.rating}/5 — {application.interview.feedback}
          </p>
          <Button size="sm" disabled={workflowMutation.isPending} onClick={() =>
            run(() => api.recruitment.issueOffer(application.id, currentUser))
          }>
            Issue offer
          </Button>
        </div>
      )
    }

    if (application.stage === 'offer_pending') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Record the candidate's response:</span>
          <Button size="sm" disabled={workflowMutation.isPending} onClick={() =>
            run(() => api.recruitment.respondToOffer(application.id, 'accepted', currentUser))
          }>
            Accepted
          </Button>
          <Button size="sm" variant="outline" disabled={workflowMutation.isPending} onClick={() =>
            run(() => api.recruitment.respondToOffer(application.id, 'declined', currentUser))
          }>
            Declined
          </Button>
        </div>
      )
    }

    if (application.stage === 'hired' && application.onboarding) {
      const completed = application.onboarding.tasks.filter((task) => task.isComplete).length
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">
            Onboarding checklist: {completed}/{application.onboarding.tasks.length} complete
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {application.onboarding.tasks.map((task) => (
              <label key={task.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-2 text-xs">
                <input
                  type="checkbox"
                  checked={task.isComplete}
                  disabled={workflowMutation.isPending}
                  onChange={(event) => run(() => api.recruitment.updateOnboardingTask(
                    application.id,
                    task.id,
                    event.target.checked,
                    currentUser
                  ))}
                  className="mt-0.5 accent-emerald-600"
                />
                <span className={task.isComplete ? 'text-slate-400 line-through' : 'text-slate-700'}>
                  {task.title}
                  <span className="block text-[10px] text-slate-400">Owner: {task.owner}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )
    }

    return <p className="text-xs text-slate-500">No further action is available for this application.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Recruitment & Onboarding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Move applications through structured screening, evaluated interviews, offers, and assigned onboarding tasks.
        </p>
      </div>

      <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Demo workflow only: candidate records are stored in this browser. Do not enter real applicant data; production requires server-side access control, secure retention, and audit history.
      </div>

      {notice && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">Unable to load recruitment records.</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open requisitions', value: openings.filter((opening) => opening.status === 'open').length },
          { label: 'Active applications', value: activeCount },
          { label: 'Interviews scheduled', value: interviewCount },
          { label: 'Onboarding in progress', value: onboardingCount },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-emerald-600" />Add an application</CardTitle>
          <CardDescription>Use the requisition and maintain one application per candidate per opening.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              setNotice('')
              createMutation.mutate()
            }}
          >
            <label className="text-xs font-semibold text-slate-600">
              Open requisition
              <select
                required
                value={openingId}
                onChange={(event) => setOpeningId(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="">Select a role</option>
                {openings.filter((opening) => opening.status === 'open').map((opening) => (
                  <option key={opening.id} value={opening.id}>{opening.title} — {opening.companyName}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Candidate name
              <Input required value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Candidate email
              <Input required type="email" value={candidateEmail} onChange={(event) => setCandidateEmail(event.target.value)} />
            </label>
            <Button type="submit" className="self-end" disabled={createMutation.isPending || openings.length === 0}>
              Add to pipeline
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-emerald-600" />Applications</CardTitle>
          <CardDescription>Offers require a completed interview evaluation. An accepted offer starts a role-owned onboarding checklist.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-slate-500">Loading applications…</p>}
          {!isLoading && applications.length === 0 && <p className="text-sm text-slate-500">No candidate applications yet.</p>}
          {applications.map((application) => {
            const opening = openingById.get(application.openingId)
            const nextStage = getNextRecruitmentStage(application.stage)
            return (
              <article key={application.id} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{application.candidateName}</h3>
                    <p className="text-xs text-slate-500">{application.candidateEmail}</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">
                      {opening?.title ?? 'Opening unavailable'} · {opening?.companyName ?? ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold ${STAGE_STYLES[application.stage]}`}>
                      {STAGE_LABELS[application.stage]}
                    </span>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Applied {new Date(application.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2" aria-label="Recruitment progress">
                  {(['applied', 'screening', 'interview', 'offer_pending', 'hired'] as RecruitmentStage[]).map((stage) => {
                    const isCurrent = stage === application.stage
                    const isDone = application.stage === 'hired' ||
                      (application.stage !== 'rejected' &&
                        ['applied', 'screening', 'interview', 'offer_pending'].indexOf(stage) <
                        ['applied', 'screening', 'interview', 'offer_pending'].indexOf(application.stage))
                    return (
                      <span key={stage} className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
                        isCurrent ? 'bg-emerald-600 text-white' :
                          isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isDone && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
                        {STAGE_LABELS[stage]}
                      </span>
                    )
                  })}
                  {nextStage && <span className="sr-only">Next step: {STAGE_LABELS[nextStage]}</span>}
                </div>

                {application.interview && (
                  <p className="text-xs text-slate-500">
                    Interview: {new Date(application.interview.scheduledAt).toLocaleString()} · Panel: {application.interview.interviewer}
                  </p>
                )}
                {renderNextStep(application)}
                {['applied', 'screening', 'interview'].includes(application.stage) && (
                  <form
                    className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault()
                      run(() => api.recruitment.rejectApplication(
                        application.id,
                        rejectionDrafts[application.id] ?? '',
                        currentUser
                      ))
                    }}
                  >
                    <Input
                      required
                      aria-label={`Reason for closing ${application.candidateName}'s application`}
                      placeholder="Reason for not proceeding"
                      value={rejectionDrafts[application.id] ?? ''}
                      onChange={(event) => setRejectionDrafts((drafts) => ({
                        ...drafts,
                        [application.id]: event.target.value,
                      }))}
                    />
                    <Button type="submit" size="sm" variant="outline" disabled={workflowMutation.isPending}>
                      Close application
                    </Button>
                  </form>
                )}
                {application.rejectionReason && (
                  <p className="text-xs text-slate-500">Closure reason: {application.rejectionReason}</p>
                )}
              </article>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
