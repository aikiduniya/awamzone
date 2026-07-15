
-- Allow authenticated users to manage their own avatar files in "media" bucket under avatars/{uid}/*
CREATE POLICY "Users insert own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users read own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Seed default email templates
INSERT INTO public.email_templates (code, subject, body, is_active)
VALUES
  ('welcome',
   'Welcome to {{site_name}}, {{name}}!',
   '<h1>Welcome, {{name}}!</h1><p>Thank you for creating an account at {{site_name}}. We''re thrilled to have you.</p><p>Start exploring our latest collection at <a href="{{site_url}}">{{site_url}}</a>.</p><p>— The {{site_name}} team</p>',
   true),
  ('password_reset',
   'Reset your {{site_name}} password',
   '<h1>Password reset requested</h1><p>Hi {{name}},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="{{reset_url}}">Reset password</a></p><p>If you did not request this, please ignore this email.</p>',
   true)
ON CONFLICT (code) DO NOTHING;
