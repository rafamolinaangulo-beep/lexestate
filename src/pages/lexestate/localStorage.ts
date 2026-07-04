import type { LexUserProgress, LexFavorite, LexQuizResult, LexSettings, ProgressStatus, LexVerbProgress } from './types'
import { applyResult } from './srs'

const KEYS = {
  progress: 'lex_progress',
  favorites: 'lex_favorites',
  quizResults: 'lex_quiz_results',
  settings: 'lex_settings',
  streak: 'lex_streak',
  verbProgress: 'lex_verb_progress',
  activityLog: 'lex_activity_log',
  listeningResults: 'lex_listening_results',
  fillBlankResults: 'lex_fill_blank_results',
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

// ── Verb Progress ────────────────────────────────────────────────────────────────
type VerbProgressMap = Record<string, Partial<LexVerbProgress>>

export function getLocalVerbProgress(): VerbProgressMap {
  return load<VerbProgressMap>(KEYS.verbProgress, {})
}

export function updateLocalVerbProgress(verbId: string, isCorrect: boolean): Partial<LexVerbProgress> {
  const all = getLocalVerbProgress()
  const current = all[verbId] ?? {}
  const updated = applyResult(current as Parameters<typeof applyResult>[0], isCorrect)
  all[verbId] = { ...current, ...updated, verb_id: verbId }
  save(KEYS.verbProgress, all)
  return all[verbId]
}

export function setLocalVerbStatus(verbId: string, status: ProgressStatus) {
  const all = getLocalVerbProgress()
  all[verbId] = { ...(all[verbId] ?? {}), status, verb_id: verbId }
  save(KEYS.verbProgress, all)
}

export function computeLocalVerbStats(totalVerbs: number) {
  const progress = getLocalVerbProgress()
  const entries = Object.values(progress)
  const mastered = entries.filter(p => p.status === 'mastered').length
  const learning = entries.filter(p => p.status === 'learning').length
  const difficult = entries.filter(p => p.status === 'difficult').length
  const correct = entries.reduce((s, p) => s + (p.correct_answers ?? 0), 0)
  const total = entries.reduce((s, p) => s + (p.attempts ?? 0), 0)
  return {
    total: totalVerbs,
    pending: totalVerbs - mastered - learning - difficult,
    learning,
    difficult,
    mastered,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  }
}

// ── Practice session results (Listening + Fill-blank) ───────────────────────────
interface PracticeResult {
  score: number
  total: number
  date: string
}

export type PracticeMode = 'listening' | 'fill_blank'

function practiceKey(mode: PracticeMode) {
  return mode === 'listening' ? KEYS.listeningResults : KEYS.fillBlankResults
}

export function savePracticeResult(mode: PracticeMode, score: number, total: number) {
  const results = load<PracticeResult[]>(practiceKey(mode), [])
  results.unshift({ score, total, date: new Date().toISOString() })
  save(practiceKey(mode), results.slice(0, 30))
}

export function getPracticeResults(mode: PracticeMode): PracticeResult[] {
  return load<PracticeResult[]>(practiceKey(mode), [])
}

export function getPracticeStats(mode: PracticeMode) {
  const results = getPracticeResults(mode)
  if (results.length === 0) return { sessions: 0, accuracy: 0, totalWords: 0, lastDate: null }
  const totalWords = results.reduce((s, r) => s + r.total, 0)
  const totalCorrect = results.reduce((s, r) => s + r.score, 0)
  return {
    sessions: results.length,
    accuracy: totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0,
    totalWords,
    lastDate: results[0].date,
  }
}

// ── Streak & activity log ────────────────────────────────────────────────────────
interface StreakEntry {
  count: number
  lastDate: string | null
}

export function getLocalStreak(): number {
  const data = load<StreakEntry>(KEYS.streak, { count: 0, lastDate: null })
  if (!data.lastDate) return 0
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  return data.lastDate === today || data.lastDate === yesterday ? data.count : 0
}

export function recordStudyActivity() {
  const today = new Date().toISOString().split('T')[0]
  const data = load<StreakEntry>(KEYS.streak, { count: 0, lastDate: null })
  if (data.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    save(KEYS.streak, {
      count: data.lastDate === yesterday ? data.count + 1 : 1,
      lastDate: today,
    })
  }
  const log = load<Record<string, number>>(KEYS.activityLog, {})
  log[today] = (log[today] ?? 0) + 1
  save(KEYS.activityLog, log)
}

export function getActivityLog(): Record<string, number> {
  return load<Record<string, number>>(KEYS.activityLog, {})
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
    streak: getLocalStreak(),
    due_today: 0,
  }
}
