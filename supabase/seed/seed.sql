-- ─────────────────────────────────────────────────────────────────────────────
-- Trainly — Seed Data
-- Realistic test data for Lisbon-based MVP testing
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- BADGES
-- ─────────────────────────────────────────────

INSERT INTO badges (name, name_en, description, description_en, icon, category, criteria) VALUES
('Primeira Sessão', 'First Session', 'Participaste na tua primeira sessão!', 'You attended your first session!', '🏅', 'milestone', '{"sessions_attended": 1}'),
('5 Sessões', '5 Sessions', 'Participaste em 5 sessões!', 'You attended 5 sessions!', '🥉', 'milestone', '{"sessions_attended": 5}'),
('10 Sessões', '10 Sessions', 'Participaste em 10 sessões!', 'You attended 10 sessions!', '🥈', 'milestone', '{"sessions_attended": 10}'),
('25 Sessões', '25 Sessions', 'Um verdadeiro atleta!', 'A true athlete!', '🥇', 'milestone', '{"sessions_attended": 25}'),
('Sequência 7 Dias', '7-Day Streak', 'Ativo durante 7 dias consecutivos', 'Active for 7 consecutive days', '🔥', 'streak', '{"streak_days": 7}'),
('Sequência 30 Dias', '30-Day Streak', '30 dias consecutivos de movimento!', '30 consecutive days of movement!', '⚡', 'streak', '{"streak_days": 30}'),
('Explorador', 'Explorer', 'Experimenta 5 categorias diferentes', 'Try 5 different categories', '🗺️', 'variety', '{"categories_tried": 5}'),
('Líder Social', 'Social Leader', 'Cria o teu primeiro grupo social', 'Create your first social group', '👥', 'social', '{"groups_created": 1}'),
('Revisor', 'Reviewer', 'Escreve a tua primeira avaliação', 'Write your first review', '⭐', 'engagement', '{"reviews_written": 1}'),
('Madrugador', 'Early Bird', 'Participa em sessão antes das 8h', 'Attend a session before 8am', '🌅', 'special', '{"morning_sessions": 1}'),
('Treinador Verificado', 'Verified Trainer', 'Treinador verificado pela Trainly', 'Verified trainer by Trainly', '✅', 'trainer', '{"trainer_verified": true}'),
('Consistente', 'Consistent', 'Conduz sessões durante 4 semanas consecutivas', 'Led sessions for 4 consecutive weeks', '📅', 'trainer', '{"consecutive_weeks": 4}'),
('Top Avaliado', 'Top Rated', 'Média de 4.8+ com 10+ avaliações', 'Average 4.8+ with 10+ reviews', '🌟', 'trainer', '{"avg_rating": 4.8, "min_reviews": 10}'),
('Senior Friendly', 'Senior Friendly', 'Especializado em treinos para seniores', 'Specialized in senior-friendly training', '💙', 'specialty', '{"is_senior_friendly": true}');

-- ─────────────────────────────────────────────
-- CURATED LOCATIONS — LISBON
-- ─────────────────────────────────────────────

INSERT INTO curated_locations (name, name_en, description, description_en, type, lat, lng, address, tags, is_senior_friendly) VALUES
('Parque Eduardo VII', 'Eduardo VII Park', 'Grande parque central com espaços amplos para treino ao ar livre', 'Large central park with ample outdoor training spaces', 'park', 38.7263, -9.1526, 'Parque Eduardo VII, Lisboa', ARRAY['parque', 'central', 'running', 'yoga', 'treino grupal'], TRUE),
('Parque das Nações', 'Park of Nations', 'Zona moderna com percursos de corrida e ciclovias ao longo do Tejo', 'Modern area with running paths and bike lanes along the Tagus', 'running_route', 38.7652, -9.0927, 'Parque das Nações, Lisboa', ARRAY['corrida', 'bicicleta', 'rio', 'moderno'], FALSE),
('Ribeira das Naus', 'Ribeira das Naus', 'Frente ribeirinha com espaço aberto para treino', 'Riverside promenade with open space for training', 'riverfront', 38.7071, -9.1403, 'Ribeira das Naus, Lisboa', ARRAY['ribeirinha', 'sunset', 'treino grupal', 'running'], FALSE),
('Monsanto Florestal', 'Monsanto Forest Park', 'O pulmão verde de Lisboa com trilhos naturais', 'The green lung of Lisbon with natural trails', 'park', 38.7258, -9.2002, 'Parque Florestal de Monsanto, Lisboa', ARRAY['floresta', 'trilhos', 'trail running', 'natureza'], FALSE),
('Calçada da Ajuda — Jardim Botânico', 'Ajuda Botanical Garden', 'Jardim histórico com zonas tranquilas para yoga e mobilidade', 'Historic garden with calm spaces for yoga and mobility', 'senior_friendly_zone', 38.7052, -9.1805, 'Calçada da Ajuda, Lisboa', ARRAY['yoga', 'mobilidade', 'tranquilo', 'seniores'], TRUE),
('Parque da Bela Vista', 'Bela Vista Park', 'Parque de bairro com amplas zonas abertas e sombra', 'Neighborhood park with large open areas and shade', 'group_friendly_space', 38.7507, -9.1319, 'Parque da Bela Vista, Lisboa', ARRAY['bairro', 'sombra', 'grupal', 'familiar'], TRUE),
('Passeio Marítimo de Algés', 'Algés Maritime Promenade', 'Percurso costeiro junto ao Tejo com vista para o estuário', 'Coastal path along the Tagus with estuary views', 'running_route', 38.6977, -9.2199, 'Passeio Marítimo de Algés', ARRAY['corrida', 'costa', 'rio', 'ciclismo'], FALSE),
('Campo Grande', 'Campo Grande', 'Parque universitário com zonas de exercício e percursos', 'University park with exercise areas and paths', 'outdoor_gym', 38.7606, -9.1538, 'Campo Grande, Lisboa', ARRAY['exercicio', 'estudantes', 'familiar', 'desportivo'], TRUE),
('Doca de Belém', 'Belém Dock', 'Zona histórica junto ao rio com espaço para treino e vista única', 'Historic area by the river with training space and unique views', 'riverfront', 38.6967, -9.2102, 'Doca de Belém, Lisboa', ARRAY['histórico', 'rio', 'belém', 'turístico'], FALSE),
('Pátio Alfacinha — Intendente', 'Alfacinha Courtyard', 'Espaço urbano revitalizado ideal para calistenia', 'Revitalized urban space ideal for calisthenics', 'outdoor_gym', 38.7211, -9.1337, 'Intendente, Lisboa', ARRAY['calistenia', 'urbano', 'street workout'], FALSE);

-- ─────────────────────────────────────────────
-- DEV/TEST AUTH USERS
-- These are created via Supabase Auth API in seed script
-- Passwords all: Trainly2024!
-- ─────────────────────────────────────────────

-- Note: In local dev, create these users via:
-- supabase auth admin create-user --email dev.user@trainly.app --password Trainly2024!
-- OR use the dev bypass mode in the mobile app

-- We seed the profile records referencing known UUIDs for dev
-- These UUIDs must match the auth.users records created separately

-- Dev user UUIDs (used in dev mode only)
-- user_free:    00000000-0000-0000-0000-000000000001
-- user_plus:    00000000-0000-0000-0000-000000000002
-- trainer:      00000000-0000-0000-0000-000000000003
-- coach_pro:    00000000-0000-0000-0000-000000000004
-- trainer_pend: 00000000-0000-0000-0000-000000000005
-- admin:        00000000-0000-0000-0000-000000000006

-- Sessions seeded for trainer_id referencing profile UUID for trainer dev user
-- These will be inserted once the profiles are created via auth

-- ─────────────────────────────────────────────
-- DEV SESSIONS (inserted after profiles exist)
-- Called from: apps/mobile/src/lib/devSeed.ts
-- ─────────────────────────────────────────────

-- This function seeds realistic session data for the dev trainer profile
CREATE OR REPLACE FUNCTION seed_dev_sessions(trainer_profile_id UUID)
RETURNS VOID AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO sessions (
    trainer_id, type, title, category, description, body_areas,
    intensity, skill_level, is_senior_friendly, date, start_time, end_time,
    location_name, location_address, location_lat, location_lng,
    min_participants, max_participants, price, currency, status
  ) VALUES
  (
    trainer_profile_id, 'trainer_led', 'HIIT ao Amanhecer no Parque Eduardo VII',
    'hiit', 'Sessão intensa de HIIT em circuito ao ar livre. Trabalharemos cardio e força funcional.',
    ARRAY['cardio', 'legs', 'core']::body_area[], 'high', 'intermediate', FALSE,
    today + 1, '07:00', '08:00',
    'Parque Eduardo VII', 'Parque Eduardo VII, Lisboa', 38.7263, -9.1526,
    4, 12, 15.00, 'eur', 'published'
  ),
  (
    trainer_profile_id, 'trainer_led', 'Yoga Flow ao Pôr do Sol',
    'yoga', 'Yoga flow relaxante para terminar o dia. Adequado para todos os níveis.',
    ARRAY['mobility', 'core', 'back']::body_area[], 'low', 'all_levels', TRUE,
    today + 2, '18:30', '19:45',
    'Parque da Bela Vista', 'Parque da Bela Vista, Lisboa', 38.7507, -9.1319,
    3, 10, 12.00, 'eur', 'published'
  ),
  (
    trainer_profile_id, 'trainer_led', 'Calistenia — Nível Iniciante',
    'calisthenics', 'Aprende os movimentos fundamentais da calistenia com supervisão especializada.',
    ARRAY['arms', 'chest', 'core']::body_area[], 'moderate', 'beginner', FALSE,
    today + 3, '10:00', '11:00',
    'Campo Grande', 'Campo Grande, Lisboa', 38.7606, -9.1538,
    2, 8, 18.00, 'eur', 'published'
  ),
  (
    trainer_profile_id, 'trainer_led', 'Treino Funcional Outdoor',
    'strength', 'Circuito de força funcional usando o peso corporal e o ambiente natural.',
    ARRAY['full_body']::body_area[], 'moderate', 'intermediate', FALSE,
    today + 5, '08:00', '09:00',
    'Parque das Nações', 'Parque das Nações, Lisboa', 38.7652, -9.0927,
    3, 10, 20.00, 'eur', 'published'
  ),
  (
    trainer_profile_id, 'trainer_led', 'Running Group — 5K Casual',
    'running', 'Corrida em grupo a ritmo moderado pela frente ribeirinha. Ideal para iniciantes.',
    ARRAY['legs', 'cardio']::body_area[], 'moderate', 'beginner', TRUE,
    today + 7, '07:30', '08:30',
    'Ribeira das Naus', 'Ribeira das Naus, Lisboa', 38.7071, -9.1403,
    5, 15, 10.00, 'eur', 'published'
  ),
  (
    trainer_profile_id, 'trainer_led', 'Pilates ao Ar Livre — Seniores',
    'pilates', 'Sessão de pilates adaptada para seniores. Foco em mobilidade e equilíbrio.',
    ARRAY['core', 'mobility', 'back']::body_area[], 'low', 'all_levels', TRUE,
    today + 4, '10:30', '11:30',
    'Jardim Botânico da Ajuda', 'Calçada da Ajuda, Lisboa', 38.7052, -9.1805,
    2, 8, 14.00, 'eur', 'published'
  );
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- STRIPE PRODUCTS CONFIG (reference only)
-- Actual products created via stripe CLI / dashboard
-- ─────────────────────────────────────────────
-- stripe products:
--   prod_user_plus: User Plus (€4.99 one-time renewable)
--   prod_trainer:   Trainer Plan (€19/month)
--   prod_coach_pro: Coach Pro Plan (€39/month)
