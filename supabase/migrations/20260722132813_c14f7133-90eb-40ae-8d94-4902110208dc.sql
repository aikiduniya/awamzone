DROP POLICY IF EXISTS "Admins read media" ON public.media_assets;
CREATE POLICY "Admins read media" ON public.media_assets FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));