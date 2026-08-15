-- ============================================================
-- KIVU CULTURE — RÉPARATION AUTH
-- 1) Les comptes seed (@kivu-culture.cd) n'ont pas d'identities :
--    le CTE du seed initial les a insérés sans référencer user1..user5,
--    donc GoTrue renvoie 500 "Database error querying schema" au login.
-- 2) Les colonnes chaîne email_change*, confirmation/recovery sont
--    NULL alors que GoTrue exige des chaînes vides (scan NULL → string).
-- Ce script corrige les deux (idempotent).
-- EXÉCUTION : Supabase Dashboard → SQL Editor → Coller tout
-- ============================================================

-- 1. Colonnes chaîne : NULL → '' (voir supabase/auth#1940)
UPDATE auth.users SET
  email_change = '',
  email_change_token_new = '',
  email_change_token_current = '',
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, '')
WHERE email LIKE '%@kivu-culture.cd';

-- 2. Identities manquantes (recréées si jamais absentes)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email LIKE '%@kivu-culture.cd'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- Vérification
SELECT u.email, i.provider, i.provider_id
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'
WHERE u.email LIKE '%@kivu-culture.cd'
ORDER BY u.email;
