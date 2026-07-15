// Server functions for template-based email sending (welcome, etc.)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendLovableEmail, EmailAPIError } from "@lovable.dev/email-js";

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ""));
}

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((v: { email: string; name?: string }) =>
    z.object({ email: z.string().email(), name: z.string().max(200).optional() }).parse(v),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [tplRes, brandRes, smtpRes] = await Promise.all([
        supabaseAdmin.from("email_templates").select("subject,body,is_active").eq("code", "welcome").maybeSingle(),
        supabaseAdmin.from("site_settings").select("value").eq("key", "branding").maybeSingle(),
        supabaseAdmin.from("site_settings").select("value").eq("key", "smtp").maybeSingle(),
      ]);
      const tpl = tplRes.data;
      if (!tpl || tpl.is_active === false) return { sent: false, reason: "template_disabled" as const };

      const branding = (brandRes.data?.value as any) ?? {};
      const smtp = (smtpRes.data?.value as any) ?? {};
      const fromEmail: string | null = smtp.from_email || null;
      const fromName: string = smtp.from_name || branding.site_name || "AURELIA";
      const senderDomain = fromEmail && fromEmail.includes("@") ? fromEmail.split("@")[1] : null;
      const publicUrl = process.env.PUBLIC_APP_URL ?? "https://awamzone.lovable.app";
      const apiKey = process.env.LOVABLE_API_KEY;

      if (!apiKey || !senderDomain || !fromEmail) {
        console.info("[welcome-email] skipped — email not configured");
        return { sent: false, reason: "not_configured" as const };
      }

      const vars = {
        name: data.name || data.email.split("@")[0],
        site_name: branding.site_name || "AURELIA",
        site_url: publicUrl,
        email: data.email,
      };
      const subject = renderTemplate(tpl.subject || "Welcome", vars);
      const html = renderTemplate(tpl.body || "", vars);

      const res = await sendLovableEmail(
        {
          to: data.email,
          from: `${fromName} <${fromEmail}>`,
          sender_domain: senderDomain,
          subject,
          html,
          text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        },
        { apiKey, idempotencyKey: `welcome-${data.email}` },
      );
      return res;
    } catch (err) {
      if (err instanceof EmailAPIError) {
        console.warn("[welcome-email] api error:", err.code, err.message);
      } else {
        console.warn("[welcome-email] failed:", (err as Error).message);
      }
      return { sent: false, reason: "error" as const };
    }
  });
