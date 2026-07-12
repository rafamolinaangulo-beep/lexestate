-- Migration 021: activa RLS en 6 tablas de LexEstate que se quedaron sin él
-- (creadas en 011/012/014/015 sin el ALTER TABLE ... ENABLE ROW LEVEL SECURITY correspondiente).
-- La clave anon viaja al navegador (la usa el login de Admin/blog), así que cualquiera
-- podría haberla usado para leer/escribir estas tablas directamente contra la API de Supabase.

-- Contenido de estudio (gramática y phrasal verbs): igual que lexestate_terms/lexestate_verbs,
-- lectura pública, sin política de escritura (solo la clave de servicio puede escribir).
ALTER TABLE public.lexestate_grammar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexestate_grammar_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexestate_phrasal_verbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexestate_phrasal_verb_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lex_grammar_public_read" ON public.lexestate_grammar FOR SELECT USING (true);
CREATE POLICY "lex_grammar_exercises_public_read" ON public.lexestate_grammar_exercises FOR SELECT USING (true);
CREATE POLICY "lex_phrasal_verbs_public_read" ON public.lexestate_phrasal_verbs FOR SELECT USING (true);
CREATE POLICY "lex_phrasal_verb_exercises_public_read" ON public.lexestate_phrasal_verb_exercises FOR SELECT USING (true);

-- Datos de usuario (progreso y sesiones de conexión, incluyen el email): RLS activado
-- SIN ninguna política para anon/authenticated, así que esos roles no ven ni escriben
-- ninguna fila. service_role (usado por api.php/server.js) no se ve afectado por RLS,
-- así que la app sigue funcionando exactamente igual.
ALTER TABLE public.lexestate_phrasal_verb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexestate_usage_sessions ENABLE ROW LEVEL SECURITY;
