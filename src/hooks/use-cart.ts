import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";
import { toast } from "sonner";

const GUEST_KEY = "aurelia_cart_v1";

type GuestItem = { product_id: string; variant_id?: string | null; quantity: number };

function readGuestCart(): GuestItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeGuestCart(items: GuestItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:update"));
}

export function useCart() {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cart", user?.id ?? "guest"],
    queryFn: async () => {
      if (user) {
        const { data, error } = await supabase
          .from("cart_items")
          .select("id, quantity, product_id, variant_id, products(id, name, slug, price, sale_price, images, stock)")
          .eq("user_id", user.id);
        if (error) throw error;
        return (data ?? []).map((r: any) => ({
          id: r.id,
          product_id: r.product_id,
          variant_id: r.variant_id,
          quantity: r.quantity,
          product: r.products,
        }));
      } else {
        const guest = readGuestCart();
        if (guest.length === 0) return [];
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, price, sale_price, images, stock")
          .in("id", guest.map((g) => g.product_id));
        return guest.map((g) => ({
          id: g.product_id,
          product_id: g.product_id,
          variant_id: g.variant_id ?? null,
          quantity: g.quantity,
          product: data?.find((p) => p.id === g.product_id),
        }));
      }
    },
  });

  const add = useMutation({
    mutationFn: async ({ product_id, quantity = 1 }: { product_id: string; quantity?: number }) => {
      if (user) {
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("product_id", product_id)
          .is("variant_id", null)
          .maybeSingle();
        if (existing) {
          await supabase.from("cart_items").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({ user_id: user.id, product_id, quantity });
        }
      } else {
        const guest = readGuestCart();
        const idx = guest.findIndex((g) => g.product_id === product_id);
        if (idx >= 0) guest[idx].quantity += quantity;
        else guest.push({ product_id, quantity });
        writeGuestCart(guest);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to bag");
    },
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (user) {
        if (quantity <= 0) await supabase.from("cart_items").delete().eq("id", id);
        else await supabase.from("cart_items").update({ quantity }).eq("id", id);
      } else {
        const guest = readGuestCart();
        const idx = guest.findIndex((g) => g.product_id === id);
        if (idx >= 0) {
          if (quantity <= 0) guest.splice(idx, 1);
          else guest[idx].quantity = quantity;
          writeGuestCart(guest);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (user) await supabase.from("cart_items").delete().eq("id", id);
      else {
        const guest = readGuestCart().filter((g) => g.product_id !== id);
        writeGuestCart(guest);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (user) await supabase.from("cart_items").delete().eq("user_id", user.id);
      else writeGuestCart([]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const items = query.data ?? [];
  const count = items.reduce((s: number, i: any) => s + i.quantity, 0);
  const subtotal = items.reduce((s: number, i: any) => {
    if (!i.product) return s;
    const price = i.product.sale_price && Number(i.product.sale_price) > 0 ? Number(i.product.sale_price) : Number(i.product.price);
    return s + price * i.quantity;
  }, 0);

  return { items, count, subtotal, loading: query.isLoading, add, updateQty, remove, clear };
}
