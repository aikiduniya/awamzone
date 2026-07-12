
-- 1) Media bucket: drop broad public read policy. Access via signed URLs (admin uploads/reads use admin policies + signed URLs on client).
DROP POLICY IF EXISTS "media public read" ON storage.objects;

-- 2) Profiles: prevent privilege escalation. Recreate UPDATE policy so users cannot change sensitive columns.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Trigger enforces column-level restrictions: only admins can change is_banned, admin_notes, customer_group_id.
CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.customer_group_id IS DISTINCT FROM OLD.customer_group_id THEN
    RAISE EXCEPTION 'Not allowed to modify restricted profile fields';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.profiles_guard_sensitive() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_trg ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_sensitive();

-- Admin full-management policy for profiles (so admins can adjust sensitive fields).
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/authenticated.
-- has_role/is_admin remain executable by authenticated because RLS policies reference them.
REVOKE EXECUTE ON FUNCTION public.admin_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restock_items(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
