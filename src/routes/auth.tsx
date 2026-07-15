import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-header";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { mergeGuestState } from "@/lib/orders.functions";
import { sendWelcomeEmail } from "@/lib/emails.functions";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in | AURELIA" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

const GUEST_CART_KEY = "aurelia_cart_v1";
const GUEST_WISHLIST_KEY = "aurelia_wishlist_v1";

async function pullAndClearGuestState(mergeFn: (args: any) => Promise<any>) {
  if (typeof window === "undefined") return;
  let cart: any[] = [];
  let wishlist_ids: string[] = [];
  try { cart = JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? "[]"); } catch {}
  try { wishlist_ids = JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY) ?? "[]"); } catch {}
  if (cart.length === 0 && wishlist_ids.length === 0) return;
  try {
    await mergeFn({ data: { cart, wishlist_ids } });
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(GUEST_WISHLIST_KEY);
    window.dispatchEvent(new Event("cart:update"));
  } catch (e) { console.warn("guest merge failed", e); }
}

const emailSchema = z.string().trim().toLowerCase().email("Please enter a valid email address").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/\d/, "Include at least one number");
const nameSchema = z.string().trim().min(2, "Please enter your full name").max(100, "Name is too long")
  .regex(/^[\p{L}\s.'-]+$/u, "Name contains invalid characters");
const phoneSchema = z.string().regex(/^\d{10}$/, "Enter exactly 10 digits (without +92)");

const signUpSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

function PasswordInput({
  value, onChange, placeholder, autoComplete, error,
}: { value: string; onChange: (v: string) => void; placeholder: string; autoComplete?: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border border-border px-4 py-3 pr-11"
          maxLength={72}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary"
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  const mergeFn = useServerFn(mergeGuestState);
  const sendWelcome = useServerFn(sendWelcomeEmail);

  useEffect(() => { if (user) navigate({ to: "/account" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrors({});
    try {
      setLoading(true);
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ fullName, email, phone, password });
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          for (const iss of parsed.error.issues) errs[iss.path[0] as string] = iss.message;
          setErrors(errs);
          return;
        }
        const fullPhone = `+92${parsed.data.phone}`;
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { full_name: parsed.data.fullName, phone: fullPhone },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });
        if (error) throw error;
        // Persist phone on profile (best-effort — profile is auto-created by trigger)
        if (data.user) {
          try { await supabase.from("profiles").update({ phone: fullPhone, full_name: parsed.data.fullName }).eq("id", data.user.id); } catch {}
        }
        // Fire welcome email (non-blocking; no-op if email not configured)
        try { await sendWelcome({ data: { email: parsed.data.email, name: parsed.data.fullName } }); } catch {}
        toast.success("Welcome! Check your inbox to confirm your email.");
        await pullAndClearGuestState(mergeFn);
        navigate({ to: "/account" });
      } else if (mode === "signin") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          const errs: Record<string, string> = {};
          for (const iss of parsed.error.issues) errs[iss.path[0] as string] = iss.message;
          setErrors(errs);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back.");
        await pullAndClearGuestState(mergeFn);
        navigate({ to: "/account" });
      } else {
        // forgot password
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
          setErrors({ email: parsed.error.issues[0]?.message ?? "Invalid email" });
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("If an account exists, a reset link has been sent.");
        setMode("signin");
      }
    } catch (e: any) {
      const msg = String(e?.message || "Something went wrong");
      if (/already registered|already exists|duplicate/i.test(msg)) {
        toast.error("An account with this email already exists.");
      } else if (/invalid login|invalid credentials/i.test(msg)) {
        toast.error("Incorrect email or password.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const heading = mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password";

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24 max-w-md mx-auto">
        <div className="eyebrow mb-2 text-center">Members</div>
        <h1 className="text-4xl md:text-5xl font-serif text-center mb-10">{heading}</h1>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "signup" && (
            <>
              <div>
                <input
                  required autoComplete="name" placeholder="Full name" value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent border border-border px-4 py-3"
                  maxLength={100}
                />
                {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div>
                <div className="flex items-stretch border border-border">
                  <span className="flex items-center gap-2 px-3 bg-surface border-r border-border select-none">
                    <span aria-hidden="true" className="text-lg leading-none">🇵🇰</span>
                    <span className="text-sm font-medium">+92</span>
                  </span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="3XX XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full bg-transparent px-4 py-3"
                    maxLength={10}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </div>
            </>
          )}
          {(mode === "signin" || mode === "signup" || mode === "forgot") && (
            <div>
              <input
                required type="email" autoComplete="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-border px-4 py-3"
                maxLength={255}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
          )}
          {mode !== "forgot" && (
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              error={errors.password}
            />
          )}
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">
              At least 8 characters, including uppercase, lowercase, and a number.
            </p>
          )}

          {mode === "signin" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setErrors({}); setMode("forgot"); }}
                className="text-xs text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full border border-primary bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>New here? <button onClick={() => { setErrors({}); setMode("signup"); }} className="text-primary underline underline-offset-4">Create account</button></>
          )}
          {mode === "signup" && (
            <>Already a member? <button onClick={() => { setErrors({}); setMode("signin"); }} className="text-primary underline underline-offset-4">Sign in</button></>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setErrors({}); setMode("signin"); }} className="text-primary underline underline-offset-4">Back to sign in</button>
          )}
        </div>
        <div className="mt-2 text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-primary">← Back to store</Link>
        </div>
      </div>
    </SiteShell>
  );
}
