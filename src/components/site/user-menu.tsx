import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { User as UserIcon, LogOut, Package, Heart, MapPin, Settings, KeyRound, UserCircle, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export function UserMenu() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    setOpen(false);
  };

  const itemCls = "flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-surface hover:text-primary transition";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-foreground/80 hover:text-primary transition-colors"
      >
        <UserIcon size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-56 bg-background border border-border shadow-xl rounded-md py-2 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {user ? (
            <>
              <div className="px-4 py-2 border-b border-border">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Signed in as</div>
                <div className="text-sm truncate">{user.email}</div>
              </div>
              <Link to="/account" onClick={() => setOpen(false)} className={itemCls} role="menuitem"><UserCircle size={16} /> My Profile</Link>
              <Link to="/account" search={{ tab: "orders" } as any} onClick={() => setOpen(false)} className={itemCls} role="menuitem"><Package size={16} /> My Orders</Link>
              <Link to="/wishlist" onClick={() => setOpen(false)} className={itemCls} role="menuitem"><Heart size={16} /> Wishlist</Link>
              <Link to="/account" search={{ tab: "addresses" } as any} onClick={() => setOpen(false)} className={itemCls} role="menuitem"><MapPin size={16} /> Addresses</Link>
              <Link to="/account" search={{ tab: "preferences" } as any} onClick={() => setOpen(false)} className={itemCls} role="menuitem"><Settings size={16} /> Account Settings</Link>
              <Link to="/account" search={{ tab: "security" } as any} onClick={() => setOpen(false)} className={itemCls} role="menuitem"><KeyRound size={16} /> Change Password</Link>
              <div className="border-t border-border mt-1 pt-1">
                <button type="button" onClick={signOut} className={itemCls + " w-full text-left"} role="menuitem"><LogOut size={16} /> Logout</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setOpen(false)} className={itemCls} role="menuitem"><LogIn size={16} /> Sign In</Link>
              <Link to="/auth" search={{ mode: "signup" } as any} onClick={() => setOpen(false)} className={itemCls} role="menuitem"><UserPlus size={16} /> Create Account</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
