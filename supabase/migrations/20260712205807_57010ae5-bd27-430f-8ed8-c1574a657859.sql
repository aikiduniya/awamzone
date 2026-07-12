
-- Revoke public EXECUTE on all SECURITY DEFINER functions to satisfy the
-- Supabase linter (anon/authenticated executable SECURITY DEFINER).
-- Client-callable helpers are re-granted to authenticated only.

DO $$
DECLARE
  fn text;
  lockdown text[] := ARRAY[
    'handle_new_user()',
    'hit_rate_limit(text, text, integer, integer)',
    'restock_items(jsonb)',
    'decrement_stock(jsonb)',
    'notify_admins(text, text, text, text)',
    'profiles_guard_sensitive()',
    'tg_notify_return()',
    'tg_notify_review()',
    'tg_notify_question()',
    'tg_notify_new_order()',
    'tg_notify_contact()',
    'tg_notify_newsletter()'
  ];
  keep_auth text[] := ARRAY[
    'has_role(uuid, app_role)',
    'is_admin(uuid)',
    'admin_status()',
    'claim_first_admin()'
  ];
BEGIN
  FOREACH fn IN ARRAY lockdown LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
  FOREACH fn IN ARRAY keep_auth LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
  END LOOP;
END $$;
