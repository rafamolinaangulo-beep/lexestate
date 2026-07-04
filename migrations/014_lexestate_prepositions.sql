-- Migration 014: LexEstate Prepositions section
-- Creates lexestate_prepositions and lexestate_preposition_progress tables

CREATE TABLE IF NOT EXISTS lexestate_prepositions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  preposition text NOT NULL,
  use_case    text NOT NULL,
  use_case_es text NOT NULL,
  example_en  text NOT NULL,
  example_es  text NOT NULL,
  category    text NOT NULL,
  category_es text NOT NULL,
  level       text NOT NULL DEFAULT 'B1' CHECK (level IN ('B1','B2','C1','C2')),
  notes       text,
  sort_order  int  DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lexestate_preposition_progress (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         text NOT NULL,
  preposition_id  uuid NOT NULL REFERENCES lexestate_prepositions(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','learning','difficult','mastered')),
  correct_answers int  DEFAULT 0,
  wrong_answers   int  DEFAULT 0,
  attempts        int  DEFAULT 0,
  correct_streak  int  DEFAULT 0,
  last_reviewed_at timestamptz,
  next_review_at  timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, preposition_id)
);

ALTER TABLE lexestate_prepositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexestate_preposition_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on prepositions"
  ON lexestate_prepositions FOR SELECT USING (true);

CREATE POLICY "Users manage their preposition progress"
  ON lexestate_preposition_progress FOR ALL
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'email')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- ── Seed data ────────────────────────────────────────────────────────────────

INSERT INTO lexestate_prepositions
  (preposition, use_case, use_case_es, example_en, example_es, category, category_es, level, sort_order)
VALUES
  -- AT  (B1)
  ('AT',  'at auction — sold by public competitive bidding',        'at auction — vendido en subasta pública',
   'The property was sold at auction.',
   'La propiedad fue vendida en subasta pública.',
   'transaction', 'Transacción', 'B1', 10),

  ('AT',  'at a price of — specifying the selling price',          'at a price of — especificando el precio de venta',
   'Available at a price of £450,000.',
   'Disponible a un precio de 450.000 libras.',
   'transaction', 'Transacción', 'B1', 11),

  ('AT',  'at the property — physically located there',            'at the property — en la propiedad',
   'There will be a viewing at the property on Saturday.',
   'Habrá una visita en la propiedad el sábado.',
   'location', 'Ubicación', 'B1', 12),

  ('AT',  'at completion — at the moment of legal handover',       'at completion — en el momento de la escritura',
   'The balance is payable at completion.',
   'El saldo es pagadero a la firma de la escritura.',
   'time', 'Tiempo', 'B1', 13),

  -- IN  (B1)
  ('IN',  'in the contract — contained in the legal document',     'in the contract — en el contrato',
   'The conditions are clearly stated in the contract.',
   'Las condiciones se indican claramente en el contrato.',
   'legal', 'Legal', 'B1', 20),

  ('IN',  'in possession — currently occupied or held',            'in possession — en posesión',
   'The tenant is in possession of the property.',
   'El inquilino está en posesión de la propiedad.',
   'possession', 'Posesión', 'B1', 21),

  ('IN',  'in arrears — behind on scheduled payments',             'in arrears — en mora, con pagos atrasados',
   'The tenant is two months in arrears with the rent.',
   'El inquilino lleva dos meses en mora con el alquiler.',
   'financial', 'Financiero', 'B1', 22),

  ('IN',  'in the market — within the property market context',    'in the market — en el mercado inmobiliario',
   'Demand in the market for new builds is rising.',
   'La demanda en el mercado de obra nueva está creciendo.',
   'market', 'Mercado', 'B1', 23),

  ('IN',  'in development — currently being built or planned',     'in development — en desarrollo/construcción',
   'Several units are still in development.',
   'Varias unidades están todavía en desarrollo.',
   'construction', 'Construcción', 'B1', 24),

  -- ON  (B1)
  ('ON',  'on the market — listed and available for sale or rent', 'on the market — a la venta / en alquiler',
   'The house has been on the market for three months.',
   'La casa lleva tres meses en el mercado.',
   'market', 'Mercado', 'B1', 30),

  ('ON',  'on the ground floor — located at street level',        'on the ground floor — en la planta baja',
   'The commercial premises are on the ground floor.',
   'Los locales comerciales están en la planta baja.',
   'location', 'Ubicación', 'B1', 31),

  ('ON',  'on completion — upon the final legal transfer',        'on completion — a la escritura / en la entrega',
   'Keys will be handed over on completion.',
   'Las llaves se entregarán en la escritura.',
   'time', 'Tiempo', 'B1', 32),

  ('ON',  'on behalf of — representing another party',            'on behalf of — en nombre de, en representación de',
   'We are acting on behalf of the vendor.',
   'Actuamos en nombre del vendedor.',
   'legal', 'Legal', 'B1', 33),

  -- FOR  (B1)
  ('FOR', 'for sale — available to be purchased',                  'for sale — en venta',
   'This commercial unit is for sale.',
   'Esta unidad comercial está en venta.',
   'market', 'Mercado', 'B1', 40),

  ('FOR', 'for lease — available to rent on a long-term basis',   'for lease — en arrendamiento',
   'Prime office space available for lease.',
   'Oficinas prime disponibles en arrendamiento.',
   'market', 'Mercado', 'B1', 41),

  ('FOR', 'for development — land or buildings intended for building work',
   'for development — para promoción/desarrollo inmobiliario',
   'A plot of land for development in a prime location.',
   'Un solar para desarrollo inmobiliario en ubicación prime.',
   'market', 'Mercado', 'B1', 42),

  -- BY  (B2)
  ('BY',  'by private treaty — negotiated sale without public auction',
   'by private treaty — por negociación privada (venta directa)',
   'The house was sold by private treaty for £320,000.',
   'La casa fue vendida por negociación privada por 320.000 libras.',
   'transaction', 'Transacción', 'B2', 50),

  ('BY',  'by auction — sold through a formal public bidding process',
   'by auction — mediante subasta pública',
   'The commercial estate was disposed of by auction.',
   'El inmueble comercial fue vendido mediante subasta pública.',
   'transaction', 'Transacción', 'B2', 51),

  ('BY',  'by the landlord — action carried out by the property owner',
   'by the landlord — por el arrendador / propietario',
   'A formal notice was served by the landlord.',
   'El arrendador presentó una notificación formal.',
   'legal', 'Legal', 'B2', 52),

  ('BY',  'by the tenant — obligation or action of the occupying renter',
   'by the tenant — por el arrendatario / inquilino',
   'All internal repairs must be carried out by the tenant.',
   'El inquilino debe realizar todas las reparaciones internas.',
   'legal', 'Legal', 'B2', 53),

  -- UNDER  (B2)
  ('UNDER', 'under contract — a binding purchase agreement has been signed',
   'under contract — bajo contrato (contrato firmado)',
   'This property is already under contract.',
   'Esta propiedad ya está bajo contrato.',
   'transaction', 'Transacción', 'B2', 60),

  ('UNDER', 'under offer — a formal offer has been accepted, awaiting exchange',
   'under offer — bajo oferta (oferta aceptada, pendiente de contratos)',
   'The property is currently under offer.',
   'La propiedad está actualmente bajo oferta.',
   'transaction', 'Transacción', 'B2', 61),

  ('UNDER', 'under development — currently being built or renovated',
   'under development — en desarrollo, en obras',
   'The whole site is under development.',
   'Todo el solar está en desarrollo.',
   'construction', 'Construcción', 'B2', 62),

  ('UNDER', 'under the terms of — as specified in a legal document',
   'under the terms of — según los términos de, bajo las condiciones de',
   'Under the terms of the lease, the tenant pays for utilities.',
   'Según los términos del contrato, el inquilino paga los suministros.',
   'legal', 'Legal', 'B2', 63),

  -- WITH  (B2)
  ('WITH', 'with vacant possession — empty and available on handover',
   'with vacant possession — con posesión libre (inmueble vacío al entregarse)',
   'The property is being sold with vacant possession.',
   'La propiedad se vende con posesión libre.',
   'possession', 'Posesión', 'B2', 70),

  ('WITH', 'with planning permission — approved for construction or change of use',
   'with planning permission — con licencia urbanística / permiso de obras',
   'Land for sale with planning permission for 8 units.',
   'Solar en venta con licencia urbanística para 8 unidades.',
   'legal', 'Legal', 'B2', 71),

  ('WITH', 'with a mortgage — financed through a loan secured on the property',
   'with a mortgage — con hipoteca / financiado mediante préstamo hipotecario',
   'The property was acquired with a 75% mortgage.',
   'La propiedad fue adquirida con una hipoteca del 75%.',
   'financial', 'Financiero', 'B2', 72),

  ('WITH', 'with immediate effect — starting from now, without delay',
   'with immediate effect — con efecto inmediato',
   'The rent increase applies with immediate effect.',
   'El incremento de la renta se aplica con efecto inmediato.',
   'legal', 'Legal', 'B2', 73),

  ('WITH', 'in exchange for — received in return for something given',
   'in exchange for — a cambio de',
   'The property was transferred in exchange for debt settlement.',
   'La propiedad fue transferida a cambio de la liquidación de la deuda.',
   'transaction', 'Transacción', 'B2', 74),

  -- SUBJECT TO  (C1)
  ('SUBJECT TO', 'subject to contract — not legally binding until contracts exchanged (STC)',
   'subject to contract — sujeto a contrato, pendiente de contratos (STC)',
   'The offer has been accepted, subject to contract.',
   'La oferta ha sido aceptada, pendiente de contrato.',
   'legal', 'Legal', 'C1', 80),

  ('SUBJECT TO', 'subject to planning — conditional on obtaining planning permission',
   'subject to planning — sujeto a licencia urbanística',
   'The purchase is subject to planning permission being granted.',
   'La compra está sujeta a la concesión de la licencia urbanística.',
   'legal', 'Legal', 'C1', 81),

  ('SUBJECT TO', 'subject to survey — conditional on a satisfactory surveyor''s report',
   'subject to survey — sujeto a informe pericial satisfactorio',
   'An offer was made subject to satisfactory survey.',
   'Se realizó una oferta sujeta a informe pericial satisfactorio.',
   'legal', 'Legal', 'C1', 82),

  ('SUBJECT TO', 'subject to mortgage approval — conditional on the lender approving the loan',
   'subject to mortgage approval — sujeto a aprobación hipotecaria',
   'The deal is subject to mortgage approval from the bank.',
   'La operación está sujeta a la aprobación hipotecaria del banco.',
   'financial', 'Financiero', 'C1', 83),

  -- PRIOR TO  (C1)
  ('PRIOR TO', 'prior to completion — before the final legal transfer takes place',
   'prior to completion — antes de la escritura / antes de la entrega',
   'All defects must be remedied prior to completion.',
   'Todos los defectos deben subsanarse antes de la escritura.',
   'time', 'Tiempo', 'C1', 90),

  ('PRIOR TO', 'prior to exchange — before contracts are formally exchanged',
   'prior to exchange — antes del intercambio de contratos',
   'Surveys and searches should be completed prior to exchange.',
   'Los informes y comprobaciones deben completarse antes del intercambio de contratos.',
   'time', 'Tiempo', 'C1', 91),

  -- IN LIEU OF  (C1)
  ('IN LIEU OF', 'in lieu of — instead of, as a substitute for',
   'in lieu of — en lugar de, en sustitución de',
   'A cash payment was accepted in lieu of repair works.',
   'Se aceptó un pago en efectivo en lugar de las obras de reparación.',
   'financial', 'Financiero', 'C1', 92),

  -- AS PER  (C1)
  ('AS PER', 'as per — as stated by, in accordance with',
   'as per — según, conforme a, de acuerdo con',
   'As per the agreement, the deposit is non-refundable.',
   'Según el acuerdo, la señal no es reembolsable.',
   'legal', 'Legal', 'C1', 93),

  -- IN ACCORDANCE WITH  (C2)
  ('IN ACCORDANCE WITH', 'in accordance with — following the rules or terms specified',
   'in accordance with — de conformidad con, en virtud de',
   'In accordance with the lease, rent is due on the first of each month.',
   'De conformidad con el arrendamiento, la renta vence el primero de cada mes.',
   'legal', 'Legal', 'C2', 100),

  -- PURSUANT TO  (C2)
  ('PURSUANT TO', 'pursuant to — as a consequence of or authorised by',
   'pursuant to — conforme a, al amparo de, en virtud de',
   'Pursuant to clause 5, the landlord may re-enter the premises.',
   'Conforme a la cláusula 5, el arrendador puede reclamar la posesión del inmueble.',
   'legal', 'Legal', 'C2', 101),

  -- IN THE EVENT OF  (C2)
  ('IN THE EVENT OF', 'in the event of — if a particular situation arises',
   'in the event of — en caso de, en el supuesto de',
   'In the event of default, the deposit shall be forfeited.',
   'En caso de incumplimiento, la señal quedará en poder del vendedor.',
   'legal', 'Legal', 'C2', 102),

  -- NOTWITHSTANDING  (C2)
  ('NOTWITHSTANDING', 'notwithstanding — despite, in spite of (formal)',
   'notwithstanding — no obstante, a pesar de (formal)',
   'Notwithstanding the above, force majeure provisions may apply.',
   'No obstante lo anterior, podrían aplicarse las cláusulas de fuerza mayor.',
   'legal', 'Legal', 'C2', 103)

ON CONFLICT DO NOTHING;
