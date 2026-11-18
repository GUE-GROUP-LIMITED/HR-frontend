export type RecruitmentStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer_pending'
  | 'hired'
  | 'rejected'

export interface RecruitmentOpening {
  id: string
  title: string
  department: string
  companyId: string
  companyName: string
  status: 'open' | 'paused'
}

export interface InterviewEvaluation {
  scheduledAt: string
  interviewer: string
  completedAt?: string
  rating?: number
  feedback?: string
}

export interface OnboardingTask {
  id: string
  title: string
  owner: 'HR' | 'Hiring manager' | 'IT' | 'New employee'
  isComplete: boolean
  completedAt?: string
}

export interface CandidateApplication {
  id: string
  openingId: string
  candidateName: string
  candidateEmail: string
  appliedAt: string
  stage: RecruitmentStage
  rejectionReason?: string
  interview?: InterviewEvaluation
  offer?: {
    issuedAt: string
    response: 'awaiting_response' | 'accepted' | 'declined'
    respondedAt?: string
  }
  onboarding?: {
    startedAt: string
    tasks: OnboardingTask[]
  }
}

export interface CreateCandidateApplicationPayload {
  openingId: string
  candidateName: string
  candidateEmail: string
}

export interface RecruitmentData {
  openings: RecruitmentOpening[]
  applications: CandidateApplication[]
}
