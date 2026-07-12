REVOKE EXECUTE ON FUNCTION public.decrement_stock(jsonb) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.restock_items(jsonb) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, text, integer, integer) FROM authenticated, anon;