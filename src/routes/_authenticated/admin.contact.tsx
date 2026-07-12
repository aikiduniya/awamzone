import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SimpleCrud } from "@/components/admin/simple-crud";
import { Check, MailOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/contact")({ component: ContactAdmin });

function ContactAdmin() {
  const setRead = async (id: string, is_read: boolean) => {
    const { error } = await supabase.from("contact_submissions").update({ is_read }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(is_read ? "Marked as read" : "Marked as unread");
  };

  return (
    <SimpleCrud
      table="contact_submissions"
      title="Contact Messages"
      description="Messages submitted from the contact form."
      readOnly
      disableEdit
      enableDuplicate={false}
      orderBy={{ column: "created_at", ascending: false }}
      searchColumns={["name", "email", "subject"]}
      fields={[]}
      columns={[
        { key: "created_at", label: "Received", render: (r) => new Date(r.created_at).toLocaleString() },
        { key: "name", label: "Name", render: (r) => <span className={r.is_read ? "" : "font-semibold"}>{r.name}</span> },
        { key: "email", label: "Email" },
        { key: "subject", label: "Subject" },
        { key: "message", label: "Message", render: (r) => <span className="text-muted-foreground line-clamp-2 max-w-md inline-block">{r.message}</span>, sortable: false },
        { key: "is_read", label: "Read", render: (r) => (r.is_read ? "✓" : "—") },
      ]}
      customActions={[
        { key: "read", label: "Mark read", icon: Check, variant: "primary", show: (r) => !r.is_read, onClick: (r) => setRead(r.id, true) },
        { key: "unread", label: "Mark unread", icon: MailOpen, show: (r) => r.is_read, onClick: (r) => setRead(r.id, false) },
      ]}
    />
  );
}
