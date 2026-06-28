export interface LexCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  term_count?: number
}

export interface LexTerm {
  id: string
  word_en: string
  translation_es: string
  definition_en: string
  definition_es: string
  pronunciation: string | null
  ipa: string | null
  audio_url: string | null
  image_url: string | null
  example_en: string | null
  example_es: string | null
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  category_id: string | null
  category?: LexCategory
  synonyms: string[] | null
  related_terms: string[] | null
  common_mistakes: string | null
  notes: string | null
  difficulty: number
  frequency: number
  tags: string[] | null
  created_at: string
  updated_at: string
  progress?: LexUserProgress
  is_favorite?: boolean
}

export type QuestionType =
  | 'definition_es_to_word'
  | 'definition_en_to_word'
  | 'word_to_definition_es'
  | 'word_to_translation_es'
  | 'example_gap_to_word'

export interface LexPracticeQuestion {
  id: string
  term_id: string
  category_id: string | null
  level: string
  question_type: QuestionType
  question_text: string
  correct_answer: string
  options: string[]
  explanation: string | null
}

export type ProgressStatus = 'pending' | 'learning' | 'difficult' | 'mastered'

export interface LexUserProgress {
  id: string
  user_id: string
  term_id: string
  status: ProgressStatus
  correct_answers: number
  wrong_answers: number
  attempts: number
  correct_streak: number
  last_reviewed_at: string | null
  next_review_at: string | null
  created_at: string
  updated_at: string
}

export interface LexQuizResult {
  id: string
  user_id: string
  score: number
  total_questions: number
  percentage: number
  category_id: string | null
  level: string | null
  question_type: string | null
  time_seconds: number
  mistakes: QuizMistake[]
  created_at: string
}

export interface QuizMistake {
  term_id: string
  word_en: string
  user_answer: string
  correct_answer: string
}

export interface LexFavorite {
  id: string
  user_id: string
  term_id: string
  created_at: string
}

export interface LexStats {
  total: number
  pending: number
  learning: number
  difficult: number
  mastered: number
  accuracy: number
  streak: number
  due_today: number
}

export interface LexSettings {
  theme: 'dark' | 'light'
  language: 'es' | 'en'
  audio_speed: number
  auto_pronunciation: boolean
  daily_goal: number
  weekly_goal: number
}

export type LexView =
  | 'home'
  | 'vocabulary'
  | 'term-detail'
  | 'flashcards'
  | 'write'
  | 'quiz'
  | 'review'
  | 'progress'
  | 'favorites'
  | 'admin'

export interface LexUser {
  email: string
  role: string
  display_name: string | null
}

export interface GeneratedQuestion {
  term: LexTerm
  question_type: QuestionType
  question_text: string
  correct_answer: string
  options: string[]
  explanation: string
}

export interface QuizConfig {
  count: 10 | 20 | 30 | 50
  category_id: string | null
  level: string | null
  question_type: QuestionType | 'mixed'
}

export interface FlashcardRating {
  termId: string
  rating: 'unknown' | 'hard' | 'learning' | 'mastered'
}
