import type { ProgressStatus, LexUserProgress } from './types'

const INTERVALS: Record<string, number> = {
  difficult: 0,
  learning_1: 1,
  learning_2: 3,
  learning_3: 7,
  mastered: 14,
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function computeNextReview(
  status: ProgressStatus,
  streak: number
): string {
  if (status === 'difficult') return addDays(INTERVALS.difficult)
  if (status === 'mastered') return addDays(INTERVALS.mastered)
  if (streak === 1) return addDays(INTERVALS.learning_1)
  if (streak === 2) return addDays(INTERVALS.learning_2)
  return addDays(INTERVALS.learning_3)
}

export function applyResult(
  current: Partial<LexUserProgress>,
  isCorrect: boolean
): Partial<LexUserProgress> {
  const prevStatus: ProgressStatus = (current.status as ProgressStatus) || 'pending'
  const prevStreak = current.correct_streak ?? 0

  let newStatus: ProgressStatus
  let newStreak: number

  if (!isCorrect) {
    newStreak = 0
    newStatus = prevStatus === 'mastered' ? 'learning' : 'difficult'
  } else {
    newStreak = prevStreak + 1
    if (newStreak >= 3) {
      newStatus = 'mastered'
    } else {
      newStatus = 'learning'
    }
  }

  return {
    status: newStatus,
    correct_answers: (current.correct_answers ?? 0) + (isCorrect ? 1 : 0),
    wrong_answers: (current.wrong_answers ?? 0) + (isCorrect ? 0 : 1),
    attempts: (current.attempts ?? 0) + 1,
    correct_streak: newStreak,
    last_reviewed_at: new Date().toISOString(),
    next_review_at: computeNextReview(newStatus, newStreak),
  }
}

export function isDueToday(nextReview: string | null): boolean {
  if (!nextReview) return true
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return new Date(nextReview) <= today
}
