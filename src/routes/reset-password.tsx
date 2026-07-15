import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-header";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password | AURELIA" }] }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72)
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/\d/, "Include at least one number");

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Supabase auto-parses the recovery hash and emits PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrors({});
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) return setErrors({ password: pw.error.issues[0].message });
    if (password !== confirm) return setErrors({ confirm: "Passwords do not match" });
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're now signed in.");
      navigate({ to: "/account" });
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24 max-w-md mx-auto">
        <div className="eyebrow mb-2 text-center">Account</div>
        <h1 className="text-4xl md:text-5xl font-serif text-center mb-10">Set a new password</h1>

        {!ready ? (
          <div className="text-center text-sm text-muted-foreground">
            <p>This page must be opened from the password reset link in your email.</p>
            <p className="mt-4"><Link to="/auth" className="text-primary underline underline-offset-4">Back to sign in</Link></p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-border px-4 py-3 pr-11"
                maxLength={72}
              />
              <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="-mt-2 text-xs text-destructive">{errors.password}</p>}
            <div className="relative">
              <input
                type={show2 ? "text" : "password"}
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-transparent border border-border px-4 py-3 pr-11"
                maxLength={72}
              />
              <button type="button" tabIndex={-1} onClick={() => setShow2((v) => !v)} aria-label={show2 ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary">
                {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirm && <p className="-mt-2 text-xs text-destructive">{errors.confirm}</p>}
            <p className="text-xs text-muted-foreground">At least 8 characters, including uppercase, lowercase, and a number.</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full border border-primary bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition disabled:opacity-50"
            >
              {loading ? "Please wait…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </SiteShell>
  );
}
