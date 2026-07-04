-- Migration 015: Expand prepositions — full B1→C2 coverage
-- Adds ~85 new use cases to existing 42 entries (total ~127)

INSERT INTO lexestate_prepositions
  (preposition, use_case, use_case_es, example_en, example_es, category, category_es, level, sort_order)
VALUES

-- ═══════════════════════════════════════════════════
-- AT  (additional uses)
-- ═══════════════════════════════════════════════════
('AT', 'at the asking price — offered at the price the seller set',
 'at the asking price — al precio solicitado por el vendedor',
 'The property sold at the asking price within a week.',
 'La propiedad se vendió al precio solicitado en una semana.',
 'transaction','Transacción','B1',14),

('AT', 'at market value — priced at the current going rate',
 'at market value — al valor de mercado actual',
 'The valuation was carried out at market value.',
 'La tasación se realizó al valor de mercado.',
 'financial','Financiero','B1',15),

('AT', 'at the time of completion — at the moment the sale is finalised',
 'at the time of completion — en el momento en que se finaliza la compraventa',
 'The buyer takes possession at the time of completion.',
 'El comprador toma posesión en el momento de la escritura.',
 'time','Tiempo','B2',16),

('AT', 'at the developer''s risk — responsibility borne by the developer until handover',
 'at the developer''s risk — a riesgo y cuenta del promotor',
 'Works are carried out at the developer''s risk until practical completion.',
 'Las obras se realizan a riesgo del promotor hasta la terminación práctica.',
 'construction','Construcción','B2',17),

('AT', 'at the discretion of — subject to the judgment of a named party',
 'at the discretion of — a discreción de, según el criterio de',
 'Rent reviews are carried out at the discretion of the landlord.',
 'Las revisiones de la renta se realizan a discreción del arrendador.',
 'legal','Legal','C1',18),

('AT', 'at a premium — above a standard or reference price',
 'at a premium — con prima, por encima del precio de referencia',
 'The lease was assigned at a premium of £50,000.',
 'El arrendamiento fue cedido con una prima de 50.000 libras.',
 'financial','Financiero','B2',19),

-- ═══════════════════════════════════════════════════
-- IN  (additional uses)
-- ═══════════════════════════════════════════════════
('IN', 'in the lease — as written in the tenancy agreement',
 'in the lease — en el contrato de arrendamiento',
 'The break clause is set out in the lease.',
 'La cláusula de rescisión está recogida en el contrato de arrendamiento.',
 'legal','Legal','B1',25),

('IN', 'in the pipeline — in the process of being planned or built',
 'in the pipeline — en tramitación, en proceso de planificación',
 'Several new developments are currently in the pipeline.',
 'Varios nuevos proyectos están actualmente en proceso de planificación.',
 'construction','Construcción','B1',26),

('IN', 'in default — having failed to meet contractual obligations',
 'in default — en situación de incumplimiento, en mora',
 'The borrower is in default on the mortgage repayments.',
 'El prestatario está en mora con los pagos hipotecarios.',
 'financial','Financiero','B2',27),

('IN', 'in breach of — having broken a contractual term',
 'in breach of — en incumplimiento de, contraviniendo',
 'The tenant is in breach of the lease by subletting without consent.',
 'El inquilino incumple el contrato al subarrendar sin consentimiento.',
 'legal','Legal','B2',28),

('IN', 'in escrow — held by a neutral third party until conditions are met',
 'in escrow — en depósito de garantía, en custodia de tercero',
 'The deposit is held in escrow pending exchange of contracts.',
 'La señal queda en depósito de garantía hasta el intercambio de contratos.',
 'financial','Financiero','B2',29),

('IN', 'in joint tenancy — co-ownership where each party holds an equal share',
 'in joint tenancy — en cotitularidad con derecho de acrecer',
 'The property is held in joint tenancy by the married couple.',
 'La propiedad está en cotitularidad de los cónyuges.',
 'possession','Posesión','B2',210),

('IN', 'in trust — held by one party on behalf of another as beneficiary',
 'in trust — en fideicomiso, en administración fiduciaria',
 'The property is held in trust for the beneficiaries of the estate.',
 'La propiedad está en fideicomiso en beneficio de los herederos.',
 'legal','Legal','B2',211),

('IN', 'in respect of — concerning, in relation to (formal)',
 'in respect of — en lo que respecta a, en concepto de',
 'A service charge is payable in respect of communal areas.',
 'Se paga un gasto de comunidad en concepto de las zonas comunes.',
 'financial','Financiero','C1',212),

('IN', 'in connection with — relating to or associated with',
 'in connection with — en relación con, en el contexto de',
 'All costs incurred in connection with the sale are payable by the buyer.',
 'Todos los costes derivados en relación con la venta corren a cargo del comprador.',
 'legal','Legal','C1',213),

('IN', 'in the name of — registered as belonging to a specified person',
 'in the name of — a nombre de, registrado a nombre de',
 'The title is registered in the name of the purchaser.',
 'El título está registrado a nombre del comprador.',
 'legal','Legal','C1',214),

('IN', 'in favour of — for the benefit of; creating a right for another party',
 'in favour of — a favor de',
 'A restrictive covenant was registered in favour of the neighbouring landowner.',
 'Se registró un pacto restrictivo a favor del propietario colindante.',
 'legal','Legal','C1',215),

('IN', 'in relation to — with reference to; regarding',
 'in relation to — en relación con, respecto a',
 'Legal advice was sought in relation to the boundary dispute.',
 'Se solicitó asesoramiento legal en relación con el litigio de linderos.',
 'legal','Legal','C1',216),

('IN', 'in default of — if there is a failure to comply with an obligation',
 'in default of — en caso de incumplimiento de, a falta de',
 'In default of payment, the landlord may forfeit the lease.',
 'En caso de impago, el arrendador puede resolver el arrendamiento.',
 'legal','Legal','C2',217),

-- ═══════════════════════════════════════════════════
-- ON  (additional uses)
-- ═══════════════════════════════════════════════════
('ON', 'on a freehold basis — absolute ownership of land and building',
 'on a freehold basis — en régimen de pleno dominio',
 'The property is available for purchase on a freehold basis.',
 'La propiedad está disponible para su adquisición en pleno dominio.',
 'possession','Posesión','B1',34),

('ON', 'on a leasehold basis — ownership for a fixed term under a lease',
 'on a leasehold basis — en régimen de arrendamiento a plazo fijo',
 'The flat is sold on a leasehold basis with 99 years remaining.',
 'El piso se vende en régimen de arrendamiento con 99 años restantes.',
 'possession','Posesión','B1',35),

('ON', 'on the outskirts of — on the edge of a town or city',
 'on the outskirts of — en las afueras de, en los alrededores de',
 'The industrial unit is on the outskirts of the city.',
 'La nave industrial está en las afueras de la ciudad.',
 'location','Ubicación','B1',36),

('ON', 'on the first floor — one level above street level (UK)',
 'on the first floor — en el primer piso / en la primera planta',
 'The office suite is situated on the first floor.',
 'La suite de oficinas está situada en el primer piso.',
 'location','Ubicación','B1',37),

('ON', 'on the open market — available to any buyer through normal channels',
 'on the open market — en el mercado libre / en el mercado abierto',
 'The portfolio was valued on the open market basis.',
 'La cartera se valoró en base al mercado abierto.',
 'market','Mercado','B1',38),

('ON', 'on a break clause — exercising a right to terminate the lease early',
 'on a break clause — mediante cláusula de rescisión anticipada',
 'The tenant gave notice on a break clause to vacate the premises.',
 'El inquilino notificó la rescisión anticipada para desalojar el local.',
 'legal','Legal','B2',39),

('ON', 'on service charge — subject to payment of communal maintenance costs',
 'on service charge — con cargo de gastos de comunidad',
 'The unit is let on service charge of £5,000 per annum.',
 'La unidad se arrienda con gastos de comunidad de 5.000 libras anuales.',
 'financial','Financiero','B2',220),

('ON', 'on a rack rent — let at full open-market rent with no premium',
 'on a rack rent — en arrendamiento a renta de mercado plena (sin prima)',
 'The shop is let on a rack rent without any premium.',
 'La tienda está arrendada a renta de mercado plena sin ninguna prima.',
 'financial','Financiero','B2',221),

('ON', 'on the upper floor — located above ground or first floor level',
 'on the upper floor — en las plantas superiores',
 'Residential flats are situated on the upper floors.',
 'Los pisos residenciales se encuentran en las plantas superiores.',
 'location','Ubicación','B1',222),

-- ═══════════════════════════════════════════════════
-- FOR  (additional uses)
-- ═══════════════════════════════════════════════════
('FOR', 'for rent — available to be rented',
 'for rent — en alquiler',
 'The flat is advertised for rent at £1,500 per month.',
 'El piso está anunciado en alquiler por 1.500 libras al mes.',
 'market','Mercado','B1',43),

('FOR', 'for investment — acquired to generate income or capital gain',
 'for investment — para inversión / con fines de inversión',
 'This commercial property is available for investment purposes.',
 'Este inmueble comercial está disponible para inversión.',
 'market','Mercado','B1',44),

('FOR', 'for residential use — approved or intended for people to live in',
 'for residential use — para uso residencial / de uso habitacional',
 'Planning permission was granted for residential use.',
 'Se concedió licencia urbanística para uso residencial.',
 'legal','Legal','B1',45),

('FOR', 'for commercial use — approved or intended for business activity',
 'for commercial use — para uso comercial',
 'The ground floor has been converted for commercial use.',
 'La planta baja ha sido reconvertida para uso comercial.',
 'legal','Legal','B1',46),

('FOR', 'for refurbishment — requiring or intended for renovation work',
 'for refurbishment — para rehabilitación / para reforma',
 'The property is sold for refurbishment at a discounted price.',
 'La propiedad se vende para rehabilitación a precio reducido.',
 'market','Mercado','B2',47),

('FOR', 'for the duration of — throughout the entire period covered',
 'for the duration of — durante toda la vigencia de, por el período de',
 'The tenant is responsible for maintenance for the duration of the lease.',
 'El inquilino es responsable del mantenimiento durante toda la vigencia del arrendamiento.',
 'legal','Legal','B2',48),

('FOR', 'for occupation — available to be used or lived in immediately',
 'for occupation — para ocupación, disponible para uso inmediato',
 'The property is ready for occupation from the first of next month.',
 'La propiedad está lista para su ocupación a partir del primero del próximo mes.',
 'market','Mercado','B2',49),

('FOR', 'for the purpose of — with the stated aim or legal intention',
 'for the purpose of — a efectos de, con el fin de',
 'For the purpose of the Landlord and Tenant Act, these are business premises.',
 'A efectos de la Ley de Arrendamientos, estos locales constituyen un arrendamiento comercial.',
 'legal','Legal','C2',223),

-- ═══════════════════════════════════════════════════
-- BY  (additional uses)
-- ═══════════════════════════════════════════════════
('BY', 'by mutual agreement — by the consent of all parties involved',
 'by mutual agreement — de mutuo acuerdo',
 'The lease was surrendered by mutual agreement.',
 'El arrendamiento fue rescindido de mutuo acuerdo.',
 'legal','Legal','B2',54),

('BY', 'by negotiation — through direct discussion between parties',
 'by negotiation — por negociación / mediante negociación directa',
 'The final price was settled by negotiation.',
 'El precio final se estableció por negociación.',
 'transaction','Transacción','B2',55),

('BY', 'by prior appointment — only accessible with advance scheduling',
 'by prior appointment — previa cita / mediante cita previa',
 'Viewings are strictly by prior appointment only.',
 'Las visitas se realizan estrictamente mediante cita previa.',
 'transaction','Transacción','B1',56),

('BY', 'by way of — as a form of; used as a method for',
 'by way of — a modo de, en forma de, mediante',
 'The property was transferred by way of assignment of the lease.',
 'La propiedad fue transferida mediante la cesión del arrendamiento.',
 'legal','Legal','C1',57),

('BY', 'by order of — acting under the authority or instruction of',
 'by order of — por orden de, por mandato de',
 'The property is to be sold by order of the court.',
 'La propiedad será vendida por orden judicial.',
 'legal','Legal','C1',58),

('BY', 'by virtue of — because of a legal right or power',
 'by virtue of — en virtud de, al amparo de',
 'By virtue of the Act, the tenant has the right to purchase the freehold.',
 'En virtud de la ley, el inquilino tiene derecho a adquirir el pleno dominio.',
 'legal','Legal','C2',59),

('BY', 'by reason of — because of; on account of',
 'by reason of — por razón de, como consecuencia de',
 'The lease may be terminated by reason of persistent breach.',
 'El arrendamiento puede rescindirse por razón de incumplimiento reiterado.',
 'legal','Legal','C2',224),

-- ═══════════════════════════════════════════════════
-- UNDER  (additional uses)
-- ═══════════════════════════════════════════════════
('UNDER', 'under management — professionally managed by an agent or company',
 'under management — bajo gestión profesional',
 'The portfolio is under management by a chartered surveyor.',
 'La cartera está bajo gestión de un tasador oficial.',
 'market','Mercado','B2',64),

('UNDER', 'under the lease — as specified or governed by the tenancy agreement',
 'under the lease — conforme al arrendamiento / según el contrato',
 'The repairing obligations under the lease fall on the tenant.',
 'Las obligaciones de reparación según el arrendamiento corresponden al inquilino.',
 'legal','Legal','B2',65),

('UNDER', 'under notice — formally notified of termination or required change',
 'under notice — en período de preaviso / bajo notificación formal',
 'The tenant is under notice with a six-month break clause.',
 'El inquilino está en período de preaviso con una cláusula de rescisión de seis meses.',
 'legal','Legal','B2',66),

('UNDER', 'under planning — awaiting or subject to a planning decision',
 'under planning — pendiente de licencia urbanística',
 'The site is under planning for a mixed-use development.',
 'El solar está pendiente de licencia para un desarrollo de uso mixto.',
 'legal','Legal','B2',67),

('UNDER', 'under the mortgage — subject to or secured by a mortgage charge',
 'under the mortgage — bajo la hipoteca / sujeto a la carga hipotecaria',
 'The property remains under the mortgage until the loan is repaid.',
 'La propiedad permanece sujeta a la hipoteca hasta que se reembolse el préstamo.',
 'financial','Financiero','B2',225),

-- ═══════════════════════════════════════════════════
-- WITH  (additional uses)
-- ═══════════════════════════════════════════════════
('WITH', 'with development potential — having capacity for future building',
 'with development potential — con potencial de desarrollo inmobiliario',
 'A detached house for sale with development potential.',
 'Casa independiente en venta con potencial de desarrollo.',
 'market','Mercado','B2',75),

('WITH', 'with ground rent — subject to an annual payment to the freeholder',
 'with ground rent — con renta de suelo anual al propietario absoluto',
 'The flat is sold with ground rent of £200 per year.',
 'El piso se vende con renta de suelo de 200 libras anuales.',
 'financial','Financiero','B2',76),

('WITH', 'with service charge — subject to payment of communal maintenance costs',
 'with service charge — con gastos de comunidad',
 'The lease comes with service charge covering maintenance and insurance.',
 'El arrendamiento incluye gastos de comunidad que cubren mantenimiento y seguro.',
 'financial','Financiero','B2',77),

('WITH', 'with all services connected — utilities already installed and operational',
 'with all services connected — con todos los suministros conectados',
 'The plot is sold with all services connected.',
 'El solar se vende con todos los suministros conectados.',
 'construction','Construcción','B2',78),

('WITH', 'with permitted development rights — allowing works without full planning consent',
 'with permitted development rights — con derechos de obra menor (PDR)',
 'The property is sold with permitted development rights intact.',
 'La propiedad se vende con los derechos de desarrollo autorizado intactos.',
 'legal','Legal','C1',79),

('WITH', 'with outline planning permission — approved in principle for development',
 'with outline planning permission — con licencia urbanística de principio',
 'The land is sold with outline planning permission for 15 dwellings.',
 'El terreno se vende con licencia urbanística de principio para 15 viviendas.',
 'legal','Legal','C1',226),

('WITH', 'with effect from — becoming operative from a specific date',
 'with effect from — con efectos a partir de / con vigencia desde',
 'The new rent is payable with effect from the 1st of January.',
 'La nueva renta se abona con efectos a partir del 1 de enero.',
 'time','Tiempo','C1',227),

-- ═══════════════════════════════════════════════════
-- BETWEEN  (new preposition)
-- ═══════════════════════════════════════════════════
('BETWEEN', 'between the parties — involving or agreed by both/all contracting parties',
 'between the parties — entre las partes contratantes',
 'The agreement between the parties was signed on 3rd March.',
 'El acuerdo entre las partes se firmó el 3 de marzo.',
 'legal','Legal','B2',110),

('BETWEEN', 'between exchange and completion — the period after signing contracts and before final transfer',
 'between exchange and completion — entre el intercambio de contratos y la escritura',
 'The buyer may carry out inspections between exchange and completion.',
 'El comprador puede realizar inspecciones entre el intercambio de contratos y la escritura.',
 'time','Tiempo','B2',111),

-- ═══════════════════════════════════════════════════
-- OVER  (new preposition)
-- ═══════════════════════════════════════════════════
('OVER', 'over the asking price — above the price originally set by the seller',
 'over the asking price — por encima del precio solicitado',
 'The property sold for 10% over the asking price.',
 'La propiedad se vendió por un 10% por encima del precio solicitado.',
 'transaction','Transacción','B1',112),

('OVER', 'over the property — as a charge, right or legal interest affecting the land',
 'over the property — sobre la propiedad / con carga sobre el inmueble',
 'The bank holds a first charge over the property.',
 'El banco tiene una carga preferente sobre la propiedad.',
 'financial','Financiero','B2',113),

-- ═══════════════════════════════════════════════════
-- ABOVE / BELOW  (new)
-- ═══════════════════════════════════════════════════
('ABOVE', 'above market value — priced or sold for more than the current market rate',
 'above market value — por encima del valor de mercado',
 'The property was purchased above market value.',
 'La propiedad fue adquirida por encima del valor de mercado.',
 'financial','Financiero','B1',114),

('BELOW', 'below market value — priced or sold for less than the current market rate',
 'below market value — por debajo del valor de mercado',
 'The distressed sale was agreed at below market value.',
 'La venta forzosa se acordó por debajo del valor de mercado.',
 'financial','Financiero','B1',115),

('BELOW', 'below asking price — at a price lower than the seller originally requested',
 'below asking price — por debajo del precio solicitado por el vendedor',
 'An offer was accepted below asking price due to structural issues.',
 'Se aceptó una oferta por debajo del precio solicitado por problemas estructurales.',
 'transaction','Transacción','B1',116),

-- ═══════════════════════════════════════════════════
-- FROM  (new)
-- ═══════════════════════════════════════════════════
('FROM', 'from the completion date — starting from when the sale is legally finalised',
 'from the completion date — a partir de la fecha de escritura',
 'Rent is payable from the completion date.',
 'La renta es exigible a partir de la fecha de escritura.',
 'time','Tiempo','B2',117),

('FROM', 'from the date of exchange — starting from when contracts are formally signed',
 'from the date of exchange — a partir de la fecha del intercambio de contratos',
 'The deposit is at the buyer''s risk from the date of exchange.',
 'La señal está a riesgo del comprador a partir de la fecha del intercambio de contratos.',
 'time','Tiempo','B2',118),

-- ═══════════════════════════════════════════════════
-- AGAINST  (new)
-- ═══════════════════════════════════════════════════
('AGAINST', 'against the property — secured on or chargeable to the land or building',
 'against the property — con cargo sobre el inmueble / garantizado sobre la propiedad',
 'A charging order was registered against the property.',
 'Se registró una orden de embargo con cargo sobre el inmueble.',
 'financial','Financiero','B2',119),

-- ═══════════════════════════════════════════════════
-- THROUGH  (new)
-- ═══════════════════════════════════════════════════
('THROUGH', 'through an agent — sold or rented using an estate agent''s services',
 'through an agent — a través de un agente inmobiliario',
 'The property was sold through a local estate agent.',
 'La propiedad fue vendida a través de una agencia inmobiliaria local.',
 'transaction','Transacción','B1',120),

('THROUGH', 'through the courts — by means of formal legal proceedings',
 'through the courts — por vía judicial / mediante procedimiento judicial',
 'The landlord recovered possession through the courts.',
 'El arrendador recuperó la posesión por vía judicial.',
 'legal','Legal','C1',121),

-- ═══════════════════════════════════════════════════
-- OF  (specific real estate phrase)
-- ═══════════════════════════════════════════════════
('OF', 'time is of the essence — deadlines must be strictly observed',
 'time is of the essence — el plazo es esencial / los plazos son vinculantes',
 'Completion is time of the essence; failure to complete will result in penalties.',
 'La fecha de escritura es esencial; el incumplimiento acarreará penalizaciones.',
 'legal','Legal','C1',122),

-- ═══════════════════════════════════════════════════
-- TO  (new)
-- ═══════════════════════════════════════════════════
('TO', 'to completion — up to and including the point of final legal transfer',
 'to completion — hasta la escritura / hasta la formalización de la compraventa',
 'The solicitor manages the transaction from offer to completion.',
 'El abogado gestiona la operación desde la oferta hasta la escritura.',
 'transaction','Transacción','B1',123),

('TO', 'to the landlord — addressed or payable to the property owner',
 'to the landlord — al arrendador / al propietario',
 'All rent payments must be made directly to the landlord.',
 'Todos los pagos de la renta deben realizarse directamente al arrendador.',
 'legal','Legal','B1',228),

-- ═══════════════════════════════════════════════════
-- UPON  (new)
-- ═══════════════════════════════════════════════════
('UPON', 'upon exchange — at the exact moment contracts are signed and exchanged',
 'upon exchange — en el momento del intercambio de contratos',
 'The deposit of 10% is payable upon exchange of contracts.',
 'La señal del 10% es pagadera en el momento del intercambio de contratos.',
 'time','Tiempo','B2',137),

('UPON', 'upon completion — at the moment the sale is legally finalised',
 'upon completion — en el momento de la escritura / a la entrega',
 'The balance of the purchase price is due upon completion.',
 'El resto del precio de compra es exigible en el momento de la escritura.',
 'time','Tiempo','B2',138),

-- ═══════════════════════════════════════════════════
-- WITHIN  (new)
-- ═══════════════════════════════════════════════════
('WITHIN', 'within the boundary — inside the legal limits of the property or site',
 'within the boundary — dentro de los linderos de la propiedad',
 'The outbuilding is within the boundary of the site.',
 'La edificación auxiliar está dentro de los linderos del solar.',
 'location','Ubicación','B2',132),

('WITHIN', 'within the lease term — during the period covered by the lease',
 'within the lease term — dentro del período de arrendamiento',
 'Major repairs must be completed within the lease term.',
 'Las reparaciones importantes deben completarse dentro del período de arrendamiento.',
 'time','Tiempo','B2',133),

('WITHIN', 'within walking distance — close enough to reach on foot',
 'within walking distance — a distancia caminando / a pie',
 'The property is within walking distance of the train station.',
 'La propiedad está a distancia caminando de la estación de tren.',
 'location','Ubicación','B1',229),

-- ═══════════════════════════════════════════════════
-- ADJACENT TO  (new)
-- ═══════════════════════════════════════════════════
('ADJACENT TO', 'adjacent to — directly next to; sharing a boundary with',
 'adjacent to — adyacente a, colindante con',
 'The plot is adjacent to the main road and benefits from good visibility.',
 'El solar es colindante con la carretera principal y goza de buena visibilidad.',
 'location','Ubicación','B2',129),

-- ═══════════════════════════════════════════════════
-- IN FRONT OF  (new)
-- ═══════════════════════════════════════════════════
('IN FRONT OF', 'in front of — directly facing; at the front of',
 'in front of — frente a, delante de',
 'There is a car park in front of the property.',
 'Hay un aparcamiento frente a la propiedad.',
 'location','Ubicación','B1',130),

-- ═══════════════════════════════════════════════════
-- AT THE REAR OF  (new)
-- ═══════════════════════════════════════════════════
('AT THE REAR OF', 'at the rear of — at the back of the building or plot',
 'at the rear of — en la parte trasera de, en la parte posterior de',
 'There is a private garden at the rear of the property.',
 'Hay un jardín privado en la parte trasera de la propiedad.',
 'location','Ubicación','B1',131),

-- ═══════════════════════════════════════════════════
-- IN EXCESS OF  (new)
-- ═══════════════════════════════════════════════════
('IN EXCESS OF', 'in excess of — more than; greater than a stated amount',
 'in excess of — en exceso de, por encima de',
 'Offers in excess of £500,000 will be considered.',
 'Se considerarán ofertas en exceso de 500.000 libras.',
 'transaction','Transacción','B2',125),

-- ═══════════════════════════════════════════════════
-- AT THE EXPENSE OF  (new)
-- ═══════════════════════════════════════════════════
('AT THE EXPENSE OF', 'at the expense of — to be paid for by a specified party',
 'at the expense of — a cargo de, a expensas de',
 'Reinstatement works shall be carried out at the tenant''s expense.',
 'Las obras de reposición se realizarán a cargo del arrendatario.',
 'legal','Legal','C1',127),

-- ═══════════════════════════════════════════════════
-- ON ACCOUNT OF  (new)
-- ═══════════════════════════════════════════════════
('ON ACCOUNT OF', 'on account of — as a partial payment towards a larger sum',
 'on account of — a cuenta de, como anticipo de',
 'A payment of £10,000 was made on account of the purchase price.',
 'Se realizó un pago de 10.000 libras a cuenta del precio de compra.',
 'financial','Financiero','C1',136),

-- ═══════════════════════════════════════════════════
-- AS A RESULT OF  (new)
-- ═══════════════════════════════════════════════════
('AS A RESULT OF', 'as a result of — because of; following from an event or finding',
 'as a result of — como consecuencia de, a raíz de',
 'As a result of the survey, the buyer renegotiated the purchase price.',
 'Como consecuencia del informe pericial, el comprador renegoció el precio de compra.',
 'transaction','Transacción','C1',135),

-- ═══════════════════════════════════════════════════
-- AHEAD OF  (new)
-- ═══════════════════════════════════════════════════
('AHEAD OF', 'ahead of completion — before the legal transfer takes place',
 'ahead of completion — antes de la escritura, con antelación a la escritura',
 'All searches must be completed ahead of completion.',
 'Todas las búsquedas registrales deben completarse antes de la escritura.',
 'time','Tiempo','B2',139),

-- ═══════════════════════════════════════════════════
-- AS A CONDITION OF  (new)
-- ═══════════════════════════════════════════════════
('AS A CONDITION OF', 'as a condition of — as a requirement that must be satisfied',
 'as a condition of — como condición de, como requisito de',
 'A full structural survey was required as a condition of the mortgage offer.',
 'Se exigió un informe estructural completo como condición de la oferta hipotecaria.',
 'financial','Financiero','C1',140),

-- ═══════════════════════════════════════════════════
-- CONTINGENT UPON  (new)
-- ═══════════════════════════════════════════════════
('CONTINGENT UPON', 'contingent upon — dependent on a specific event or condition occurring',
 'contingent upon — condicionado a, supeditado a',
 'The sale is contingent upon the buyer obtaining mortgage finance.',
 'La venta está condicionada a que el comprador obtenga financiación hipotecaria.',
 'transaction','Transacción','C1',141),

-- ═══════════════════════════════════════════════════
-- WITHOUT PREJUDICE TO  (new)
-- ═══════════════════════════════════════════════════
('WITHOUT PREJUDICE TO', 'without prejudice to — without affecting or limiting any existing rights',
 'without prejudice to — sin perjuicio de',
 'Without prejudice to the tenant''s other rights, the landlord must give written notice.',
 'Sin perjuicio de los demás derechos del arrendatario, el arrendador debe notificar por escrito.',
 'legal','Legal','C2',124),

-- ═══════════════════════════════════════════════════
-- BY CONSENT OF  (new)
-- ═══════════════════════════════════════════════════
('BY CONSENT OF', 'by consent of — with the formal approval or agreement of',
 'by consent of — con el consentimiento de, con la aprobación de',
 'Subletting is permitted only by consent of the freeholder.',
 'El subarriendo solo está permitido con el consentimiento del propietario absoluto.',
 'legal','Legal','C1',230),

-- ═══════════════════════════════════════════════════
-- TO THE EXTENT OF  (new)
-- ═══════════════════════════════════════════════════
('TO THE EXTENT OF', 'to the extent of — up to and including a specified limit or amount',
 'to the extent of — hasta el límite de, en la medida de',
 'The bank''s charge is secured to the extent of £300,000.',
 'La carga bancaria está garantizada hasta el límite de 300.000 libras.',
 'financial','Financiero','C2',231),

-- ═══════════════════════════════════════════════════
-- IN THE COURSE OF  (new)
-- ═══════════════════════════════════════════════════
('IN THE COURSE OF', 'in the course of — during the process of; while something is happening',
 'in the course of — en el transcurso de, durante el proceso de',
 'Defects discovered in the course of the survey must be disclosed.',
 'Los defectos descubiertos en el transcurso del informe pericial deben comunicarse.',
 'legal','Legal','C1',232),

-- ═══════════════════════════════════════════════════
-- WITH REGARD TO  (new)
-- ═══════════════════════════════════════════════════
('WITH REGARD TO', 'with regard to — concerning; in respect of (formal)',
 'with regard to — en lo que respecta a, con respecto a',
 'With regard to the service charge, the tenant will be notified annually.',
 'Con respecto a los gastos de comunidad, el arrendatario recibirá notificación anual.',
 'legal','Legal','C1',233)

ON CONFLICT DO NOTHING;
