import { useState } from 'react'
import { Shield, Plus, Pencil, Trash2, Search, Download, Upload, X, Save, FileDown, Copy } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser } from '../types'
import { createTerm, updateTerm, deleteTerm } from '../api'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
}

const LEVELS = ['A1','A2','B1','B2','C1','C2'] as const

const EMPTY_TERM: Partial<LexTerm> = {
  word_en: '', translation_es: '', definition_en: '', definition_es: '',
  pronunciation: '', ipa: '', example_en: '', example_es: '',
  level: 'B1', category_id: '', difficulty: 3, frequency: 3,
  synonyms: [], related_terms: [], common_mistakes: '', notes: '', tags: [],
}

interface FormErrors { [k: string]: string }

function validate(data: Partial<LexTerm>): FormErrors {
  const errs: FormErrors = {}
  if (!data.word_en?.trim()) errs.word_en = 'Requerido'
  if (!data.translation_es?.trim()) errs.translation_es = 'Requerido'
  if (!data.definition_en?.trim()) errs.definition_en = 'Requerido'
  if (!data.definition_es?.trim()) errs.definition_es = 'Requerido'
  if (!data.level) errs.level = 'Requerido'
  return errs
}

const TEMPLATE_HEADERS = [
  'word_en','translation_es','definition_en','definition_es','level',
  'pronunciation','ipa','example_en','example_es',
  'difficulty','frequency','synonyms','related_terms','tags','common_mistakes','notes',
]

const TEMPLATE_ROWS = [
  [
    'Mortgage','Hipoteca',
    'A loan secured by property that must be repaid over time.',
    'Préstamo garantizado por una propiedad que debe devolverse a lo largo del tiempo.',
    'B1','ˈmɔːrɡɪdʒ','',
    'They took out a 30-year mortgage to buy the house.',
    'Pidieron una hipoteca a 30 años para comprar la casa.',
    '3','5','loan|home loan','property|real estate|lender','finance|purchase','',''
  ],
  [
    'Escrow','Plica / Depósito en garantía',
    'A financial arrangement where a third party holds funds until conditions are met.',
    'Acuerdo financiero en el que un tercero retiene fondos hasta que se cumplen las condiciones.',
    'C1','ˈɛskroʊ','',
    'The buyer placed the deposit in escrow pending the inspection.',
    'El comprador depositó la señal en plica hasta la inspección.',
    '4','3','third party|holding','closing|settlement','legal|finance','Often confused with deposit.',''
  ],
]

function downloadTemplate() {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [
    TEMPLATE_HEADERS.join(','),
    ...TEMPLATE_ROWS.map(r => r.map(escape).join(',')),
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'lexestate_plantilla.csv'
  a.click()
}

const GRAMMAR_TEMPLATE = [
  {
    title: 'Present Simple for Facts',
    title_es: 'Presente simple para hechos',
    level: 'B1',
    category: 'Verb Tenses',
    category_es: 'Tiempos verbales',
    explanation_es: 'El presente simple se usa para expresar hechos permanentes, verdades generales y descripciones de propiedades.',
    explanation_en: 'The present simple is used for permanent facts, general truths and property descriptions.',
    structure: 'Subject + base verb (+ -s for he/she/it)',
    examples: [
      { en: 'The property benefits from a south-facing garden.', es: 'La propiedad se beneficia de un jardín orientado al sur.' },
      { en: 'The apartment overlooks the marina.', es: 'El apartamento tiene vistas al puerto deportivo.' },
    ],
    tips: 'En descripciones de propiedades, el presente simple describe características permanentes.',
    common_mistakes: '✗ "The property is benefitting..." ✓ "The property benefits..." — los verbos de estado no usan el continuo.',
    sort_order: 10,
  },
]

function downloadGrammarTemplate() {
  const json = JSON.stringify(GRAMMAR_TEMPLATE, null, 2)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = 'lexestate_grammar_plantilla.json'
  a.click()
}

const LEVEL_MAP: Record<string, string> = {
  basic: 'B1', beginner: 'A2', elementary: 'A2',
  intermediate: 'B2', 'upper-intermediate': 'C1',
  advanced: 'C1', proficiency: 'C2',
}

function extractTranslationEs(definitionEs: string): string {
  // Pattern 1: "...sentence. SpanishTerm." — last segment after '. '
  const lastDot = definitionEs.lastIndexOf('. ')
  if (lastDot !== -1) {
    const last = definitionEs.slice(lastDot + 2).replace(/\.$/, '').trim()
    if (last.length >= 3 && last.length <= 100) return last
  }
  // Pattern 2: "SpanishTerm (abbr): longer definition..."
  const colon = definitionEs.indexOf(': ')
  if (colon !== -1) {
    const before = definitionEs.slice(0, colon).trim()
    if (before.length >= 3 && before.length <= 80) return before
  }
  return ''
}

function normalizeJsonTerm(obj: Record<string, unknown>): Partial<LexTerm> {
  const word_en = String(obj['word_en'] ?? obj['term'] ?? obj['word'] ?? '').trim()
  const ipa     = String(obj['ipa'] ?? obj['phonetic'] ?? '').trim()
  const definition_en = String(obj['definition_en'] ?? '').trim()
  const definition_es = String(obj['definition_es'] ?? '').trim()
  const example_en    = String(obj['example_en']  ?? '').trim()
  const example_es    = String(obj['example_es']  ?? '').trim()
  const notes         = String(obj['notes'] ?? obj['part_of_speech'] ?? '').trim()

  const translation_es =
    String(obj['translation_es'] ?? obj['spanish_equiv'] ?? obj['spanish'] ?? '').trim() ||
    extractTranslationEs(definition_es) ||
    word_en

  const rawLevel = String(obj['level'] ?? 'B1').trim().toLowerCase()
  const level = LEVEL_MAP[rawLevel] ?? (/^[abc][12]$/i.test(rawLevel) ? rawLevel.toUpperCase() : 'B1')

  const rawSyn = obj['synonyms'] ?? obj['synonyms_en'] ?? obj['synonyms_es'] ?? ''
  const synonyms: string[] = Array.isArray(rawSyn)
    ? rawSyn.map(String)
    : typeof rawSyn === 'string' && rawSyn
      ? rawSyn.split(/[,|]/).map(s => s.trim()).filter(Boolean)
      : []

  const difficulty = Number(obj['difficulty'] ?? 3)
  const frequency  = Number(obj['frequency']  ?? 3)

  const term: Partial<LexTerm> = {
    word_en, translation_es, definition_en, definition_es,
    ipa, example_en, example_es, level: level as LexTerm['level'], notes,
    synonyms, difficulty, frequency,
  }

  const cat = obj['category'] ?? obj['category_id'] ?? ''
  if (cat && typeof cat === 'object' && (cat as Record<string,unknown>)['id']) {
    term.category_id = String((cat as Record<string,unknown>)['id'])
  } else if (typeof cat === 'string' && cat) {
    term.category_id = cat   // name/slug — resolved in confirmImport
  }

  return term
}

const ARRAY_FIELDS = new Set<keyof LexTerm>(['synonyms', 'related_terms', 'tags'])

function parseCSV(text: string): { data: Partial<LexTerm>[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { data: [], errors: ['El archivo CSV está vacío'] }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const MAP: Record<string, keyof LexTerm> = {
    word: 'word_en', word_en: 'word_en', term: 'word_en',
    translation: 'translation_es', translation_es: 'translation_es',
    definition_en: 'definition_en', definition_es: 'definition_es',
    level: 'level', difficulty: 'difficulty', frequency: 'frequency',
    pronunciation: 'pronunciation', ipa: 'ipa',
    example_en: 'example_en', example_es: 'example_es',
    synonyms: 'synonyms', related_terms: 'related_terms', tags: 'tags',
    common_mistakes: 'common_mistakes', notes: 'notes',
  }
  const errors: string[] = []
  const data: Partial<LexTerm>[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    // Respect quoted commas
    const vals: string[] = []
    let cur = '', inQ = false
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    vals.push(cur.trim())

    const row: Partial<LexTerm> = {}
    headers.forEach((h, idx) => {
      const field = MAP[h]
      if (!field) return
      const raw = (vals[idx] ?? '').replace(/^"|"$/g, '').trim()
      if (ARRAY_FIELDS.has(field)) {
        (row as unknown as Record<string, unknown>)[field] = raw ? raw.split('|').map(s => s.trim()).filter(Boolean) : []
      } else if (field === 'difficulty' || field === 'frequency') {
        (row as unknown as Record<string, unknown>)[field] = raw ? Number(raw) : 3
      } else {
        (row as unknown as Record<string, unknown>)[field] = raw
      }
    })
    if (!row.word_en) { errors.push(`Fila ${i + 1}: falta word_en`); continue }
    if (!row.definition_en && !row.definition_es) { errors.push(`Fila ${i + 1}: falta definición`); continue }
    data.push(row)
  }
  return { data, errors }
}

export default function AdminSection({ user, terms, categories, dataLoaded, onRefreshData }: Props) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Partial<LexTerm>>(EMPTY_TERM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [importPreview, setImportPreview] = useState<{ data: Partial<LexTerm>[]; errors: string[] } | null>(null)
  const [importCategory, setImportCategory] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [deletingDupId, setDeletingDupId] = useState<string | null>(null)

  const filtered = terms.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !search || t.word_en.toLowerCase().includes(q) || t.translation_es.toLowerCase().includes(q)
    const matchCat = !catFilter || t.category_id === catFilter
    return matchSearch && matchCat
  })

  function openEdit(term?: LexTerm) {
    setForm(term ? { ...term } : { ...EMPTY_TERM })
    setEditingId(term ? term.id : 'new')
    setErrors({})
  }

  async function handleSave() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      if (editingId === 'new') {
        await createTerm(form)
      } else if (editingId) {
        await updateTerm(editingId, form)
      }
      setEditingId(null)
      await onRefreshData()
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTerm(id)
      setDeleteId(null)
      await onRefreshData()
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  function exportCSV() {
    const headers = ['word_en','translation_es','definition_en','definition_es','level','pronunciation','ipa','example_en','example_es','difficulty','frequency']
    const rows = terms.map(t => headers.map(h => `"${((t as unknown as Record<string, unknown>)[h] ?? '').toString().replace(/"/g,'""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'lexestate_terms.csv'
    a.click()
  }

  function exportJSON() {
    const data = JSON.stringify(terms, null, 2)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    a.download = 'lexestate_terms.json'
    a.click()
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setImportCategory('')
      if (file.name.endsWith('.json')) {
        try {
          const raw = JSON.parse(text) as unknown
          const items: unknown[] = Array.isArray(raw) ? raw : [raw]
          const errors: string[] = []
          const data: Partial<LexTerm>[] = []
          items.forEach((item, i) => {
            const obj = item as Record<string, unknown>
            const term = normalizeJsonTerm(obj)
            if (!term.word_en) { errors.push(`Elemento ${i + 1}: falta término (word_en/term)`); return }
            if (!term.definition_en && !term.definition_es) { errors.push(`Elemento ${i + 1}: falta definición`); return }
            data.push(term)
          })
          setImportPreview({ data, errors })
        } catch {
          setImportPreview({ data: [], errors: ['JSON inválido'] })
        }
      } else {
        setImportPreview(parseCSV(text))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  function resolveCategoryId(raw: string | null | undefined): string | null {
    if (!raw) return importCategory || null
    if (UUID_RE.test(raw)) return raw                         // already a valid UUID
    const match = categories.find(
      c => c.name.toLowerCase() === raw.toLowerCase() ||
           c.slug.toLowerCase() === raw.toLowerCase()
    )
    return match?.id ?? (importCategory || null)              // fallback to modal selector
  }

  const existingWords = new Set(terms.map(t => t.word_en.toLowerCase()))

  async function confirmImport() {
    if (!importPreview) return
    setImporting(true)
    let ok = 0, skipped = 0
    for (const row of importPreview.data) {
      if (row.word_en && existingWords.has(row.word_en.toLowerCase())) {
        skipped++
        continue
      }
      const term = { ...row, category_id: resolveCategoryId(row.category_id ?? null) }
      try { await createTerm(term); ok++ } catch {}
    }
    const msg = skipped > 0
      ? `Importados ${ok} términos. Omitidos ${skipped} por ya existir en la base de datos.`
      : `Importados ${ok} de ${importPreview.data.length} términos.`
    alert(msg)
    setImportPreview(null)
    setImportCategory('')
    await onRefreshData()
    setImporting(false)
  }

  function setField(k: keyof LexTerm, v: unknown) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  if (!dataLoaded) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>

  // Group terms by word_en (case-insensitive) — only groups with 2+ entries are duplicates
  const duplicateGroups = Object.values(
    terms.reduce<Record<string, LexTerm[]>>((acc, t) => {
      const key = t.word_en.toLowerCase()
      acc[key] = acc[key] ? [...acc[key], t] : [t]
      return acc
    }, {})
  ).filter(g => g.length > 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-emerald-400" />
        <h1 className="text-xl font-bold text-white">Administración</h1>
        <span className="text-slate-500 text-sm">({terms.length} términos)</span>
      </div>

      {/* Actions toolbar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openEdit()}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white
                     text-sm font-medium px-3 py-2 rounded-xl transition-colors">
          <Plus size={15} />
          Nuevo término
        </button>
        <label className="flex items-center gap-1.5 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300
                          hover:text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer">
          <Upload size={15} />
          Importar CSV/JSON
          <input type="file" accept=".csv,.json" onChange={handleFileImport} className="hidden" />
        </label>
        <button onClick={downloadTemplate}
          title="Descargar plantilla CSV con el formato correcto para vocabulario"
          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400
                     hover:text-emerald-300 text-sm font-medium px-3 py-2 rounded-xl transition-colors border border-emerald-500/20">
          <FileDown size={15} />
          Plantilla vocab.
        </button>
        <button onClick={downloadGrammarTemplate}
          title="Descargar plantilla JSON para añadir temas de gramática"
          className="flex items-center gap-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400
                     hover:text-violet-300 text-sm font-medium px-3 py-2 rounded-xl transition-colors border border-violet-500/20">
          <FileDown size={15} />
          Plantilla gram.
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300
                     hover:text-white text-sm px-3 py-2 rounded-xl transition-colors">
          <Download size={15} />
          CSV
        </button>
        <button onClick={exportJSON}
          className="flex items-center gap-1.5 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300
                     hover:text-white text-sm px-3 py-2 rounded-xl transition-colors">
          <Download size={15} />
          JSON
        </button>
        <button onClick={() => setShowDuplicates(true)}
          title="Buscar términos duplicados"
          className={`relative flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors
            ${duplicateGroups.length > 0
              ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
              : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-white'}`}>
          <Copy size={15} />
          Duplicados
          {duplicateGroups.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[10px]
                             font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {duplicateGroups.length}
            </span>
          )}
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar término..."
            className="w-full bg-[#0f2040] border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="appearance-none bg-[#0f2040] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white
                     focus:outline-none focus:border-emerald-500/50">
          <option value="">Todas</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Import preview modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0f2040] border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Vista previa de importación</h2>
              <button onClick={() => setImportPreview(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            {(() => {
              const dupes = importPreview.data.filter(t => t.word_en && existingWords.has(t.word_en.toLowerCase()))
              const news  = importPreview.data.length - dupes.length
              return (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-slate-300 flex items-center gap-3">
                    <span><span className="text-emerald-400 font-bold">{news}</span> nuevos</span>
                    {dupes.length > 0 && <span><span className="text-amber-400 font-bold">{dupes.length}</span> ya existen (se omitirán)</span>}
                    {importPreview.errors.length > 0 && <span className="text-red-400 font-bold">{importPreview.errors.length} errores</span>}
                  </div>
                  <span className="text-slate-600 text-[11px]">Arrays: separa con <code className="text-slate-400">|</code></span>
                </div>
              )
            })()}
            {importPreview.errors.map((err, i) => (
              <div key={i} className="text-red-400 text-xs">{err}</div>
            ))}
            <div className="max-h-40 overflow-y-auto space-y-1">
              {importPreview.data.slice(0, 12).map((t, i) => {
                const isDupe = t.word_en ? existingWords.has(t.word_en.toLowerCase()) : false
                return (
                  <div key={i} className={`text-xs rounded px-2 py-1 flex items-center gap-2
                    ${isDupe ? 'bg-amber-500/10 text-amber-400/70' : 'bg-slate-700/20 text-slate-400'}`}>
                    {isDupe && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 rounded">existe</span>}
                    <span className={isDupe ? 'text-amber-300/70 line-through' : 'text-white'}>{t.word_en}</span>
                    {!isDupe && <span>— {t.translation_es}</span>}
                  </div>
                )
              })}
              {importPreview.data.length > 12 && (
                <div className="text-slate-600 text-xs text-center">... y {importPreview.data.length - 12} más</div>
              )}
            </div>

            {/* Category assignment */}
            <div className="border-t border-slate-700/50 pt-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoría por defecto
              </label>
              <select
                value={importCategory}
                onChange={e => setImportCategory(e.target.value)}
                className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">— Sin categoría por defecto —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-slate-600 text-[11px] mt-1">
                Si el archivo ya incluye categorías (por nombre, slug o UUID) se usarán automáticamente. Esta selección se aplica solo a los términos sin categoría.
              </p>
            </div>

            <div className="flex gap-2">
              {(() => {
                const newCount = importPreview.data.filter(t => !t.word_en || !existingWords.has(t.word_en.toLowerCase())).length
                return (
                  <button onClick={confirmImport} disabled={importing || newCount === 0}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white
                               font-semibold py-2.5 rounded-xl transition-colors text-sm">
                    {importing ? 'Importando...' : `Importar ${newCount} término${newCount !== 1 ? 's' : ''}`}
                  </button>
                )
              })()}
              <button onClick={() => setImportPreview(null)}
                className="flex-1 border border-slate-600 text-slate-400 hover:text-white
                           py-2.5 rounded-xl transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates modal */}
      {showDuplicates && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-[#0f2040] border border-amber-500/30 rounded-2xl p-6 w-full max-w-2xl space-y-4 my-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy size={18} className="text-amber-400" />
                <h2 className="text-white font-semibold">Duplicados</h2>
                <span className="text-amber-400 text-sm font-bold">({duplicateGroups.length} grupos)</span>
              </div>
              <button onClick={() => { setShowDuplicates(false); setDeletingDupId(null) }}>
                <X size={18} className="text-slate-400 hover:text-white" />
              </button>
            </div>

            {duplicateGroups.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No hay términos duplicados.</div>
            ) : (
              <div className="space-y-4">
                {duplicateGroups.map(group => (
                  <div key={group[0].word_en}
                    className="bg-[#0a1628] border border-amber-500/20 rounded-xl p-4 space-y-3">
                    <div className="text-amber-400 text-xs font-semibold uppercase tracking-wide">
                      "{group[0].word_en}" — {group.length} entradas
                    </div>
                    {group.map(term => {
                      const cat = categories.find(c => c.id === term.category_id)
                      const isDeleting = deletingDupId === term.id
                      return (
                        <div key={term.id}
                          className="flex items-start gap-3 bg-[#0f2040] rounded-xl px-3 py-2.5">
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white text-sm font-medium">{term.word_en}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded">{term.level}</span>
                              {cat && <span className="text-[10px] text-emerald-400/70">{cat.name}</span>}
                            </div>
                            <div className="text-slate-400 text-xs truncate">{term.translation_es}</div>
                            <div className="text-slate-600 text-[11px] truncate">{term.definition_es}</div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setShowDuplicates(false); openEdit(term) }}
                              className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                              title="Editar">
                              <Pencil size={13} />
                            </button>
                            {isDeleting ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(term.id)}
                                  className="px-2 py-1 bg-red-500 hover:bg-red-400 text-white text-xs rounded-lg transition-colors">
                                  Confirmar
                                </button>
                                <button onClick={() => setDeletingDupId(null)}
                                  className="px-2 py-1 border border-slate-600 text-slate-400 text-xs rounded-lg transition-colors">
                                  No
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingDupId(term.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Eliminar este">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => { setShowDuplicates(false); setDeletingDupId(null) }}
                className="border border-slate-600 text-slate-400 hover:text-white
                           px-4 py-2 rounded-xl transition-colors text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0f2040] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <Trash2 size={32} className="text-red-400 mx-auto" />
            <div className="text-white font-semibold">¿Eliminar este término?</div>
            <div className="text-slate-400 text-sm">Esta acción no se puede deshacer.</div>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                Eliminar
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-slate-600 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Term form modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-[#0d1e38] border border-slate-700 rounded-2xl p-6 w-full max-w-2xl space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">
                {editingId === 'new' ? 'Nuevo término' : 'Editar término'}
              </h2>
              <button onClick={() => setEditingId(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { k: 'word_en' as const, label: 'Palabra (inglés) *' },
                { k: 'translation_es' as const, label: 'Traducción (español) *' },
                { k: 'pronunciation' as const, label: 'Pronunciación' },
                { k: 'ipa' as const, label: 'IPA' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                  <input value={(form[f.k] as string) ?? ''}
                    onChange={e => setField(f.k, e.target.value)}
                    className={`w-full bg-[#0a1628] border rounded-xl px-3 py-2 text-sm text-white
                                focus:outline-none focus:border-emerald-500/50 transition-colors
                                ${errors[f.k] ? 'border-red-500/50' : 'border-slate-700/50'}`} />
                  {errors[f.k] && <div className="text-red-400 text-xs mt-0.5">{errors[f.k]}</div>}
                </div>
              ))}
            </div>
            {[
              { k: 'definition_en' as const, label: 'Definición en inglés *' },
              { k: 'definition_es' as const, label: 'Definición en español *' },
              { k: 'example_en' as const, label: 'Ejemplo en inglés' },
              { k: 'example_es' as const, label: 'Ejemplo en español' },
              { k: 'common_mistakes' as const, label: 'Errores comunes' },
              { k: 'notes' as const, label: 'Notas' },
            ].map(f => (
              <div key={f.k}>
                <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
                <textarea value={(form[f.k] as string) ?? ''}
                  onChange={e => setField(f.k, e.target.value)}
                  rows={2}
                  className={`w-full bg-[#0a1628] border rounded-xl px-3 py-2 text-sm text-white
                              focus:outline-none focus:border-emerald-500/50 transition-colors resize-none
                              ${errors[f.k] ? 'border-red-500/50' : 'border-slate-700/50'}`} />
                {errors[f.k] && <div className="text-red-400 text-xs mt-0.5">{errors[f.k]}</div>}
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nivel *</label>
                <select value={form.level ?? 'B1'} onChange={e => setField('level', e.target.value)}
                  className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                             text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
                <select value={form.category_id ?? ''} onChange={e => setField('category_id', e.target.value)}
                  className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                             text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Dificultad (1-5)</label>
                <input type="number" min={1} max={5} value={form.difficulty ?? 3}
                  onChange={e => setField('difficulty', Number(e.target.value))}
                  className="w-full bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                             text-sm text-white focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                           text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm">
                <Save size={14} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditingId(null)}
                className="border border-slate-600 text-slate-400 hover:text-white
                           px-4 py-2.5 rounded-xl transition-colors text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms table */}
      <div className="space-y-1">
        {filtered.map(term => {
          const cat = categories.find(c => c.id === term.category_id)
          return (
            <div key={term.id}
              className="bg-[#0f2040] border border-slate-700/30 rounded-xl px-4 py-3
                         flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{term.word_en}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded">
                    {term.level}
                  </span>
                </div>
                <div className="text-slate-500 text-xs truncate">
                  {term.translation_es} {cat ? `· ${cat.name}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(term)}
                  className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10
                             rounded-lg transition-all">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(term.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10
                             rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
