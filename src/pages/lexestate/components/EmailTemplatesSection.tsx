import { useState } from 'react'
import { Mail, Volume2, X, BookOpen, Search } from 'lucide-react'
import type { LexTerm, LexUser } from '../types'
import { speak } from '../tts'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  dataLoaded: boolean
  onSelectTerm: (termId: string) => void
}

type Category = 'all' | 'purchase' | 'rental' | 'management' | 'investment' | 'agent'

interface EmailTemplate {
  id: string
  title: string
  scenario_es: string
  level: 'B1' | 'B2' | 'C1'
  category: Category
  subject: string
  body: string
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',        label: 'Todos' },
  { id: 'purchase',   label: 'Compraventa' },
  { id: 'rental',     label: 'Alquiler' },
  { id: 'management', label: 'Gestión' },
  { id: 'investment', label: 'Inversión' },
  { id: 'agent',      label: 'Agente' },
]

const TEMPLATES: EmailTemplate[] = [
  // ── COMPRAVENTA ─────────────────────────────────────────────────────────────
  {
    id: 'e01',
    category: 'purchase',
    title: 'Consulta inicial sobre una propiedad',
    scenario_es: 'Eres un comprador potencial y escribes a un agente para obtener información sobre una propiedad en venta.',
    level: 'B1',
    subject: 'Inquiry Regarding Property at 12 Elm Street',
    body: `Dear Mr. Johnson,

I am writing to enquire about the property listed at 12 Elm Street, which I noticed on your agency's website. The listing price of £350,000 seems competitive for the area, and I would like to request further information.

Could you please provide me with the floor plan and details of any recent renovation work carried out on the property? I am also interested in the freehold status and whether there are any outstanding service charges.

I have a mortgage approval in principle for up to £380,000, so I am in a strong position to proceed. Would it be possible to arrange a viewing at your earliest convenience?

I look forward to hearing from you.

Yours sincerely,
Maria García`,
  },
  {
    id: 'e02',
    category: 'purchase',
    title: 'Carta de oferta formal',
    scenario_es: 'Has visitado la propiedad y quieres hacer una oferta formal por escrito al agente.',
    level: 'B2',
    subject: 'Formal Purchase Offer — 12 Elm Street',
    body: `Dear Mr. Johnson,

Following our viewing of the above property, I am pleased to submit a formal offer to purchase 12 Elm Street at a price of £335,000, subject to contract and subject to a satisfactory structural survey.

This offer is conditional on the following terms:
— Completion no later than 60 days from exchange of contracts
— Inclusion of all fitted kitchen appliances
— Vacant possession on the agreed completion date

I enclose a copy of my mortgage agreement in principle as proof of funds. I have also instructed a solicitor to act on my behalf in this transaction, and I am keen to proceed as quickly as possible.

Please confirm whether the seller is willing to accept this offer or if they wish to make a counter offer.

Yours faithfully,
Maria García`,
  },
  {
    id: 'e03',
    category: 'purchase',
    title: 'Solicitud de inspección de la propiedad',
    scenario_es: 'Tu oferta ha sido aceptada y contactas a un inspector para organizar la peritación estructural.',
    level: 'B1',
    subject: 'Home Inspection Request — 12 Elm Street',
    body: `Dear Mr. Clarke,

I have recently had an offer accepted on a residential property at 12 Elm Street, and I am writing to commission a full structural survey before we proceed to exchange of contracts.

The property is a Victorian mid-terrace house built in approximately 1895. I am particularly concerned about the condition of the roof, the damp-proof course, and any potential issues with subsidence, given the age of the building.

Could you please let me know your availability to carry out the survey during the week of the 15th? I would also appreciate a written quote for your fees, along with an indication of how long the report will take to produce.

If you require access to the property, please contact the listing agent, Mr. Johnson, at the number below.

Many thanks,
Maria García`,
  },
  {
    id: 'e04',
    category: 'purchase',
    title: 'Negociación tras la peritación',
    scenario_es: 'El informe del perito ha revelado problemas en la propiedad. Escribes al agente para renegociar el precio.',
    level: 'B2',
    subject: 'Re: Revised Offer Following Survey Report — 12 Elm Street',
    body: `Dear Mr. Johnson,

Thank you for your continued assistance with this purchase. Unfortunately, the structural survey has revealed several issues that were not disclosed during the initial viewing, and I feel it is necessary to revise my offer accordingly.

The surveyor has identified the following defects:
— Significant damp penetration in the basement, estimated repair cost: £8,000
— Roof tiles in poor condition requiring replacement within two years, estimated cost: £6,500
— Evidence of subsidence in the rear extension, requiring further investigation

In light of these findings, I am prepared to proceed with the purchase at a revised price of £318,000, reflecting the cost of the necessary remedial works. Alternatively, I would ask the vendor to carry out the damp-proofing and roof repairs prior to completion.

I appreciate this may not be the news the seller was hoping for, but I trust you will understand that we must proceed on a sound financial basis. I am committed to completing this transaction and hope we can reach a mutually agreeable solution.

I await your response at your earliest convenience.

Yours faithfully,
Maria García`,
  },
  {
    id: 'e05',
    category: 'purchase',
    title: 'Confirmación de fecha de cierre',
    scenario_es: 'Todas las condiciones están acordadas y confirmas la fecha de finalización de la compraventa con el notario.',
    level: 'C1',
    subject: 'Completion Date Confirmation — 12 Elm Street',
    body: `Dear Ms. Patel,

I write to confirm that we are now in a position to proceed to exchange of contracts and to set a completion date for the above property.

Following the satisfactory resolution of all outstanding matters — including the damp-proofing works carried out by the vendor and the confirmation of clear title following the title search — both parties are ready to proceed.

We propose the following timeline:
— Exchange of contracts: 14th March
— Completion: 28th March (14 days thereafter)

On completion, the following payments will be due:
— Balance of purchase price: £318,000
— Stamp Duty Land Tax: £5,900
— Land Registry fee: £270
— Your firm's conveyancing fees as per the agreed quote

Please ensure that the title deed and all necessary transfer documents are prepared in advance. I would also request that you liaise directly with the vendor's solicitor to arrange the simultaneous transfer of keys and funds on completion day.

Kindly confirm your acceptance of these arrangements by return.

Yours sincerely,
Maria García`,
  },
  {
    id: 'e06',
    category: 'purchase',
    title: 'Retirada de oferta',
    scenario_es: 'La situación ha cambiado y necesitas retirar formalmente tu oferta antes del intercambio de contratos.',
    level: 'B2',
    subject: 'Withdrawal of Offer — 12 Elm Street',
    body: `Dear Mr. Johnson,

I am writing to formally notify you that I wish to withdraw my offer to purchase 12 Elm Street, submitted on 5th February.

As you are aware, no exchange of contracts has yet taken place, and I am therefore under no legal obligation to proceed. My decision is based on a change in personal circumstances that makes it impossible for me to commit to this purchase at the present time.

I apologise for any inconvenience this may cause to the vendor, and I am grateful for the time and assistance your agency has provided throughout this process. Should my circumstances change in the future, I would not hesitate to contact you again.

Please confirm in writing that this offer has been formally withdrawn and that the property will be re-listed accordingly.

Yours faithfully,
Maria García`,
  },
  {
    id: 'e07',
    category: 'purchase',
    title: 'Solicitud de prórroga del plazo',
    scenario_es: 'Necesitas más tiempo para completar la financiación y solicitas una extensión del plazo de cierre.',
    level: 'B2',
    subject: 'Request for Extension of Completion Date — 42 Park Lane',
    body: `Dear Ms. Patel,

I am writing with regard to the above-mentioned property purchase, currently scheduled for completion on 28th March.

Due to an unforeseen delay with my mortgage lender — who requires additional documentation as part of a routine valuation review — I respectfully request an extension of the completion date by fourteen days, to 11th April.

I wish to assure you that my commitment to this purchase remains firm. The delay is solely administrative in nature, and my solicitor has confirmed that all other aspects of the transaction are in order. I have also instructed my mortgage broker to expedite the process as a matter of urgency.

I understand that any extension must be agreed by both parties, and I hope the vendor will be willing to accommodate this request. I am happy to offer a goodwill gesture in the form of an increased deposit to demonstrate my continued intent.

Please let me know at your earliest convenience whether the vendor is agreeable to this arrangement.

Yours sincerely,
Maria García`,
  },

  // ── ALQUILER ─────────────────────────────────────────────────────────────────
  {
    id: 'r01',
    category: 'rental',
    title: 'Consulta sobre piso en alquiler',
    scenario_es: 'Has visto un anuncio de alquiler y escribes al agente para pedir más detalles sobre el inmueble.',
    level: 'B1',
    subject: 'Enquiry Regarding Rental Property — 8 Rose Avenue, Flat 3',
    body: `Dear Ms. Turner,

I am writing to enquire about the two-bedroom flat advertised at 8 Rose Avenue, Flat 3, at a monthly rent of £1,450. I am currently looking for a property to rent from the beginning of next month and believe this flat could be suitable.

Could you please confirm whether the property is still available and provide the following details:
— Whether the rent is inclusive of any bills (water, council tax, internet)
— The length of the tenancy on offer and whether short-term leases are considered
— Whether pets are permitted (I have a small, well-behaved dog)
— Parking arrangements for the property

I would also appreciate the opportunity to arrange a viewing at your earliest convenience. I am available most weekday evenings and weekends.

Thank you for your time and I look forward to your reply.

Yours sincerely,
Carlos Martínez`,
  },
  {
    id: 'r02',
    category: 'rental',
    title: 'Solicitud formal de arrendamiento',
    scenario_es: 'Has visitado el piso y quieres presentar una solicitud formal con tus referencias y garantías.',
    level: 'B2',
    subject: 'Rental Application — 8 Rose Avenue, Flat 3',
    body: `Dear Ms. Turner,

Following my viewing of Flat 3, 8 Rose Avenue on Tuesday, I am writing to formally submit my application to rent the above property.

I am a marketing manager employed on a permanent contract with an annual salary of £48,000, which comfortably meets your stated income requirement. I am happy to provide payslips and a bank statement as proof of income, along with a reference from my current employer.

I have been renting privately for the past six years and have always maintained an excellent relationship with my landlords. I can provide a reference from my current landlord, from whom I am departing on mutually agreed terms as they are selling the property.

I am able to pay the first month's rent and the security deposit (equivalent to five weeks' rent) upon signing the tenancy agreement. My preferred move-in date is 1st May, though I have some flexibility if required.

I would be grateful if you could let me know whether my application is successful and what the next steps would be. I am happy to provide any additional documentation at short notice.

Yours sincerely,
Carlos Martínez`,
  },
  {
    id: 'r03',
    category: 'rental',
    title: 'Aviso de avería urgente al arrendador',
    scenario_es: 'Eres inquilino y has detectado una avería grave que necesita reparación inmediata.',
    level: 'B1',
    subject: 'Urgent Repair Required — Boiler Failure — Flat 3, 8 Rose Avenue',
    body: `Dear Ms. Turner,

I am writing to notify you urgently that the boiler at my rented property — Flat 3, 8 Rose Avenue — has failed completely, leaving the property without heating or hot water.

The fault occurred this morning at approximately 7 a.m. I have checked the pressure gauge, reset the unit, and followed the troubleshooting steps in the manufacturer's manual, but the boiler has not restarted. A yellow warning light remains illuminated, suggesting a serious internal fault.

Given the current cold weather conditions, I would ask that a qualified engineer be sent to inspect the boiler as a matter of urgency. Under the terms of the tenancy agreement, I understand that the landlord is responsible for maintaining the heating and hot water system in good working order.

Please confirm by return when an engineer will be able to attend. If I do not receive a response within 24 hours, I will need to arrange emergency repairs independently and seek to recover the cost from the deposit or rent, as permitted by law.

Thank you for your prompt attention to this matter.

Yours sincerely,
Carlos Martínez
Tenant, Flat 3, 8 Rose Avenue`,
  },
  {
    id: 'r04',
    category: 'rental',
    title: 'Notificación de rescisión de contrato',
    scenario_es: 'Quieres abandonar el piso al final del contrato y das el preaviso formal requerido.',
    level: 'B2',
    subject: 'Notice to Vacate — Flat 3, 8 Rose Avenue',
    body: `Dear Ms. Turner,

I am writing to give formal notice of my intention to vacate the above property at the end of my current tenancy, which expires on 31st July.

In accordance with the terms of my Assured Shorthold Tenancy Agreement, which requires one calendar month's written notice, I am giving notice today, 28th June, with the tenancy ending on 31st July.

I confirm that I will return all sets of keys to your office by noon on 31st July and that I will leave the property in the same condition as at the start of the tenancy, subject to fair wear and tear. I would appreciate it if you could arrange a pre-departure inspection one week before the end of the tenancy, so that any issues can be identified and resolved before my departure.

I also request that the security deposit of £1,813 be returned to my bank account within ten days of vacating, in line with current tenancy deposit protection regulations. I will provide my bank details separately.

I have genuinely enjoyed living at this property and thank you for your assistance throughout the tenancy.

Yours sincerely,
Carlos Martínez`,
  },

  // ── GESTIÓN ──────────────────────────────────────────────────────────────────
  {
    id: 'm01',
    category: 'management',
    title: 'Reclamación de reparaciones pendientes',
    scenario_es: 'Llevas semanas esperando que el arrendador repare varios desperfectos. Envías una reclamación formal.',
    level: 'B2',
    subject: 'Formal Complaint — Outstanding Repairs at Flat 3, 8 Rose Avenue',
    body: `Dear Ms. Turner,

I am writing to formally raise a complaint regarding several outstanding repairs at the above property, which I reported on 12th May and which remain unaddressed as of the date of this letter.

The issues in question are as follows:
1. A leaking kitchen tap, causing ongoing water damage to the unit below the sink
2. A cracked window pane in the master bedroom, creating a draught and a potential security risk
3. A faulty extractor fan in the bathroom, which has resulted in persistent condensation and early signs of mould growth

Despite two telephone calls and a previous written request to your office, no contractor has been appointed and no timeline for the repairs has been provided. I am deeply concerned that the delay is causing further deterioration of the property.

I must advise you that as a landlord, you are legally obliged to carry out repairs within a reasonable timeframe. Should these issues not be resolved within 14 days of the date of this letter, I will have no alternative but to contact the local authority housing department and, if necessary, seek a rent reduction through the appropriate tribunal.

I hope we can resolve this matter promptly and avoid any escalation.

Yours faithfully,
Ana López
Tenant, Flat 3, 8 Rose Avenue`,
  },
  {
    id: 'm02',
    category: 'management',
    title: 'Solicitud de devolución de fianza',
    scenario_es: 'Ya has abandonado el piso y el arrendador no devuelve la fianza en el plazo establecido.',
    level: 'B2',
    subject: 'Demand for Return of Security Deposit — Flat 3, 8 Rose Avenue',
    body: `Dear Ms. Turner,

I vacated the above property on 31st July and returned all keys to your office on the same day. Under the terms of the Tenancy Deposit Scheme and applicable legislation, you are required to return my deposit within ten working days of the end of the tenancy. As of today, 18th August, the sum of £1,813 has not been credited to my account.

I am aware that deductions may be made for damage beyond fair wear and tear; however, you have not provided any schedule of deductions, photographs, or contractor invoices to justify withholding any part of the deposit. I therefore request that the full amount be returned without further delay.

I would remind you that failure to return the deposit or provide a written breakdown of any deductions within the statutory timeframe may entitle me to claim compensation of up to three times the deposit amount through the courts, in addition to the deposit itself.

Please arrange payment to the bank account provided on departure and confirm the transfer in writing within five working days. If you believe any deductions are warranted, please provide a full written breakdown by the same date.

I trust this matter can be resolved without the need for legal proceedings.

Yours faithfully,
Ana López`,
  },
  {
    id: 'm03',
    category: 'management',
    title: 'Queja formal por ruidos y molestias',
    scenario_es: 'Eres propietario de un piso y escribes a la empresa gestora del edificio por problemas recurrentes con un vecino.',
    level: 'C1',
    subject: 'Formal Complaint Regarding Noise Nuisance — Unit 12, Harrington Court',
    body: `Dear Mr. Webb,

I write as the owner-occupier of Unit 12, Harrington Court, to formally register a complaint concerning persistent and excessive noise emanating from Unit 11 (the flat directly above mine).

The disturbance has been ongoing for a period of approximately six weeks and typically occurs between the hours of 11 p.m. and 3 a.m. It manifests as loud music, heavy footfall, and prolonged conversation at levels that are clearly audible throughout my property. I have maintained a written log of incidents, copies of which I am prepared to submit upon request.

I have on two occasions approached the occupant of Unit 11 directly, but my requests for consideration have been disregarded. I have also submitted two prior informal complaints to your office, dated 3rd June and 17th June, neither of which has resulted in any discernible action.

I would draw your attention to the lease covenant, which expressly prohibits behaviour likely to cause a nuisance to other occupants of the building. I respectfully request that your management team issue a formal written warning to the tenant of Unit 11 within seven days of receiving this letter.

Should this action fail to remedy the situation within a further fourteen days, I reserve the right to refer this matter to the residents' association and, if necessary, seek an injunction through the civil courts.

Yours faithfully,
David Chen
Owner, Unit 12, Harrington Court`,
  },
  {
    id: 'm04',
    category: 'management',
    title: 'Solicitud de obras de mejora',
    scenario_es: 'Como propietario de un inmueble en alquiler, escribes a tu gestor de propiedades para autorizar obras de mejora.',
    level: 'C1',
    subject: 'Authorisation of Improvement Works — 24 Church Road',
    body: `Dear Ms. Okafor,

I am writing to authorise the undertaking of improvement works at my rental property, 24 Church Road, currently tenanted by Mr. and Mrs. Patel.

Having reviewed the most recent property inspection report, I have concluded that the following works would significantly enhance the property's value, marketability, and energy efficiency rating:

1. Replacement of the existing gas boiler with a new A-rated condensing unit (estimated cost: £2,800)
2. Installation of loft insulation to current Building Regulations standards (estimated cost: £600)
3. Replacement of single-glazed sash windows in the front reception room with double-glazed, heritage-compatible units (estimated cost: £3,400)

I would ask that all works be carried out by fully qualified and insured contractors, and that the tenants are given no less than 48 hours' written notice before any visit. The timing of the works must be agreed with Mr. and Mrs. Patel so as to cause minimum disruption.

Please obtain at least two competitive quotes for each item of work before proceeding, and submit these to me for approval. I would anticipate that all works could be completed during the tenants' planned holiday absence in early August.

Kindly confirm receipt of this instruction and advise of the anticipated timeline.

Yours sincerely,
Robert Ashford
Property Owner`,
  },

  // ── INVERSIÓN ────────────────────────────────────────────────────────────────
  {
    id: 'i01',
    category: 'investment',
    title: 'Consulta sobre rendimiento de inversión',
    scenario_es: 'Estás interesado en comprar una propiedad como inversión y consultas al agente sobre la rentabilidad esperada.',
    level: 'B2',
    subject: 'Investment Property Enquiry — Rental Yield and ROI',
    body: `Dear Mr. Sinclair,

I am currently in the process of building a small residential property portfolio and am seeking investment opportunities in the Greater Manchester area. I came across your agency's listings and believe you may be well placed to assist me.

I am specifically looking for properties with the following characteristics:
— Purchase price between £150,000 and £220,000
— Gross rental yield of at least 6%
— Properties requiring no more than cosmetic refurbishment
— Strong rental demand, ideally near universities or transport links

Could you please advise on the average rental yields currently achievable in the areas you cover? I would also welcome your view on capital appreciation prospects over the medium term.

I would be grateful if you could send me details of any properties on your books — or that are likely to come to market in the next three months — that meet the above criteria. I am a cash buyer and can therefore move quickly.

I look forward to speaking with you further.

Yours sincerely,
Isabel Ramírez`,
  },
  {
    id: 'i02',
    category: 'investment',
    title: 'Solicitud de documentación para due diligence',
    scenario_es: 'Tienes interés en adquirir un bloque de pisos y solicitas toda la documentación necesaria para el proceso de due diligence.',
    level: 'C1',
    subject: 'Due Diligence Documentation Request — Marlowe House, Sheffield',
    body: `Dear Mr. Sinclair,

Further to our telephone conversation on Thursday, I confirm my serious interest in acquiring Marlowe House, Sheffield, subject to satisfactory completion of our due diligence process.

In order to proceed to the next stage, I would be grateful if you could arrange for the following documentation to be made available at your earliest convenience:

Financial:
— Audited rental income accounts for the past three years
— Current rent roll, including lease expiry dates and any rent review provisions
— Details of any outstanding service charge arrears or disputed accounts

Legal:
— Title register and filed plan
— Copy of the head lease (if applicable) and details of any restrictive covenants
— Schedule of occupational leases for all 18 units

Technical:
— Most recent structural survey or building condition report
— Current EPC certificates for all units
— Details of any planned or anticipated capital expenditure

Please also provide the contact details of the current managing agent, as we will need to liaise with them directly during the inspection phase.

We anticipate completing our review within four weeks of receiving the above documentation, after which we will be in a position to confirm our position.

Yours sincerely,
Isabel Ramírez
Acquisitions Director, IR Property Ltd`,
  },
  {
    id: 'i03',
    category: 'investment',
    title: 'Propuesta de co-inversión',
    scenario_es: 'Propones a otro inversor una asociación para adquirir y desarrollar conjuntamente una propiedad comercial.',
    level: 'C1',
    subject: 'Joint Venture Proposal — Commercial Property Acquisition',
    body: `Dear Mr. Nakamura,

I am writing to propose a joint venture between our respective companies for the acquisition and development of a mixed-use commercial property in central Leeds.

The opportunity I have in mind is a former retail unit with planning consent for conversion to eight residential apartments above ground-floor commercial space. The asking price is £1.2 million, with an estimated total development cost — including professional fees, fit-out and contingency — of approximately £850,000. The projected gross development value upon completion stands at £2.4 million, representing an attractive margin for both parties.

I propose a 50/50 equity split with proportionate profit sharing, with your firm taking the lead on construction management and mine managing the sales and lettings strategy. A bespoke Special Purpose Vehicle would be incorporated to ring-fence liability and facilitate clean accounting.

I believe the complementary nature of our respective expertise makes this an ideal partnership. I would welcome the opportunity to present a more detailed financial model and feasibility study at your office at a mutually convenient time.

Please let me know your initial thoughts at your earliest convenience.

Yours sincerely,
Thomas Hartley
Director, TH Capital Properties`,
  },

  // ── AGENTE ───────────────────────────────────────────────────────────────────
  {
    id: 'a01',
    category: 'agent',
    title: 'Presentación de propiedades a un cliente',
    scenario_es: 'Eres agente inmobiliario y envías a un cliente una selección de propiedades que se ajustan a sus criterios.',
    level: 'B1',
    subject: 'Property Selection Matching Your Requirements',
    body: `Dear Mr. and Mrs. Henderson,

Thank you for meeting with me at our office last week. Following our conversation, I have prepared a selection of properties that I believe closely match your requirements: a three-bedroom detached house within a 10-minute drive of the town centre, with a budget of up to £425,000.

Please find attached details of the following four properties:

1. 7 Birchwood Drive — £399,000 (3 bed, detached, large rear garden, available immediately)
2. 19 Manor Close — £415,000 (3 bed, detached, recently refurbished kitchen and bathrooms)
3. 4 The Willows — £420,000 (4 bed, semi-detached, popular school catchment area)
4. 32 Oak Lane — £395,000 (3 bed, detached, in need of some modernisation, priced accordingly)

All four properties are within your stated budget and are available for viewing at short notice. Based on what you told me about your priorities, I would particularly draw your attention to 19 Manor Close and 4 The Willows.

Would you like to arrange viewings for any of these properties? I am available this weekend and most weekday evenings.

Kind regards,
James Whitfield
Senior Property Consultant`,
  },
  {
    id: 'a02',
    category: 'agent',
    title: 'Seguimiento tras visita a la propiedad',
    scenario_es: 'Eres agente y haces un seguimiento con el cliente tras la visita para conocer su interés y próximos pasos.',
    level: 'B1',
    subject: 'Follow-Up After Your Viewing — 19 Manor Close',
    body: `Dear Mr. and Mrs. Henderson,

Thank you for visiting 19 Manor Close yesterday. I hope you found the property of interest, and I wanted to follow up to hear your thoughts.

I know you had a few questions during the viewing, so I have looked into these for you:

— Regarding the boiler: the vendor has confirmed it was replaced in 2021 and is under a five-year warranty, which would be transferred to the new owner.
— The loft has been partially boarded and could be converted subject to planning permission. The vendor has no knowledge of any restrictions in the deeds relating to this.
— Parking: in addition to the driveway, there is permit parking available on the street with no waiting list.

If you are interested in making an offer, I would advise acting fairly promptly, as we have had two other viewings scheduled for this week. The vendor is motivated to sell and may be receptive to a sensible offer below the asking price.

Do not hesitate to call me on my direct number if you have any further questions. I would be delighted to help you progress to the next stage.

Best regards,
James Whitfield
Senior Property Consultant`,
  },
  {
    id: 'a03',
    category: 'agent',
    title: 'Solicitud de reducción de precio al propietario',
    scenario_es: 'Eres agente y debes comunicar al vendedor que el precio de la propiedad es demasiado alto y recomendas una reducción.',
    level: 'B2',
    subject: 'Market Appraisal Update — 19 Manor Close',
    body: `Dear Mr. Robertson,

I am writing to provide you with an update on the marketing of 19 Manor Close, which has now been on the market for eleven weeks.

I appreciate that no decision of this nature is straightforward, and I want to be open and honest with you about the current position. Despite extensive marketing activity — including a feature listing, social media promotion, and three open house events — we have received limited genuine interest. Of the eight viewings conducted to date, we have received no offers, and the feedback from prospective buyers has consistently indicated that the property is perceived as overpriced relative to comparable sales in the area.

Recent comparable transactions in Manor Close and the surrounding streets suggest a more realistic market value of between £395,000 and £408,000. I would therefore recommend a price reduction to £405,000, which I believe would significantly increase buyer interest and generate competitive offers.

I understand this may be disappointing news. However, a proactive price adjustment now is likely to result in a faster sale and a stronger final sale price than continuing to wait at the current level. I would welcome the opportunity to discuss this further at your convenience.

Please do not hesitate to call me directly.

Yours sincerely,
James Whitfield
Senior Property Consultant`,
  },
  {
    id: 'a04',
    category: 'agent',
    title: 'Solicitud de referencias a un candidato a inquilino',
    scenario_es: 'Eres agente y escribes a un candidato a inquilino para solicitar las referencias y documentación necesarias.',
    level: 'B1',
    subject: 'Tenancy Application — Next Steps and Reference Requirements',
    body: `Dear Ms. Okonkwo,

Thank you for your application to rent Flat 3, 8 Rose Avenue. I am pleased to inform you that the landlord has reviewed your application and would like to proceed to the referencing stage.

To enable us to carry out the necessary checks, we will need you to provide the following within the next five working days:

1. Proof of identity — a certified copy of your passport or driving licence
2. Proof of current address — a utility bill or bank statement dated within the last three months
3. Three months' payslips or, if self-employed, your most recent tax return (SA302)
4. A reference from your current landlord or letting agent
5. An employer's reference confirming your position, salary, and contract type

We use a third-party referencing agency to carry out these checks, and you will receive an email from them shortly with instructions on how to submit your documents securely online.

Once referencing has been completed satisfactorily — which normally takes three to five working days — we will be in a position to confirm the tenancy and agree a move-in date.

Please do not hesitate to contact me if you have any questions about the process.

Kind regards,
James Whitfield
Senior Property Consultant`,
  },
]

const LEVEL_COLORS: Record<string, string> = {
  B1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  B2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  C1: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function HighlightedBody({
  body,
  terms,
  onTermClick,
}: {
  body: string
  terms: LexTerm[]
  onTermClick: (id: string) => void
}) {
  const termMap = new Map<string, LexTerm>()
  terms.forEach(t => {
    const key = t.word_en.toLowerCase()
    if (!termMap.has(key)) termMap.set(key, t)
  })

  const lines = body.split('\n')
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {lines.map((line, li) => {
        if (!line.trim()) return <span key={li}>{'\n'}</span>
        const tokens = line.split(/(\s+|[,.:;!?'"()\-—])/g)
        return (
          <span key={li}>
            {tokens.map((token, ti) => {
              const clean = token.replace(/[^a-z'-]/gi, '').toLowerCase()
              const term = termMap.get(clean)
              if (term && clean.length > 2) {
                return (
                  <button key={ti} onClick={() => onTermClick(term.id)}
                    className="bg-emerald-500/20 text-emerald-300 rounded px-0.5 hover:bg-emerald-500/35
                               underline underline-offset-2 decoration-emerald-500/50 transition-colors
                               cursor-pointer inline">
                    {token}
                  </button>
                )
              }
              return <span key={ti}>{token}</span>
            })}
            {li < lines.length - 1 ? '\n' : ''}
          </span>
        )
      })}
    </div>
  )
}

export default function EmailTemplatesSection({ terms, dataLoaded, onSelectTerm }: Props) {
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [termPopup, setTermPopup] = useState<LexTerm | null>(null)

  function handleTermClick(termId: string) {
    const term = terms.find(t => t.id === termId)
    if (term) setTermPopup(term)
  }

  if (!dataLoaded) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (selected) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 mb-2 transition-colors">
              ← Volver a plantillas
            </button>
            <h1 className="text-lg font-bold text-white">{selected.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{selected.scenario_es}</p>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded border flex-shrink-0 ${LEVEL_COLORS[selected.level]}`}>
            {selected.level}
          </span>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2.5">
          <p className="text-emerald-400/70 text-xs">
            Los <span className="text-emerald-400 font-medium bg-emerald-500/20 rounded px-0.5">términos resaltados</span> están en tu diccionario — haz clic para ver la definición.
          </p>
        </div>

        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-700/30">
            <div className="text-xs text-slate-500 mb-0.5">Asunto / Subject</div>
            <div className="text-white font-medium text-sm">{selected.subject}</div>
          </div>
          <div className="px-5 py-5">
            <HighlightedBody body={selected.body} terms={terms} onTermClick={handleTermClick} />
          </div>
          <div className="px-5 py-3 border-t border-slate-700/30">
            <button onClick={() => speak(selected.body, 0.9)}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 text-xs transition-colors">
              <Volume2 size={13} />
              Leer en voz alta
            </button>
          </div>
        </div>

        {termPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
               onClick={() => setTermPopup(null)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative bg-[#0f2040] border border-emerald-500/30 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
                 onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-xl">{termPopup.word_en}</h3>
                    <button onClick={() => speak(termPopup.word_en)}
                      className="p-1 text-slate-500 hover:text-emerald-400 transition-colors">
                      <Volume2 size={15} />
                    </button>
                  </div>
                  {termPopup.pronunciation && (
                    <p className="text-slate-500 text-xs">{termPopup.pronunciation}</p>
                  )}
                </div>
                <button onClick={() => setTermPopup(null)}
                  className="text-slate-500 hover:text-white p-1 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 mb-3">
                <div className="text-emerald-300 font-semibold text-sm">{termPopup.translation_es}</div>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed mb-3">{termPopup.definition_es}</p>

              {termPopup.example_en && (
                <p className="text-slate-500 text-xs italic">"{termPopup.example_en}"</p>
              )}

              <button onClick={() => { setTermPopup(null); onSelectTerm(termPopup.id) }}
                className="mt-4 w-full flex items-center justify-center gap-2 border border-emerald-500/30
                           text-emerald-400 hover:bg-emerald-500/10 py-2 rounded-xl text-sm transition-colors">
                <BookOpen size={14} />
                Ver ficha completa
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const filtered = TEMPLATES.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false
    if (!q) return true
    return (
      t.title.toLowerCase().includes(q) ||
      t.scenario_es.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Mail size={20} className="text-emerald-400" />
          Emails profesionales
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Plantillas de emails reales del sector inmobiliario con vocabulario resaltado.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por tema, palabra o frase..."
          className="w-full bg-[#0f2040] border border-slate-700/40 rounded-xl pl-9 pr-9 py-2.5
                     text-sm text-white placeholder-slate-500 focus:outline-none
                     focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const count = TEMPLATES.filter(t => {
            if (cat.id !== 'all' && t.category !== cat.id) return false
            if (!q) return true
            return t.title.toLowerCase().includes(q) || t.scenario_es.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.body.toLowerCase().includes(q)
          }).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                ${activeCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800/40 text-slate-400 border-slate-700/30 hover:text-white hover:border-slate-600'}`}>
              {cat.label}
              <span className={`ml-1.5 text-[10px] ${activeCategory === cat.id ? 'text-emerald-500' : 'text-slate-600'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-14 text-slate-500 text-sm">
          <Search size={28} className="mx-auto mb-3 text-slate-700" />
          No se encontraron plantillas para <span className="text-slate-400">"{search}"</span>.
          <button onClick={() => { setSearch(''); setActiveCategory('all') }}
            className="block mx-auto mt-3 text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
            Limpiar búsqueda
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}
            className="bg-[#0f2040] hover:bg-[#132952] border border-slate-700/30
                       hover:border-emerald-500/20 rounded-2xl p-5 text-left transition-all group">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                              flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-emerald-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/30">
                  {CATEGORIES.find(c => c.id === t.category)?.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[t.level]}`}>
                  {t.level}
                </span>
              </div>
            </div>
            <div className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors mb-1">
              {t.title}
            </div>
            <div className="text-slate-500 text-xs leading-relaxed line-clamp-2">
              {t.scenario_es}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
