-- ============================================================
-- KIVU CULTURE — SEED COMPLET
-- EXÉCUTION : Supabase Dashboard → SQL Editor → Coller tout
-- ============================================================

-- ============================================================
-- 0. MIGRATION : ajout colonne bio (si pas déjà présente)
-- ============================================================
-- ============================================================
-- 0. MIGRATION + NETTOYAGE
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- Politique RLS pour suppression d'avis par admin
DROP POLICY IF EXISTS reviews_delete_admin ON public.reviews;
CREATE POLICY reviews_delete_admin ON public.reviews FOR DELETE
  USING (public.is_admin());

-- Supprime les comptes de test précédents avant re-création
DELETE FROM public.reviews       WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@kivu-culture.cd');
DELETE FROM public.orders        WHERE buyer_id IN (SELECT id FROM auth.users WHERE email LIKE '%@kivu-culture.cd');
DELETE FROM auth.identities      WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@kivu-culture.cd');
DELETE FROM public.artworks      WHERE artisan_id IN (SELECT id FROM auth.users WHERE email LIKE '%@kivu-culture.cd');
DELETE FROM public.events        WHERE status = 'published';
DELETE FROM auth.users           WHERE email LIKE '%@kivu-culture.cd';

-- ============================================================
-- 1. CRÉATION DES 5 COMPTES ARTISANS
-- ============================================================
-- Mot de passe commun : Kivu2026!
-- Les emails sont pré-confirmés (skip email verification).

WITH
user1 AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'ambroise@kivu-culture.cd', crypt('Kivu2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '')
  RETURNING id
),
user2 AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rahel@kivu-culture.cd', crypt('Kivu2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '')
  RETURNING id
),
user3 AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'jose@kivu-culture.cd', crypt('Kivu2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '')
  RETURNING id
),
user4 AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'david@kivu-culture.cd', crypt('Kivu2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '')
  RETURNING id
),
user5 AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'grace@kivu-culture.cd', crypt('Kivu2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '')
  RETURNING id
),

-- ============================================================
-- 2. IDENTITÉS (requis par Supabase Auth)
-- ============================================================
identities AS (
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT id, id, jsonb_build_object('sub', id::text, 'email', email), 'email', id::text, now(), now(), now()
  FROM auth.users WHERE email LIKE '%@kivu-culture.cd'
  RETURNING user_id
),

-- ============================================================
-- 3. PROFILS PUBLICS
-- ============================================================
profiles AS (
  INSERT INTO public.profiles (id, role, first_name, last_name, city, verification_status, bio)
  SELECT id, 'artisan', first_name, last_name, city, verification_status, bio
  FROM (VALUES
    ((SELECT id FROM user1), 'Ambroise'::text, 'Mawazo'::text,   'Bukavu'::text, 'verified'::text, 'Sculpteur sur bois depuis 20 ans, formé à l''école des arts de Bukavu. Spécialiste des masques traditionnels Havu et Shi.'),
    ((SELECT id FROM user2), 'Rahel'::text,    'Kahindo'::text,   'Goma'::text,   'verified'::text, 'Peintre contemporaine, diplômée des Beaux-Arts de Kinshasa. Mes toiles racontent les volcans et les lacs du Kivu.'),
    ((SELECT id FROM user3), 'Joséphine'::text,'Nyota'::text,     'Uvira'::text,  'verified'::text, 'Photographe documentaire primée, exposée à Lubumbashi, Nairobi et Paris.'),
    ((SELECT id FROM user4), 'David'::text,    'Kabulo'::text,    'Goma'::text,   'verified'::text, 'Artisan tisserand de la communauté Bashi. Je perpétue les techniques transmises par ma grand-mère.'),
    ((SELECT id FROM user5), 'Grace'::text,    'Mboneza'::text,   'Bukavu'::text, 'pending'::text,  'Jeune créatrice de bijoux en perles recyclées, autodidacte et passionnée par la mode durable.')
  ) AS t(id, first_name, last_name, city, verification_status, bio)
  RETURNING id
)

-- ============================================================
-- 4. ŒUVRES (3 par artisan)
-- ============================================================
INSERT INTO public.artworks (artisan_id, title, description, category, price_cents, currency, status, image_path)
SELECT artisan_id, title, description, category, price_cents, currency, 'published', image_path
FROM (VALUES
  ((SELECT id FROM user1), 'Masque Mukanda',     'Masque rituel des cérémonies Mukanda, sculpté dans du bois d''iroko. Pièce unique.',                                                          'Sculpture',  15000, 'USD', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&q=85'),
  ((SELECT id FROM user1), 'Statue Mwana Pwo',   'Figurine féminine Mwana Pwo, ancêtre fondatrice. Bois de teck patiné à la main.',                                                              'Sculpture',  22000, 'USD', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=85'),
  ((SELECT id FROM user1), 'Bâton de Chef',      'Bâton de commandement sculpté, motifs géométriques Shi. Bois d''ébène et incrustations laiton.',                                               'Sculpture',  28000, 'USD', 'https://images.unsplash.com/photo-1597245818917-0e557b42080b?w=600&q=85'),
  ((SELECT id FROM user2), 'Kivu Vert',          'Acrylique grand format : collines du Sud-Kivu au lever du soleil. Toile 120x80 cm.',                                                           'Peinture',    8500, 'USD', 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=600&q=85'),
  ((SELECT id FROM user2), 'Femme Lave',         'Portrait d''une femme Havu au bord du lac Kivu. Acrylique et collage de tissu.',                                                                'Peinture',   12000, 'USD', 'https://images.unsplash.com/photo-1583394293253-4e7fa1f8e2c3?w=600&q=85'),
  ((SELECT id FROM user2), 'Lueur sur le Lac',   'Série impressionniste des reflets sur le lac Kivu. Huile sur toile 60x90 cm.',                                                                  'Peinture',   10500, 'USD', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=85'),
  ((SELECT id FROM user3), 'Nyiragongo #3',      'Tirage limité de l''éruption du Nyiragongo. 50 exemplaires numérotés et signés. Format 40x60 cm.',                                           'Photographie',18000, 'USD', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=85'),
  ((SELECT id FROM user3), 'Pêcheurs Tanganyika','Pêcheurs artisans au lever du jour sur le lac Tanganyika. Tirage argentique, 30 ex.',                                                         'Photographie',15500, 'USD', 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=600&q=85'),
  ((SELECT id FROM user3), 'Marché de Bukavu',   'Couleurs et textures du grand marché de Bukavu. Street photography, tirage 30x45 cm.',                                                        'Photographie', 9500, 'USD', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=85'),
  ((SELECT id FROM user4), 'Vannerie Bashi',     'Panier traditionnel Bashi en fibres de papyrus tressé. Teinture naturelle ocre. Diamètre 35 cm.',                                             'Artisanat',   6500, 'USD', 'https://images.unsplash.com/photo-1594999945795-e570338fdd12?w=600&q=85'),
  ((SELECT id FROM user4), 'Tenture Kivu',       'Tenture murale en raphia teint aux pigments naturels. Motifs géométriques Shi. 100x150 cm.',                                                  'Textile',    14000, 'USD', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=85'),
  ((SELECT id FROM user4), 'Natroute Kokiyo',    'Set de table en fibres de bananier tressées. Lot de 6 pièces uniques.',                                                                        'Artisanat',   3500, 'USD', 'https://images.unsplash.com/photo-1591123120672-f278488733d6?w=600&q=85'),
  ((SELECT id FROM user5), 'Collier Amazulu',    'Collier en perles de verre recyclé. Motifs traditionnels Havu. Longueur 45 cm + fermoir.',                                                    'Bijouterie',  4200, 'USD', 'https://images.unsplash.com/photo-1722072391426-964abfef1924?w=600&q=85'),
  ((SELECT id FROM user5), 'Bracelet Volcan',    'Bracelet en laiton martelé et perles de lave du Nyiragongo. Pièce unique.',                                                                     'Bijouterie',  2800, 'USD', 'https://images.unsplash.com/photo-1611652022419-a9419f74325d?w=600&q=85'),
  ((SELECT id FROM user5), 'Boucles Lacs',       'Boucles d''oreilles argent recyclé et turquoise. Inspirées des couleurs des lacs Kivu et Tanganyika.',                                        'Bijouterie',  3600, 'USD', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&q=85')
) AS t(artisan_id, title, description, category, price_cents, currency, image_path);

-- ============================================================
-- 5. ÉVÉNEMENTS
-- ============================================================
INSERT INTO public.events (title, description, category, location, starts_at, ends_at, status)
VALUES
  ('Festival des Arts du Kivu',       'Trois jours de musique, danse, théâtre et expositions avec 40 artistes des Grands Lacs.',                                                                       'Festival',   'Goma — Stade de l''Unité',                             '2026-08-15 09:00:00+02', '2026-08-17 23:00:00+02', 'published'),
  ('Exposition : Mémoires de Lave',   'Photographies grand format des coulées volcaniques du Nyiragongo par Joséphine Nyota.',                                                                         'Exposition', 'Bukavu — Institut Français',                            '2026-09-05 18:00:00+02', '2026-10-05 20:00:00+02', 'published'),
  ('Atelier Tissage Traditionnel',    'Initiation au tissage Bashi avec les maîtres tisseurs de Kabare. Matériel fourni.',                                                                             'Atelier',    'Kabare — Centre Artisanal',                             '2026-07-25 10:00:00+02', '2026-07-25 16:00:00+02', 'published'),
  ('Conférence : Architecture Volca', 'Construire sur la lave : histoire et techniques par Dr Aimé Bisimwa (ULPGL).',                                                                               'Conférence', 'Goma — Université Libre des Pays des Grands Lacs',      '2026-08-20 15:00:00+02', '2026-08-20 18:00:00+02', 'published'),
  ('Marché des Artisans du Kivu',     'Grand marché mensuel : sculptures, tissages, bijoux, céramique et gastronomie. 60+ exposants.',                                                                  'Marché',     'Bukavu — Place de l''Indépendance',                     '2026-09-12 08:00:00+02', '2026-09-12 18:00:00+02', 'published'),
  ('Masterclass Rumba Congolaise',    'Atelier guitare et chant avec les musiciens du groupe Bahati. Rumba traditionnelle et moderne.',                                                                'Musique',    'Uvira — Centre Culturel',                               '2026-07-30 14:00:00+02', '2026-07-30 18:00:00+02', 'published'),
  ('Résidence : Eau & Mémoire',       'Résidence de 2 semaines pour 6 artistes autour des lacs Kivu et Tanganyika. Appel à candidatures jusqu''au 15/09.',                                           'Résidence',  'Bukavu — Maison des Artistes',                          '2026-10-01 09:00:00+02', '2026-10-15 18:00:00+02', 'published');

-- ============================================================
-- 6. VÉRIFICATION
-- ============================================================
SELECT '✅ Artisans' as section, count(*)||' comptes créés' FROM auth.users WHERE email LIKE '%@kivu-culture.cd'
UNION ALL
SELECT '✅ Profils', count(*)||' profils artisan' FROM public.profiles WHERE role = 'artisan'
UNION ALL
SELECT '✅ Œuvres', count(*)||' œuvres publiées' FROM public.artworks WHERE status = 'published'
UNION ALL
SELECT '✅ Événements', count(*)||' événements à venir' FROM public.events WHERE status = 'published'
UNION ALL
SELECT '🔑 Identifiants', 'Email: *@kivu-culture.cd | Mot de passe: Kivu2026!' as infos;
