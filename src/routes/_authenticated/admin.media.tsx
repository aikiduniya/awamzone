import { createFileRoute } from "@tanstack/react-router";
import { MediaLibrary } from "@/components/admin/media-picker";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: MediaPage,
});

function MediaPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-primary">Media Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload, organize and reuse images across the store.</p>
      </div>
      <MediaLibrary />
    </div>
  );
}
