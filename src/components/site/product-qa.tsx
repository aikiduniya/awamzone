import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { toast } from "sonner";

export function ProductQA({ productId }: { productId: string }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["qa", productId],
    queryFn: async () => (await supabase.from("product_questions").select("*").eq("product_id", productId).eq("is_approved", true).order("created_at", { ascending: false })).data ?? [],
  });

  const submit = async () => {
    if (!user) return toast.error("Sign in to ask");
    if (!q.trim()) return;
    const { error } = await supabase.from("product_questions").insert({ product_id: productId, user_id: user.id, question: q.trim() });
    if (error) return toast.error(error.message);
    toast.success("Submitted — awaiting review"); setQ("");
    qc.invalidateQueries({ queryKey: ["qa", productId] });
  };

  return (
    <section className="mt-24">
      <div className="eyebrow mb-2">Ask us</div>
      <h2 className="text-3xl font-serif mb-8">Questions & Answers</h2>
      <div className="border border-border p-6 mb-8">
        <textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Have a question about this product?" className="w-full bg-transparent border border-border px-3 py-2 text-sm mb-3" />
        <button onClick={submit} className="border border-primary bg-primary text-primary-foreground px-6 py-2 text-xs uppercase tracking-[0.2em]">Ask a question</button>
      </div>
      {data?.length ? (
        <div className="space-y-6">
          {data.map((row) => (
            <div key={row.id} className="border-b border-border pb-6">
              <div className="font-serif text-lg mb-2">Q. {row.question}</div>
              {row.answer ? <div className="text-sm border-l-2 border-primary pl-3 text-muted-foreground">A. {row.answer}</div> : <div className="text-xs text-muted-foreground italic">Awaiting answer</div>}
            </div>
          ))}
        </div>
      ) : <p className="text-muted-foreground text-sm">No questions yet — be the first to ask.</p>}
    </section>
  );
}
