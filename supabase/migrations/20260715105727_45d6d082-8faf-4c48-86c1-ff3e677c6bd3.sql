
-- Revoke direct EXECUTE from anon/authenticated on SECURITY DEFINER functions in public.
-- These functions are used internally (RLS policies, triggers, server-only paths) and
-- should not be directly invokable via PostgREST by clients.

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restock_items(jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_return() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_contact() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_newsletter() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_question() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_review() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_notify_new_order() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_sensitive() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM anon, authenticated, PUBLIC;

-- Keep app-invoked RPCs callable by signed-in users only.
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_status() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_status() TO authenticated;
