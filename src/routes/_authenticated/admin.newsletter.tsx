import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, Empty } from "@/components/admin/admin-ui";
import { SimpleCrud } from "@/components/admin/simple-crud";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({ component: NewsletterAdmin });

function NewsletterAdmin() {
  const { data: subs } = useQuery({
    queryKey: ["newsletter-subs"],
    queryFn: async () => (await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const exportCsv = () => {
    const csv = ["email,subscribed_at", ...(subs ?? []).map((s: any) => `${s.email},${s.created_at}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "subscribers.csv"; a.click();
  };

  return (
    <div className="space-y-10">
      <div>
        <AdminHeader title="Newsletter Subscribers" description={`${subs?.length ?? 0} subscribers.`} actions={
          <button onClick={exportCsv} className="border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]">Export CSV</button>
        } />
        {!subs?.length ? <Empty>No subscribers</Empty> : (
          <div className="border border-border max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary sticky top-0"><tr className="text-left"><th className="p-3">Email</th><th className="p-3">Since</th></tr></thead>
              <tbody>
                {subs.map((s: any) => <tr key={s.id} className="border-t border-border"><td className="p-3">{s.email}</td><td className="p-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SimpleCrud
        table="newsletter_campaigns"
        title="Campaigns"
        description="Compose and schedule newsletter campaigns."
        columns={[
          { key: "subject", label: "Subject" },
          { key: "status", label: "Status" },
          { key: "sent_count", label: "Sent" },
        ]}
        fields={[
          { key: "subject", label: "Subject", colSpan: 2, required: true },
          { key: "body", label: "Body (HTML)", type: "textarea" },
          { key: "status", label: "Status", type: "select", options: [
            { value: "draft", label: "Draft" },
            { value: "scheduled", label: "Scheduled" },
            { value: "sent", label: "Sent" },
          ] },
        ]}
      />
    </div>
  );
}
