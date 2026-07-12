
-- 1. Media assets: restrict SELECT to admins (was public)
DROP POLICY IF EXISTS "Public read media" ON public.media_assets;
CREATE POLICY "Admins read media" ON public.media_assets FOR SELECT USING (public.is_admin(auth.uid()));

-- 2. Rate limits: explicit deny-all for clients (SECURITY DEFINER RPC handles writes)
CREATE POLICY "No client access to rate limits" ON public.rate_limits FOR ALL USING (false) WITH CHECK (false);

-- 3. Contact submissions: tighten INSERT WITH CHECK (was true)
DROP POLICY IF EXISTS "public submits" ON public.contact_submissions;
CREATE POLICY "public submits" ON public.contact_submissions FOR INSERT
  WITH CHECK (email IS NOT NULL AND length(email) <= 320 AND message IS NOT NULL AND length(message) <= 5000);

-- 4. Newsletter subscribers: tighten INSERT WITH CHECK (was true)
DROP POLICY IF EXISTS "Public subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Public subscribe" ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (email IS NOT NULL AND length(email) <= 320 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 5. Revoke EXECUTE on privileged SECURITY DEFINER functions from anon/authenticated
-- These should only be callable by server-side (service_role) or triggers, not clients.
REVOKE EXECUTE ON FUNCTION public.decrement_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restock_items(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role and is_admin are used inside RLS policies (SECURITY DEFINER runs as owner regardless);
-- keep authenticated EXECUTE so policies evaluate, but revoke from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
-- claim_first_admin: only signed-in users bootstrap
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
-- admin_status: allow anon so bootstrap page can check
GRANT EXECUTE ON FUNCTION public.admin_status() TO anon, authenticated;
