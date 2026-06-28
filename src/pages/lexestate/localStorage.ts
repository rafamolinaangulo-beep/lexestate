import type { LexUserProgress, LexFavorite, LexQuizResult, LexSettings, ProgressStatus } from './types'
import { applyResult } from './srs'

const KEYS = {
  progress: 'lex_progress',
  favorites: 'lex_favorites',
  quizResults: 'lex_quiz_results',
  settings: 'lex_settings',
  streak: 'lex_streak',
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ── Progress ────────────────────────────────────────────────────────────────────
type ProgressMap = Record<string, Partial<LexUserProgress>>

export function getLocalProgress(): ProgressMap {
  return load<ProgressMap>(KEYS.progress, {})
}

export function getLocalTermProgress(termId: string): Partial<LexUserProgress> | null {
  return getLocalProgress()[termId] ?? null
}

export function updateLocalProgress(termId: string, isCorrect: boolean): Partial<LexUserProgress> {
  const all = getLocalProgress()
  const current = all[termId] ?? {}
  const updated = applyResult(current, isCorrect)
  all[termId] = { ...current, ...updated, term_id: termId }
  save(KEYS.progress, all)
  return all[termId]
}

export function setLocalTermStatus(termId: string, status: ProgressStatus) {
  const all = getLocalProgress()
  all[termId] = { ...(all[termId] ?? {}), status, term_id: termId }
  save(KEYS.progress, all)
}

// ── Favorites ───────────────────────────────────────────────────────────────────
export function getLocalFavorites(): string[] {
  return load<string[]>(KEYS.favorites, [])
}

export function toggleLocalFavorite(termId: string): boolean {
  const favs = getLocalFavorites()
  const idx = favs.indexOf(termId)
  let result: boolean
  if (idx === -1) {
    favs.push(termId)
    result = true
  } else {
    favs.splice(idx, 1)
    result = false
  }
  save(KEYS.favorites, favs)
  return result
}

export function isLocalFavorite(termId: string): boolean {
  return getLocalFavorites().includes(termId)
}

// ── Quiz Results ────────────────────────────────────────────────────────────────
export function getLocalQuizResults(): LexQuizResult[] {
  return load<LexQuizResult[]>(KEYS.quizResults, [])
}

export function saveLocalQuizResult(result: Omit<LexQuizResult, 'id' | 'user_id' | 'created_at'>): LexQuizResult {
  const full: LexQuizResult = {
    ...result,
    id: crypto.randomUUID(),
    user_id: 'local',
    created_at: new Date().toISOString(),
  }
  const results = getLocalQuizResults()
  results.unshift(full)
  save(KEYS.quizResults, results.slice(0, 50))
  return full
}

// ── Settings ────────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: LexSettings = {
  theme: 'dark',
  language: 'es',
  audio_speed: 1.0,
  auto_pronunciation: false,
  daily_goal: 10,
  weekly_goal: 50,
}

export function getLocalSettings(): LexSettings {
  return { ...DEFAULT_SETTINGS, ...load<Partial<LexSettings>>(KEYS.settings, {}) }
}

export function saveLocalSettings(settings: LexSettings) {
  save(KEYS.settings, settings)
}

// ── Stats helper ─────────────────────────────────────────────────────────────────
export function computeLocalStats(totalTerms: number) {
  const progress = getLocalProgress()
  const entries = Object.values(progress)
  const mastered = entries.filter(p => p.status === 'mastered').length
  const learning = entries.filter(p => p.status === 'learning').length
  const difficult = entries.filter(p => p.status === 'difficult').length
  const correct = entries.reduce((s, p) => s + (p.correct_answers ?? 0), 0)
  const total = entries.reduce((s, p) => s + (p.attempts ?? 0), 0)
  return {
    total: totalTerms,
    pending: totalTerms - mastered - learning - difficult,
    learning,
    difficult,
    mastered,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    streak: 0,
    due_today: 0,
  }
}
