import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/site/site-header";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { useEffect } from "react";
import { mergeGuestState } from "@/lib/orders.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in | AURELIA" }] }),
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

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  const mergeFn = useServerFn(mergeGuestState);

  useEffect(() => {
    if (user) navigate({ to: "/account" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });
        if (error) throw error;
        toast.success("Welcome — check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      await pullAndClearGuestState(mergeFn);
      navigate({ to: "/account" });
    } catch (e: any) {
      toast.error(e.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="container-luxe py-16 md:py-24 max-w-md mx-auto">
        <div className="eyebrow mb-2 text-center">Members</div>
        <h1 className="text-4xl md:text-5xl font-serif text-center mb-10">{mode === "signin" ? "Sign In" : "Create Account"}</h1>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-transparent border border-border px-4 py-3" />
          )}
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border border-border px-4 py-3" />
          <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} className="w-full bg-transparent border border-border px-4 py-3" />
          <button disabled={loading} className="w-full border border-primary bg-primary text-primary-foreground py-4 text-xs uppercase tracking-[0.24em] hover:bg-transparent hover:text-primary transition disabled:opacity-50">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>New here? <button onClick={() => setMode("signup")} className="text-primary underline underline-offset-4">Create account</button></>
          ) : (
            <>Already a member? <button onClick={() => setMode("signin")} className="text-primary underline underline-offset-4">Sign in</button></>
          )}
        </div>
        <div className="mt-2 text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-primary">← Back to store</Link>
        </div>
      </div>
    </SiteShell>
  );
}
