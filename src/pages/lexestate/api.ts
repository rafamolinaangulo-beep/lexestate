import type {
  LexCategory, LexTerm, LexUserProgress, LexQuizResult,
  LexFavorite, LexStats, LexSettings, QuizConfig, GeneratedQuestion,
  QuestionType, ProgressStatus,
} from './types'

function apiPath(path: string): string {
  return `/api.php?path=${encodeURIComponent('/api' + path)}`
}

export function authLoginPath(): string {
  return `/api.php?path=${encodeURIComponent('/api/auth/login')}`
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(apiPath(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

// ── Auth ────────────────────────────────────────────────────────────────────────
export async function checkLexAuth() {
  return apiFetch<{ ok: boolean; email: string; role: string; display_name: string | null }>(
    '/lexestate/auth'
  )
}

// ── Categories ──────────────────────────────────────────────────────────────────
export async function fetchCategories(): Promise<LexCategory[]> {
  return apiFetch<LexCategory[]>('/lexestate/categories')
}

// ── Terms ───────────────────────────────────────────────────────────────────────
export interface TermsFilter {
  search?: string
  category_id?: string
  level?: string
  difficulty?: number
  sort?: 'alpha' | 'level' | 'difficulty' | 'frequency'
  limit?: number
  offset?: number
}

export async function fetchTerms(filter?: TermsFilter): Promise<LexTerm[]> {
  const params = new URLSearchParams()
  if (filter?.search) params.set('search', filter.search)
  if (filter?.category_id) params.set('category_id', filter.category_id)
  if (filter?.level) params.set('level', filter.level)
  if (filter?.difficulty) params.set('difficulty', String(filter.difficulty))
  if (filter?.sort) params.set('sort', filter.sort)
  if (filter?.limit) params.set('limit', String(filter.limit))
  if (filter?.offset) params.set('offset', String(filter.offset))
  const qs = params.toString()
  return apiFetch<LexTerm[]>(`/lexestate/terms${qs ? '?' + qs : ''}`)
}

export async function fetchTerm(id: string): Promise<LexTerm> {
  return apiFetch<LexTerm>(`/lexestate/terms/${id}`)
}

// ── Progress ────────────────────────────────────────────────────────────────────
export async function fetchUserProgress(): Promise<LexUserProgress[]> {
  return apiFetch<LexUserProgress[]>('/lexestate/progress')
}

export async function updateProgress(
  termId: string,
  isCorrect: boolean,
  exerciseType: string,
  questionType: string
): Promise<LexUserProgress> {
  return apiFetch<LexUserProgress>(`/lexestate/progress/${termId}`, {
    method: 'POST',
    body: JSON.stringify({ is_correct: isCorrect, exercise_type: exerciseType, question_type: questionType }),
  })
}

export async function setTermStatus(termId: string, status: ProgressStatus): Promise<void> {
  await apiFetch(`/lexestate/progress/${termId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

// ── Favorites ───────────────────────────────────────────────────────────────────
export async function fetchFavorites(): Promise<LexFavorite[]> {
  return apiFetch<LexFavorite[]>('/lexestate/favorites')
}

export async function toggleFavorite(termId: string): Promise<{ is_favorite: boolean }> {
  return apiFetch<{ is_favorite: boolean }>(`/lexestate/favorites/${termId}`, {
    method: 'POST',
  })
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
export async function fetchPracticeQuestions(config: QuizConfig): Promise<GeneratedQuestion[]> {
  const params = new URLSearchParams()
  params.set('count', String(config.count))
  if (config.category_id) params.set('category_id', config.category_id)
  if (config.level) params.set('level', config.level)
  if (config.question_type !== 'mixed') params.set('question_type', config.question_type)
  return apiFetch<GeneratedQuestion[]>(`/lexestate/quiz/questions?${params}`)
}

export async function saveQuizResult(
  result: Omit<LexQuizResult, 'id' | 'user_id' | 'created_at'>
): Promise<LexQuizResult> {
  return apiFetch<LexQuizResult>('/lexestate/quiz/results', {
    method: 'POST',
    body: JSON.stringify(result),
  })
}

export async function fetchQuizResults(): Promise<LexQuizResult[]> {
  return apiFetch<LexQuizResult[]>('/lexestate/quiz/results')
}

// ── Stats ───────────────────────────────────────────────────────────────────────
export async function fetchStats(): Promise<LexStats> {
  return apiFetch<LexStats>('/lexestate/stats')
}

// ── Settings ────────────────────────────────────────────────────────────────────
export async function fetchUserSettings(): Promise<LexSettings> {
  return apiFetch<LexSettings>('/lexestate/settings')
}

export async function saveUserSettings(settings: Partial<LexSettings>): Promise<void> {
  await apiFetch('/lexestate/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

// ── Admin ───────────────────────────────────────────────────────────────────────
export async function createTerm(data: Partial<LexTerm>): Promise<LexTerm> {
  return apiFetch<LexTerm>('/lexestate/admin/terms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTerm(id: string, data: Partial<LexTerm>): Promise<LexTerm> {
  return apiFetch<LexTerm>(`/lexestate/admin/terms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteTerm(id: string): Promise<void> {
  await apiFetch(`/lexestate/admin/terms/${id}`, { method: 'DELETE' })
}

// ── Local question generation ────────────────────────────────────────────────────
export function generateLocalQuestions(
  terms: LexTerm[],
  count: number,
  questionType: QuestionType | 'mixed'
): GeneratedQuestion[] {
  const shuffled = [...terms].sort(() => Math.random() - 0.5).slice(0, count)

  const TYPES: QuestionType[] = [
    'definition_es_to_word',
    'definition_en_to_word',
    'word_to_translation_es',
    'word_to_definition_es',
  ]

  return shuffled.map((term, i) => {
    const type: QuestionType =
      questionType === 'mixed' ? TYPES[i % TYPES.length] : questionType

    const distractors = terms
      .filter(t => t.id !== term.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    let question_text = ''
    let correct_answer = ''
    let distractorAnswers: string[] = []

    switch (type) {
      case 'definition_es_to_word':
        question_text = term.definition_es
        correct_answer = term.word_en
        distractorAnswers = distractors.map(d => d.word_en)
        break
      case 'definition_en_to_word':
        question_text = term.definition_en
        correct_answer = term.word_en
        distractorAnswers = distractors.map(d => d.word_en)
        break
      case 'word_to_translation_es':
        question_text = `What is the Spanish for: "${term.word_en}"?`
        correct_answer = term.translation_es
        distractorAnswers = distractors.map(d => d.translation_es)
        break
      case 'word_to_definition_es':
        question_text = `Which definition matches "${term.word_en}"?`
        correct_answer = term.definition_es
        distractorAnswers = distractors.map(d => d.definition_es)
        break
      case 'example_gap_to_word': {
        const gap = (term.example_en ?? '').replace(new RegExp(term.word_en, 'gi'), '___')
        question_text = `Complete the sentence: "${gap}"`
        correct_answer = term.word_en
        distractorAnswers = distractors.map(d => d.word_en)
        break
      }
    }

    const options = [correct_answer, ...distractorAnswers].sort(() => Math.random() - 0.5)

    return {
      term,
      question_type: type,
      question_text,
      correct_answer,
      options,
      explanation: term.definition_en,
    }
  })
}

// ── Write practice answer check ──────────────────────────────────────────────────
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()\[\]\-]/g, '')
    .replace(/\s+/g, ' ')
}

export function isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
  const u = normalizeAnswer(userAnswer)
  const c = normalizeAnswer(correctAnswer)
  if (u === c) return true
  if (u + 's' === c || u === c + 's') return true
  if (u.replace(/-/g, ' ') === c.replace(/-/g, ' ')) return true
  return false
}
