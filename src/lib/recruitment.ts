import { User } from '@/types'
import { ONBOARDING_TASK_TEMPLATE } from '@/services/recruitmentData'
import {
  CandidateApplication,
  OnboardingTask,
  RecruitmentStage,
} from '@/types/recruitment'

export function canManageRecruitment(user: User): boolean {
  return user.is_active && (user.role === 'hr' || user.role === 'super_admin')
}

export function createOnboardingTasks(): OnboardingTask[] {
  return ONBOARDING_TASK_TEMPLATE.map((task) => ({ ...task, isComplete: false }))
}

export function getNextRecruitmentStage(stage: RecruitmentStage): RecruitmentStage | undefined {
  const stages: RecruitmentStage[] = ['applied', 'screening', 'interview', 'offer_pending']
  const index = stages.indexOf(stage)
  return index >= 0 ? stages[index + 1] : undefined
}

export function canIssueOffer(application: CandidateApplication): boolean {
  return application.stage === 'interview' &&
    Boolean(application.interview?.completedAt) &&
    typeof application.interview?.rating === 'number' &&
    Boolean(application.interview?.feedback?.trim())
}
