import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/qa")({ component: QaAdmin });

function QaAdmin() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-qa"],
    queryFn: async () => (await supabase.from("product_questions").select("*, products(name, slug)").order("created_at", { ascending: false })).data ?? [],
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const answer = async (id: string) => {
    const a = answers[id];
    if (!a) return;
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("product_questions").update({ answer: a, answered_by: user.user?.id, answered_at: new Date().toISOString(), is_approved: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Answer published"); refetch();
  };

  const approve = async (id: string, is_approved: boolean) => {
    await supabase.from("product_questions").update({ is_approved }).eq("id", id); refetch();
  };

  return (
    <>
      <AdminHeader title="Questions & Answers" description="Answer product questions and moderate visibility." />
      {!data?.length ? <Empty>No questions yet</Empty> : (
        <div className="space-y-4">
          {data.map((q: any) => (
            <div key={q.id} className="border border-border p-5">
              <div className="text-xs text-muted-foreground mb-1">on {q.products?.name}</div>
              <div className="font-serif text-lg mb-2">{q.question}</div>
              {q.answer ? (
                <div className="text-sm border-l-2 border-primary pl-3 mb-3">{q.answer}</div>
              ) : (
                <div className="space-y-2 mb-3">
                  <textarea rows={3} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Type your answer…" className="w-full bg-transparent border border-border px-3 py-2 text-sm" />
                  <button onClick={() => answer(q.id)} className="border border-primary bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]">Publish answer</button>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2"><input type="checkbox" checked={q.is_approved} onChange={(e) => approve(q.id, e.target.checked)} /> Approved</label>
                <span className="text-muted-foreground">{new Date(q.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
