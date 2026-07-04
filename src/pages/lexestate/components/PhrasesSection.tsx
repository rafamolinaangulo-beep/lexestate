import { useState, useMemo } from 'react'
import { MessageSquare, Volume2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { speak } from '../tts'

interface Phrase {
  id: string
  phrase_en: string
  phrase_es: string
  explanation_es: string
  example_en: string
  example_es: string
  category: string
  level: 'B1' | 'B2' | 'C1'
}

const PHRASES: Phrase[] = [
  // Negociación
  { id: 'p01', phrase_en: 'Make an offer', phrase_es: 'Hacer una oferta', explanation_es: 'Proponer un precio al vendedor para comprar o arrendar una propiedad.', example_en: 'After visiting the apartment, they decided to make an offer of £280,000.', example_es: 'Tras visitar el apartamento, decidieron hacer una oferta de 280.000 £.', category: 'Negociación', level: 'B1' },
  { id: 'p02', phrase_en: 'Counter offer', phrase_es: 'Contraoferta', explanation_es: 'Respuesta del vendedor a una oferta con un precio o condiciones diferentes.', example_en: 'The seller rejected our bid and sent a counter offer at a higher price.', example_es: 'El vendedor rechazó nuestra puja y envió una contraoferta a un precio mayor.', category: 'Negociación', level: 'B1' },
  { id: 'p03', phrase_en: 'Close the deal', phrase_es: 'Cerrar el trato', explanation_es: 'Finalizar y firmar el acuerdo de compraventa o arrendamiento.', example_en: 'Both parties agreed on the terms and are ready to close the deal next week.', example_es: 'Ambas partes acordaron las condiciones y están listos para cerrar el trato la semana que viene.', category: 'Negociación', level: 'B1' },
  { id: 'p04', phrase_en: 'Bidding war', phrase_es: 'Guerra de pujas', explanation_es: 'Situación en la que múltiples compradores compiten aumentando sus ofertas por una propiedad.', example_en: 'A bidding war broke out for the penthouse, pushing the price 20% above asking.', example_es: 'Estalló una guerra de pujas por el ático, elevando el precio un 20% por encima del pedido.', category: 'Negociación', level: 'B2' },
  { id: 'p05', phrase_en: 'Best and final offer', phrase_es: 'Mejor y última oferta', explanation_es: 'La oferta definitiva que el comprador presenta cuando el vendedor pide la oferta máxima.', example_en: 'The agent asked all interested buyers to submit their best and final offer by Friday.', example_es: 'El agente pidió a todos los compradores interesados que presentaran su mejor y última oferta antes del viernes.', category: 'Negociación', level: 'B2' },
  { id: 'p06', phrase_en: 'Take it or leave it', phrase_es: 'Lo tomas o lo dejas', explanation_es: 'Postura firme del vendedor que no acepta más negociación.', example_en: 'The landlord said the rent is £1,500 per month, take it or leave it.', example_es: 'El casero dijo que el alquiler es 1.500 £ al mes, lo tomas o lo dejas.', category: 'Negociación', level: 'B1' },

  // Proceso de compra
  { id: 'p07', phrase_en: 'Under contract', phrase_es: 'Bajo contrato', explanation_es: 'Estado de una propiedad cuando el vendedor ha aceptado una oferta y el contrato está firmado pero aún no se ha completado la venta.', example_en: 'The house is already under contract, but you can put your name on the waiting list.', example_es: 'La casa ya está bajo contrato, pero puedes apuntarte a la lista de espera.', category: 'Proceso de compra', level: 'B2' },
  { id: 'p08', phrase_en: 'Due diligence', phrase_es: 'Diligencia debida', explanation_es: 'Proceso de investigación y verificación de todos los aspectos legales, físicos y financieros de una propiedad antes de comprarla.', example_en: 'Buyers should complete full due diligence before signing any purchase agreement.', example_es: 'Los compradores deben completar la diligencia debida antes de firmar cualquier contrato de compraventa.', category: 'Proceso de compra', level: 'B2' },
  { id: 'p09', phrase_en: 'Subject to contract', phrase_es: 'Sujeto a contrato', explanation_es: 'Indica que un acuerdo no es legalmente vinculante hasta que se firme el contrato formal.', example_en: 'Our offer is subject to contract and subject to a satisfactory survey.', example_es: 'Nuestra oferta está sujeta a contrato y sujeta a una inspección satisfactoria.', category: 'Proceso de compra', level: 'C1' },
  { id: 'p10', phrase_en: 'Exchange of contracts', phrase_es: 'Intercambio de contratos', explanation_es: 'Momento en que comprador y vendedor firman contratos idénticos y se produce el compromiso legal de la compraventa.', example_en: 'We exchanged contracts yesterday, so the sale is now legally binding.', example_es: 'Intercambiamos contratos ayer, por lo que la venta es ahora legalmente vinculante.', category: 'Proceso de compra', level: 'C1' },
  { id: 'p11', phrase_en: 'Fall through', phrase_es: 'Caerse / fracasar', explanation_es: 'Cuando una venta inmobiliaria no llega a completarse después de haber sido acordada.', example_en: 'The sale fell through at the last minute when the buyer failed to get a mortgage.', example_es: 'La venta se cayó en el último momento cuando el comprador no consiguió la hipoteca.', category: 'Proceso de compra', level: 'B2' },
  { id: 'p12', phrase_en: 'Chain', phrase_es: 'Cadena', explanation_es: 'Serie de propiedades interconectadas en una operación donde cada comprador depende de vender su propiedad actual.', example_en: 'We are stuck in a long chain, so the completion date is uncertain.', example_es: 'Estamos atrapados en una cadena larga, por lo que la fecha de finalización es incierta.', category: 'Proceso de compra', level: 'C1' },

  // Financiación
  { id: 'p13', phrase_en: 'Down payment', phrase_es: 'Pago inicial / Entrada', explanation_es: 'Cantidad de dinero que el comprador paga por adelantado al comprar una propiedad, generalmente un porcentaje del precio total.', example_en: 'They saved for three years to put a 20% down payment on their first home.', example_es: 'Ahorraron durante tres años para dar una entrada del 20% en su primera casa.', category: 'Financiación', level: 'B1' },
  { id: 'p14', phrase_en: 'Get a mortgage', phrase_es: 'Conseguir una hipoteca', explanation_es: 'Obtener un préstamo de un banco o entidad financiera para comprar una propiedad.', example_en: 'They need to get a mortgage for the remaining 80% of the purchase price.', example_es: 'Necesitan conseguir una hipoteca para el 80% restante del precio de compra.', category: 'Financiación', level: 'B1' },
  { id: 'p15', phrase_en: 'Fixed-rate mortgage', phrase_es: 'Hipoteca de tipo fijo', explanation_es: 'Hipoteca en la que el tipo de interés no varía durante todo el período del préstamo.', example_en: 'They opted for a fixed-rate mortgage to protect themselves from interest rate rises.', example_es: 'Optaron por una hipoteca de tipo fijo para protegerse de las subidas de tipos de interés.', category: 'Financiación', level: 'B2' },
  { id: 'p16', phrase_en: 'Mortgage approval in principle', phrase_es: 'Aprobación hipotecaria en principio', explanation_es: 'Confirmación provisional del banco de que estaría dispuesto a prestar una cantidad determinada, sin ser un compromiso definitivo.', example_en: 'Having a mortgage approval in principle makes your offer more attractive to sellers.', example_es: 'Tener una aprobación hipotecaria en principio hace tu oferta más atractiva para los vendedores.', category: 'Financiación', level: 'C1' },
  { id: 'p17', phrase_en: 'Negative equity', phrase_es: 'Patrimonio negativo', explanation_es: 'Situación en la que el valor de la propiedad es inferior al importe de la hipoteca pendiente.', example_en: 'Many homeowners fell into negative equity after the 2008 housing market crash.', example_es: 'Muchos propietarios cayeron en patrimonio negativo tras el colapso inmobiliario de 2008.', category: 'Financiación', level: 'C1' },

  // Mercado
  { id: 'p18', phrase_en: "Buyer's market", phrase_es: 'Mercado de compradores', explanation_es: 'Situación en la que la oferta de propiedades supera la demanda, lo que da ventaja al comprador para negociar.', example_en: "It's definitely a buyer's market right now, with many properties sitting unsold for months.", example_es: 'Ahora es claramente un mercado de compradores, con muchas propiedades sin vender durante meses.', category: 'Mercado', level: 'B2' },
  { id: 'p19', phrase_en: "Seller's market", phrase_es: 'Mercado de vendedores', explanation_es: 'Situación en la que la demanda supera la oferta, lo que da ventaja al vendedor para obtener un precio más alto.', example_en: "In a seller's market, properties receive multiple offers within the first day of listing.", example_es: 'En un mercado de vendedores, las propiedades reciben múltiples ofertas en el primer día de listado.', category: 'Mercado', level: 'B2' },
  { id: 'p20', phrase_en: 'Days on market', phrase_es: 'Días en el mercado', explanation_es: 'Número de días que una propiedad lleva publicada en venta sin venderse.', example_en: 'The average days on market for apartments in this area is currently 45 days.', example_es: 'La media de días en el mercado para pisos en esta zona es actualmente de 45 días.', category: 'Mercado', level: 'B2' },
  { id: 'p21', phrase_en: 'Curb appeal', phrase_es: 'Atractivo exterior', explanation_es: 'El atractivo visual de una propiedad visto desde la calle, que influye en la primera impresión del comprador.', example_en: 'Painting the front door and tidying the garden significantly improved the property\'s curb appeal.', example_es: 'Pintar la puerta principal y arreglar el jardín mejoró significativamente el atractivo exterior de la propiedad.', category: 'Mercado', level: 'B2' },
  { id: 'p22', phrase_en: 'Open house', phrase_es: 'Casa abierta / Jornada de puertas abiertas', explanation_es: 'Evento en el que una propiedad en venta se abre al público para que los posibles compradores puedan visitarla sin cita previa.', example_en: 'The estate agent is holding an open house this Saturday from 10am to 2pm.', example_es: 'El agente inmobiliario organiza una jornada de puertas abiertas este sábado de 10:00 a 14:00.', category: 'Mercado', level: 'B1' },

  // Descripción de propiedades
  { id: 'p23', phrase_en: 'Turnkey property', phrase_es: 'Propiedad llave en mano', explanation_es: 'Propiedad completamente renovada y lista para habitar sin necesidad de obras adicionales.', example_en: 'This is a turnkey property — freshly renovated and ready to move in immediately.', example_es: 'Esta es una propiedad llave en mano: recién renovada y lista para entrar a vivir de inmediato.', category: 'Propiedades', level: 'B2' },
  { id: 'p24', phrase_en: 'Fixer-upper', phrase_es: 'Casa para reformar', explanation_es: 'Propiedad que necesita trabajos de renovación y se vende a un precio más bajo por ese motivo.', example_en: "It's a fixer-upper, but if you're willing to invest in renovations, it could be a great deal.", example_es: 'Es una casa para reformar, pero si estás dispuesto a invertir en reformas, podría ser un buen negocio.', category: 'Propiedades', level: 'B2' },
  { id: 'p25', phrase_en: 'Open-plan layout', phrase_es: 'Distribución en planta abierta', explanation_es: 'Diseño interior sin paredes divisorias entre las áreas principales de estar, comedor y cocina.', example_en: 'The ground floor features an open-plan layout connecting the kitchen, dining, and living areas.', example_es: 'La planta baja presenta una distribución en planta abierta que conecta cocina, comedor y sala de estar.', category: 'Propiedades', level: 'B2' },
  { id: 'p26', phrase_en: 'As-is condition', phrase_es: 'En el estado en que se encuentra', explanation_es: 'La propiedad se vende exactamente como está, sin que el vendedor realice reparaciones ni mejoras.', example_en: 'The property is being sold as-is, so buyers should carry out a full structural survey.', example_es: 'La propiedad se vende en el estado en que se encuentra, por lo que los compradores deben realizar una inspección estructural completa.', category: 'Propiedades', level: 'B2' },
  { id: 'p27', phrase_en: 'Off the beaten track', phrase_es: 'Alejado / Fuera de las rutas principales', explanation_es: 'Ubicación remota o poco conocida, lejos de las zonas más transitadas o con servicios.', example_en: 'The cottage is a bit off the beaten track, but it offers complete privacy and stunning views.', example_es: 'La cabaña está un poco alejada, pero ofrece total privacidad y vistas impresionantes.', category: 'Propiedades', level: 'B2' },

  // Legal
  { id: 'p28', phrase_en: 'Title search', phrase_es: 'Búsqueda de título', explanation_es: 'Investigación de los registros públicos para verificar que el vendedor tiene el derecho legal de vender la propiedad y que no hay cargas sobre ella.', example_en: 'A title search revealed an unresolved lien from a previous owner.', example_es: 'Una búsqueda de título reveló una carga pendiente de un propietario anterior.', category: 'Legal', level: 'C1' },
  { id: 'p29', phrase_en: 'Breach of contract', phrase_es: 'Incumplimiento de contrato', explanation_es: 'Cuando una de las partes no cumple con los términos acordados en el contrato de compraventa o arrendamiento.', example_en: 'Failing to complete on the agreed date constitutes a breach of contract.', example_es: 'No completar la venta en la fecha acordada constituye un incumplimiento de contrato.', category: 'Legal', level: 'C1' },
  { id: 'p30', phrase_en: 'Force majeure', phrase_es: 'Fuerza mayor', explanation_es: 'Evento imprevisto e inevitable (catástrofe natural, conflicto, etc.) que puede eximir a una parte de cumplir sus obligaciones contractuales.', example_en: 'The contract includes a force majeure clause covering natural disasters and government restrictions.', example_es: 'El contrato incluye una cláusula de fuerza mayor que cubre catástrofes naturales y restricciones gubernamentales.', category: 'Legal', level: 'C1' },
]

const CATEGORIES = [...new Set(PHRASES.map(p => p.category))]
const LEVELS = ['B1', 'B2', 'C1']

const LEVEL_COLORS: Record<string, string> = {
  B1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  B2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  C1: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function PhrasesSection() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = PHRASES
    if (catFilter) list = list.filter(p => p.category === catFilter)
    if (levelFilter) list = list.filter(p => p.level === levelFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.phrase_en.toLowerCase().includes(q) ||
        p.phrase_es.toLowerCase().includes(q) ||
        p.explanation_es.toLowerCase().includes(q)
      )
    }
    return list
  }, [catFilter, levelFilter, search])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare size={20} className="text-emerald-400" />
          Expresiones profesionales
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Frases clave para negociar y comunicarte en inglés inmobiliario.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar expresión..."
            className="w-full bg-[#0f2040] border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="bg-[#0f2040] border border-slate-700/50 rounded-xl px-3 py-2.5
                     text-sm text-white focus:outline-none focus:border-emerald-500/50">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          className="bg-[#0f2040] border border-slate-700/50 rounded-xl px-3 py-2.5
                     text-sm text-white focus:outline-none focus:border-emerald-500/50">
          <option value="">Todos los niveles</option>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="text-slate-500 text-xs">{filtered.length} expresiones</div>

      {/* Phrase list */}
      <div className="space-y-2">
        {filtered.map(p => {
          const isOpen = expanded === p.id
          return (
            <div key={p.id}
              className="bg-[#0f2040] border border-slate-700/30 hover:border-emerald-500/20 rounded-xl overflow-hidden transition-all">
              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{p.phrase_en}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[p.level]}`}>
                      {p.level}
                    </span>
                    <span className="text-[10px] text-slate-600 bg-slate-700/30 rounded px-1.5 py-0.5">
                      {p.category}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5">{p.phrase_es}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); speak(p.phrase_en) }}
                    className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-600
                               hover:text-emerald-400 transition-colors">
                    <Volume2 size={14} />
                  </button>
                  {isOpen
                    ? <ChevronUp size={16} className="text-slate-500" />
                    : <ChevronDown size={16} className="text-slate-500" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-700/30 px-4 pb-4 pt-3 space-y-3">
                  {/* Explanation */}
                  <div className="text-slate-300 text-sm leading-relaxed">
                    {p.explanation_es}
                  </div>

                  {/* Example EN */}
                  <div className="bg-slate-800/40 rounded-xl p-3 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">
                      Ejemplo
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="text-slate-200 text-sm italic flex-1">"{p.example_en}"</p>
                      <button onClick={() => speak(p.example_en)}
                        className="flex-shrink-0 p-1 text-slate-600 hover:text-emerald-400 transition-colors mt-0.5">
                        <Volume2 size={13} />
                      </button>
                    </div>
                    <p className="text-slate-500 text-xs italic">"{p.example_es}"</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No se encontraron expresiones con ese filtro.
        </div>
      )}
    </div>
  )
}
