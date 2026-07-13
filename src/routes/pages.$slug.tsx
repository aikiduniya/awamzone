import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy /pages/:slug URLs — permanently redirect to clean /:slug URLs.
export const Route = createFileRoute("/pages/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$slug", params: { slug: params.slug }, statusCode: 301 });
  },
  component: () => null,
});
