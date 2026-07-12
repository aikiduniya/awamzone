import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { pushRecentlyViewed, useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { ProductCard } from "./product-card";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const ids = useRecentlyViewed().filter((id) => id !== excludeId);
  const { data } = useQuery({
    queryKey: ["recently-viewed", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => (await supabase.from("products").select("id,name,slug,price,sale_price,images,stock").in("id", ids)).data ?? [],
  });
  if (!data?.length) return null;
  const ordered = ids.map((id) => data.find((p) => p.id === id)).filter(Boolean).slice(0, 4);
  return (
    <section className="mt-24">
      <div className="eyebrow mb-2">Recently viewed</div>
      <h2 className="text-3xl font-serif mb-8">You've been looking at</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {ordered.map((p: any) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

export function useTrackView(id: string | undefined) {
  useEffect(() => { if (id) pushRecentlyViewed(id); }, [id]);
}
