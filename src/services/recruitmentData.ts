import { CandidateApplication, OnboardingTask, RecruitmentOpening } from '@/types/recruitment'

export const RECRUITMENT_OPENINGS: RecruitmentOpening[] = [
  {
    id: 'opening-education-trainer',
    title: 'Skills Training Instructor',
    department: 'Training',
    companyId: 'gue-education',
    companyName: 'GUE Educational Limited',
    status: 'open',
  },
  {
    id: 'opening-cyber-engineer',
    title: 'Technical Operations Engineer',
    department: 'IT & Cybersecurity',
    companyId: 'gue-cyber',
    companyName: 'GUE Cyber Limited',
    status: 'open',
  },
  {
    id: 'opening-farm-assistant',
    title: 'Farm Operations Assistant',
    department: 'Agriculture & Farm Operations',
    companyId: 'gue-farming',
    companyName: 'GUE Smart Farming Limited',
    status: 'open',
  },
]

export const ONBOARDING_TASK_TEMPLATE: Omit<OnboardingTask, 'isComplete' | 'completedAt'>[] = [
  { id: 'signed-offer', title: 'Confirm signed offer and employment terms', owner: 'HR' },
  { id: 'identity-check', title: 'Complete identity and reference checks', owner: 'HR' },
  { id: 'role-access', title: 'Prepare role-based equipment and system access', owner: 'IT' },
  { id: 'manager-induction', title: 'Schedule team and role induction', owner: 'Hiring manager' },
  { id: 'policy-acknowledgement', title: 'Review and acknowledge workplace policies', owner: 'New employee' },
]

export const INITIAL_CANDIDATE_APPLICATIONS: CandidateApplication[] = [
  {
    id: 'application-demo-001',
    openingId: 'opening-education-trainer',
    candidateName: 'Demo Candidate One',
    candidateEmail: 'candidate.one@example.invalid',
    appliedAt: '2026-11-18T09:00:00.000Z',
    stage: 'applied',
  },
  {
    id: 'application-demo-002',
    openingId: 'opening-cyber-engineer',
    candidateName: 'Demo Candidate Two',
    candidateEmail: 'candidate.two@example.invalid',
    appliedAt: '2026-11-19T10:30:00.000Z',
    stage: 'interview',
    interview: {
      scheduledAt: '2026-11-27T10:00:00.000Z',
      interviewer: 'Demo Hiring Panel',
    },
  },
]
