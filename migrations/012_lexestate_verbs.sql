-- migrations/012_lexestate_verbs.sql
-- LexEstate: Verbs module (irregular + regular) with sentence practice

CREATE TABLE IF NOT EXISTS lexestate_verbs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_form         TEXT NOT NULL,
  past_simple       TEXT NOT NULL,
  past_participle   TEXT NOT NULL,
  translation_es    TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'irregular'
                    CHECK (type IN ('regular','irregular')),
  notes             TEXT,
  example_past      TEXT,  -- sentence using past simple, with ___ as blank
  example_participle TEXT, -- sentence using past participle, with ___ as blank
  difficulty        INTEGER DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  frequency         INTEGER DEFAULT 3 CHECK (frequency BETWEEN 1 AND 5),
  tags              TEXT[],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lexestate_verb_progress (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  verb_id          UUID NOT NULL REFERENCES lexestate_verbs(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','learning','difficult','mastered')),
  correct_answers  INTEGER DEFAULT 0,
  wrong_answers    INTEGER DEFAULT 0,
  attempts         INTEGER DEFAULT 0,
  correct_streak   INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, verb_id)
);

CREATE INDEX IF NOT EXISTS idx_lex_verbs_type     ON lexestate_verbs(type);
CREATE INDEX IF NOT EXISTS idx_lex_verb_prog_user ON lexestate_verb_progress(user_id);

ALTER TABLE lexestate_verbs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexestate_verb_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lex_verbs_public_read"   ON lexestate_verbs         FOR SELECT USING (true);
CREATE POLICY "lex_verb_progress_own"   ON lexestate_verb_progress FOR ALL    USING (true) WITH CHECK (true);

-- ── Seed ────────────────────────────────────────────────────────────────────────
INSERT INTO lexestate_verbs
  (base_form, past_simple, past_participle, translation_es, type, difficulty, frequency, notes, example_past, example_participle)
VALUES

-- ── IRREGULAR (high frequency) ─────────────────────────────────────────────────
('be',         'was / were',   'been',          'ser / estar',                  'irregular', 1, 5, 'was (sing.) / were (pl.)',
  'The property ___ sold at auction last Tuesday.',
  'The contract has already been ___ by both parties.'),

('have',       'had',          'had',           'tener / haber',                'irregular', 1, 5, NULL,
  'The company ___ a portfolio of 40 properties last year.',
  'The agent has ___ several offers on the table.'),

('do',         'did',          'done',          'hacer',                        'irregular', 1, 5, NULL,
  'The surveyor ___ a full structural inspection yesterday.',
  'All the necessary checks have been ___.'),

('go',         'went',         'gone',          'ir / irse',                    'irregular', 1, 5, NULL,
  'The market ___ up significantly in the last quarter.',
  'Prices have ___ up 15% in the past year.'),

('say',        'said',         'said',          'decir',                        'irregular', 1, 5, NULL,
  'The agent ___ the asking price was negotiable.',
  'It has been ___ that location is everything in real estate.'),

('get',        'got',          'got / gotten',  'obtener / conseguir',          'irregular', 1, 5, '"Gotten" más común en inglés americano',
  'They finally ___ planning permission after six months.',
  'The developer has ___ approval for the new project.'),

('make',       'made',         'made',          'hacer / fabricar',             'irregular', 1, 5, NULL,
  'The buyer ___ a formal offer below the asking price.',
  'A decision has been ___ about the renovation plans.'),

('take',       'took',         'taken',         'tomar / llevar',               'irregular', 1, 5, NULL,
  'The transaction ___ three months from offer to completion.',
  'Precautions have been ___ to protect the investment.'),

('see',        'saw',          'seen',          'ver',                          'irregular', 1, 5, NULL,
  'We ___ a 20% increase in property values last year.',
  'Strong demand has been ___ across all price brackets.'),

('come',       'came',         'come',          'venir / llegar',               'irregular', 1, 5, NULL,
  'The best offer ___ from an overseas investor.',
  'The project has ___ a long way since its inception.'),

('give',       'gave',         'given',         'dar',                          'irregular', 1, 5, NULL,
  'The landlord ___ the tenant one month''s notice.',
  'The bank has ___ provisional approval for the mortgage.'),

('find',       'found',        'found',         'encontrar',                    'irregular', 1, 5, NULL,
  'They ___ a buyer within two weeks of listing.',
  'A buyer has been ___ for the commercial unit.'),

('tell',       'told',         'told',          'decir / contar',               'irregular', 2, 5, NULL,
  'The solicitor ___ us to wait before signing anything.',
  'We were ___ the survey results would take a week.'),

('know',       'knew',         'known',         'saber / conocer',              'irregular', 2, 5, NULL,
  'She ___ the local property market extremely well.',
  'The risk has been ___ since the first due diligence report.'),

('think',      'thought',      'thought',       'pensar / creer',               'irregular', 2, 4, NULL,
  'The investors ___ the ROI would be higher.',
  'The strategy has been ___ through carefully.'),

('build',      'built',        'built',         'construir',                    'irregular', 2, 5, NULL,
  'The developer ___ 60 apartments in this area last year.',
  'The new office complex has been ___ to LEED standards.'),

('buy',        'bought',       'bought',        'comprar',                      'irregular', 2, 5, NULL,
  'The fund ___ the entire residential block at auction.',
  'Three properties have been ___ in the last quarter.'),

('sell',       'sold',         'sold',          'vender',                       'irregular', 2, 5, NULL,
  'The agency ___ over 200 properties last year.',
  'All units in the development have been ___ off-plan.'),

('pay',        'paid',         'paid',          'pagar',                        'irregular', 2, 5, NULL,
  'The buyer ___ a 20% deposit at signing.',
  'All outstanding fees have been ___.'),

('send',       'sent',         'sent',          'enviar',                       'irregular', 2, 4, NULL,
  'The solicitor ___ the draft contract by email yesterday.',
  'All documents have been ___ to the relevant parties.'),

('leave',      'left',         'left',          'dejar / salir',                'irregular', 2, 4, NULL,
  'The previous tenants ___ the flat in perfect condition.',
  'The decision has been ___ to the board of directors.'),

('keep',       'kept',         'kept',          'guardar / mantener',           'irregular', 2, 4, NULL,
  'The estate agent ___ all documents on file.',
  'Records have been ___ of every transaction.'),

('hold',       'held',         'held',          'sostener / celebrar / tener',  'irregular', 2, 4, NULL,
  'The developer ___ a launch event at the show flat.',
  'A public consultation has been ___ about the development.'),

('spend',      'spent',        'spent',         'gastar / pasar (tiempo)',      'irregular', 2, 4, NULL,
  'The investors ___ €3M refurbishing the hotel.',
  'A considerable budget has been ___ on marketing.'),

('meet',       'met',          'met',           'conocer / reunirse',           'irregular', 1, 4, NULL,
  'We ___ the developer at the site office last Friday.',
  'All planning requirements have been ___.'),

('lead',       'led',          'led',           'liderar / provocar',           'irregular', 2, 4, NULL,
  'Rising demand ___ to a sharp increase in rental prices.',
  'The project has been ___ by an experienced team.'),

('deal',       'dealt',        'dealt',         'tratar / negociar',            'irregular', 3, 4, NULL,
  'The broker ___ with complex commercial transactions.',
  'The matter has been ___ with by our legal team.'),

('bring',      'brought',      'brought',       'traer / llevar',               'irregular', 2, 4, NULL,
  'The renovation ___ the property value up by 25%.',
  'The new infrastructure has ___ significant investment to the area.'),

('write',      'wrote',        'written',       'escribir',                     'irregular', 2, 4, NULL,
  'The solicitor ___ the contract in under 24 hours.',
  'The report has been ___ by an independent surveyor.'),

('speak',      'spoke',        'spoken',        'hablar',                       'irregular', 3, 3, NULL,
  'The developer ___ to the planning committee last week.',
  'A representative has ___ to the press about the project.'),

('understand', 'understood',   'understood',    'entender / comprender',        'irregular', 3, 4, NULL,
  'We finally ___ the full implications of the lease agreement.',
  'The terms have been ___ and accepted by all parties.'),

('run',        'ran',          'run',           'gestionar / correr',           'irregular', 2, 4, NULL,
  'She ___ the property management company for 12 years.',
  'The portfolio has been ___ efficiently since the restructure.'),

('begin',      'began',        'begun',         'comenzar / empezar',           'irregular', 3, 4, NULL,
  'The construction works ___ in early spring.',
  'A new phase of development has ___.'),

('become',     'became',       'become',        'convertirse en',               'irregular', 2, 4, NULL,
  'The district ___ one of the most sought-after in the city.',
  'The area has ___ a prime investment destination.'),

('grow',       'grew',         'grown',         'crecer / aumentar',            'irregular', 3, 4, NULL,
  'The portfolio ___ from 10 to 50 properties in five years.',
  'Rental yields have ___ steadily over the past decade.'),

('rise',       'rose',         'risen',         'subir / aumentar',             'irregular', 3, 4, NULL,
  'Property values ___ sharply in the third quarter.',
  'Average house prices have ___ by 8% this year.'),

('fall',       'fell',         'fallen',        'caer / bajar',                 'irregular', 3, 3, NULL,
  'Transaction volumes ___ after the interest rate hike.',
  'The number of new listings has ___ significantly.'),

('lose',       'lost',         'lost',          'perder',                       'irregular', 2, 3, NULL,
  'The buyers ___ the property because of a higher offer.',
  'Several investors have ___ money on distressed assets.'),

('choose',     'chose',        'chosen',        'elegir / escoger',             'irregular', 3, 3, NULL,
  'The buyers ___ this property after viewing fifteen listings.',
  'The architect has ___ sustainable materials for the build.'),

('break',      'broke',        'broken',        'romper / fracasar',            'irregular', 3, 3, NULL,
  'The deal ___ down due to the results of the survey.',
  'The record has been ___ for highest price per sq m.'),

('teach',      'taught',       'taught',        'enseñar / formar',             'irregular', 3, 3, NULL,
  'The workshop ___ investors how to analyse cash flow.',
  'The new regulations have ___ developers to plan ahead.'),

('feel',       'felt',         'felt',          'sentir',                       'irregular', 2, 3, NULL,
  'The team ___ confident about the market outlook.',
  'It has been ___ that more transparency is needed.'),

('hear',       'heard',        'heard',         'oír / tener noticias',         'irregular', 2, 3, NULL,
  'We ___ the planning application was approved.',
  'Nothing has been ___ from the other party since Monday.'),

('win',        'won',          'won',           'ganar',                        'irregular', 2, 3, NULL,
  'The firm ___ the contract after a competitive tender.',
  'Planning permission has been ___ after a long appeal.'),

('read',       'read',         'read',          'leer',                         'irregular', 2, 4, '"read" (pasado) se pronuncia /rɛd/',
  'The buyer ___ every clause in the contract carefully.',
  'The survey report has been ___ and signed off.'),

('put',        'put',          'put',           'poner / colocar',              'irregular', 1, 4, 'Las tres formas son iguales',
  'The landlord ___ the property on the market last spring.',
  'A new system has been ___ in place for tenant referencing.'),

('set',        'set',          'set',           'establecer / fijar',           'irregular', 2, 4, 'Las tres formas son iguales',
  'The developer ___ an ambitious target for 2026.',
  'Clear KPIs have been ___ for the property management team.'),

('cut',        'cut',          'cut',           'reducir / cortar',             'irregular', 1, 3, 'Las tres formas son iguales',
  'The agency ___ its fees to secure the exclusive listing.',
  'Operating costs have been ___ significantly this quarter.'),

('let',        'let',          'let',           'alquilar / permitir',          'irregular', 1, 5, 'Las tres formas son iguales. "Let" = alquilar en inglés británico',
  'The landlord ___ the apartment to a corporate tenant.',
  'All units have been ___ under a long-term agreement.'),

('cost',       'cost',         'cost',          'costar',                       'irregular', 1, 5, 'Las tres formas son iguales',
  'The full renovation ___ over €200,000.',
  'It has ___ the developer twice the original budget.'),

('lend',       'lent',         'lent',          'prestar',                      'irregular', 3, 4, 'Importante en finanzas inmobiliarias',
  'The bank ___ the company funds for the new development.',
  'Capital has been ___ at a competitive fixed rate.'),

('draw',       'drew',         'drawn',         'redactar / elaborar',          'irregular', 3, 3, NULL,
  'The architect ___ up detailed plans for the conversion.',
  'A new masterplan has been ___ for the district.'),

('drive',      'drove',        'driven',        'impulsar / conducir',          'irregular', 3, 3, NULL,
  'Low interest rates ___ unprecedented demand for housing.',
  'Growth has been ___ primarily by international investment.'),

('stand',      'stood',        'stood',         'estar / mantenerse',           'irregular', 2, 3, NULL,
  'The asking price ___ at €450,000 for three months.',
  'The offer has ___ since last Tuesday.'),

('mean',       'meant',        'meant',         'significar / querer decir',    'irregular', 2, 4, NULL,
  'The new zoning rules ___ investors had to reconsider their plans.',
  'The change in policy has ___ delays for many developers.'),

('sit',        'sat',          'sat',           'sentarse / estar ubicado',     'irregular', 2, 3, NULL,
  'The property ___ on the market for six months before selling.',
  'The file has ___ on the solicitor''s desk for two weeks.'),

('catch',      'caught',       'caught',        'captar / detectar',            'irregular', 3, 3, NULL,
  'The inspector ___ several structural defects during the survey.',
  'Every issue has been ___ before the exchange of contracts.'),

('forget',     'forgot',       'forgotten',     'olvidar',                      'irregular', 3, 3, NULL,
  'The buyer ___ to include the fixtures in the offer.',
  'The clause had been ___ from the original contract.'),

('fly',        'flew',         'flown',         'volar',                        'irregular', 3, 2, NULL,
  'The developer ___ in from Dubai to inspect the site.',
  'International buyers have ___ in specifically for the auction.'),

-- ── REGULAR (important for real estate) ────────────────────────────────────────
('sign',       'signed',       'signed',        'firmar',                       'regular', 1, 5, NULL,
  'Both parties ___ the agreement at the notary''s office.',
  'The contract has been ___ and the deposit transferred.'),

('accept',     'accepted',     'accepted',      'aceptar',                      'regular', 1, 5, NULL,
  'The seller ___ the offer after a brief negotiation.',
  'The bid has been ___ subject to survey.'),

('negotiate',  'negotiated',   'negotiated',    'negociar',                     'regular', 2, 5, NULL,
  'The broker ___ a 5% reduction on the original price.',
  'Better terms have been ___ for the long-term lease.'),

('offer',      'offered',      'offered',       'ofrecer',                      'regular', 1, 5, NULL,
  'The agent ___ the property at €350,000.',
  'A price reduction has been ___ to close the deal quickly.'),

('own',        'owned',        'owned',         'poseer / ser propietario',     'regular', 1, 5, NULL,
  'The fund ___ the building for over 20 years.',
  'The property has been ___ by the same family for generations.'),

('rent',       'rented',       'rented',        'alquilar (pagar alquiler)',    'regular', 1, 5, NULL,
  'The startup ___ a 500 sq m office in the business district.',
  'The apartment has been ___ out since January.'),

('value',      'valued',       'valued',        'valorar / tasar',              'regular', 1, 5, NULL,
  'The surveyor ___ the property at €520,000.',
  'The portfolio has been ___ at over €10M.'),

('invest',     'invested',     'invested',      'invertir',                     'regular', 1, 5, NULL,
  'The fund ___ €5M in the new residential development.',
  'A total of €20M has been ___ in the regeneration project.'),

('complete',   'completed',    'completed',     'completar / cerrar (venta)',   'regular', 1, 4, NULL,
  'The buyers ___ the purchase on 1st March.',
  'The transaction has been ___ without any legal complications.'),

('transfer',   'transferred',  'transferred',   'transferir / traspasar',       'regular', 2, 4, NULL,
  'The solicitor ___ the funds on the day of completion.',
  'The title has been officially ___ to the new owner.'),

('manage',     'managed',      'managed',       'gestionar / administrar',      'regular', 1, 4, NULL,
  'The agency ___ a portfolio of 200 rental properties.',
  'The estate has been ___ by the same company for 15 years.'),

('develop',    'developed',    'developed',     'desarrollar / construir',      'regular', 1, 4, NULL,
  'The company ___ a mixed-use scheme on the former industrial site.',
  'Several brownfield sites have been ___ in the last decade.'),

('require',    'required',     'required',      'requerir / necesitar',         'regular', 1, 4, NULL,
  'The purchase ___ additional structural checks.',
  'Approval has been ___ from the local authority.'),

('increase',   'increased',    'increased',     'aumentar',                     'regular', 1, 4, NULL,
  'Demand for rental properties ___ sharply last year.',
  'The asking price has been ___ by 10% following the valuation.'),

('reduce',     'reduced',      'reduced',       'reducir',                      'regular', 1, 4, NULL,
  'The developer ___ the price after the survey revealed defects.',
  'Service charges have been ___ following a review.'),

('confirm',    'confirmed',    'confirmed',     'confirmar',                    'regular', 1, 4, NULL,
  'The solicitor ___ receipt of the signed contracts.',
  'The completion date has been ___ as 15th June.'),

('plan',       'planned',      'planned',       'planificar / proyectar',       'regular', 1, 4, NULL,
  'The council ___ a new transport link to the district.',
  'A major retail development has been ___ for the waterfront.'),

('agree',      'agreed',       'agreed',        'acordar / estar de acuerdo',   'regular', 1, 4, NULL,
  'Both parties ___ on a price of €475,000.',
  'The terms of the lease have been ___ in principle.'),

('apply',      'applied',      'applied',       'solicitar / aplicar',          'regular', 1, 4, NULL,
  'The developer ___ for planning permission in October.',
  'A restriction has been ___ to the title.'),

('estimate',   'estimated',    'estimated',     'estimar / presupuestar',       'regular', 2, 4, NULL,
  'The contractor ___ the renovation would take six months.',
  'The project cost has been ___ at €1.5M.'),

('include',    'included',     'included',      'incluir',                      'regular', 1, 4, NULL,
  'The sale price ___ all white goods and fitted furniture.',
  'Parking has been ___ in the lease agreement.'),

('review',     'reviewed',     'reviewed',      'revisar / analizar',           'regular', 1, 4, NULL,
  'The solicitor ___ the contract in full before advising.',
  'All clauses have been ___ and approved.'),

('receive',    'received',     'received',      'recibir',                      'regular', 1, 4, NULL,
  'The agency ___ over 50 enquiries in the first week.',
  'A formal offer has been ___ from the overseas investor.'),

('decide',     'decided',      'decided',       'decidir',                      'regular', 1, 4, NULL,
  'The board ___ to postpone the launch until spring.',
  'It has been ___ to proceed with the mixed-use development.'),

('discuss',    'discussed',    'discussed',     'discutir / debatir',           'regular', 1, 4, NULL,
  'The committee ___ the planning application last Thursday.',
  'The terms have been ___ at length by both legal teams.'),

('check',      'checked',      'checked',       'comprobar / verificar',        'regular', 1, 4, NULL,
  'The solicitor ___ the title for any charges or restrictions.',
  'All references have been ___ and approved.'),

('start',      'started',      'started',       'empezar / iniciar',            'regular', 1, 4, NULL,
  'The construction work ___ ahead of schedule.',
  'The marketing campaign has ___ to generate early interest.'),

('explain',    'explained',    'explained',     'explicar',                     'regular', 1, 4, NULL,
  'The agent ___ the conveyancing process in detail.',
  'The charges have been ___ clearly in the lease.'),

('close',      'closed',       'closed',        'cerrar / concluir',            'regular', 1, 5, NULL,
  'The agency ___ 30 transactions in Q4.',
  'The deal has been ___ and all funds transferred.')

ON CONFLICT DO NOTHING;
