import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export function useWishlist() {
  const { session } = useSession();
  const qc = useQueryClient();
  const userId = session?.user.id;

  const { data: ids = [] } = useQuery({
    queryKey: ["wishlist-ids", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", userId!);
      return (data ?? []).map((r: any) => r.product_id as string);
    },
  });

  const has = (productId: string) => ids.includes(productId);

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!userId) throw new Error("auth");
      if (ids.includes(productId)) {
        await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
        return { removed: true };
      }
      await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
      return { removed: false };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["wishlist-ids", userId] });
      qc.invalidateQueries({ queryKey: ["wishlist", userId] });
      toast.success(r.removed ? "Removed from wishlist" : "Added to wishlist");
    },
    onError: (e: any) => {
      if (e?.message === "auth") toast.error("Please sign in to save items");
      else toast.error(e?.message || "Wishlist error");
    },
  });

  return { has, toggle, authenticated: !!userId };
}
