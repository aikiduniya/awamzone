import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { toast } from "sonner";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reviews")({ component: ReviewsAdmin });

function ReviewsAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*, products(name, slug)").order("created_at", { ascending: false })).data ?? [],
  });

  const setApproved = async (id: string, is_approved: boolean) => {
    const { error } = await supabase.from("reviews").update({ is_approved }).eq("id", id);
    if (error) return toast.error(error.message);
    refetch();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete review?")) return;
    await supabase.from("reviews").delete().eq("id", id); refetch();
  };

  return (
    <>
      <AdminHeader title="Reviews Moderation" description="Approve, hide, or delete customer reviews." />
      {!data?.length ? <Empty>No reviews</Empty> : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <div key={r.id} className="border border-border p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs text-muted-foreground">{r.products?.name}</div>
                  <div className="font-serif text-lg">{r.title || "(no title)"}</div>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className={i < r.rating ? "fill-primary" : "opacity-30"} />)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{r.body}</p>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2"><input type="checkbox" checked={r.is_approved} onChange={(e) => setApproved(r.id, e.target.checked)} /> Approved</label>
                <button onClick={() => remove(r.id)} className="text-destructive uppercase tracking-[0.2em]">Delete</button>
                <span className="text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
