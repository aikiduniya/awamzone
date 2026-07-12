
DROP POLICY IF EXISTS "Public read settings" ON public.site_settings;

CREATE POLICY "Public read non-sensitive settings"
ON public.site_settings
FOR SELECT
USING (
  key IN (
    'branding','contact','seo','footer','social','announcement',
    'analytics','whatsapp','notification_sounds',
    'theme_mode','theme_light','theme_dark','menus'
  )
);
