import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-4">Error 404</p>
        <h1 className="text-6xl font-serif text-primary">Lost in the atelier</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-4">Something went wrong</p>
        <h1 className="text-3xl font-serif text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try refreshing, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="border border-primary bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-transparent hover:text-primary transition"
          >
            Try again
          </button>
          <a
            href="/"
            className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] text-foreground hover:border-primary hover:text-primary transition"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AURELIA — Luxury Everyday" },
      { name: "description", content: "A curated luxury marketplace for modern essentials — fashion, home, beauty, and accessories." },
      { name: "author", content: "AURELIA" },
      { property: "og:title", content: "AURELIA — Luxury Everyday" },
      { property: "og:description", content: "A curated luxury marketplace for modern essentials — fashion, home, beauty, and accessories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AURELIA — Luxury Everyday" },
      { name: "twitter:description", content: "A curated luxury marketplace for modern essentials — fashion, home, beauty, and accessories." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/791ee797-8cc6-4fb4-a759-f7beb5440d8c/id-preview-c4094b5c--f503936e-bc48-41a7-9230-454124290b5c.lovable.app-1783870590139.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/791ee797-8cc6-4fb4-a759-f7beb5440d8c/id-preview-c4094b5c--f503936e-bc48-41a7-9230-454124290b5c.lovable.app-1783870590139.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsInjector />
      <Outlet />
      <PopupRenderer />
      <Toaster theme="dark" position="top-right" />
    </QueryClientProvider>
  );
}

import { PopupRenderer } from "@/components/site/popup-renderer";
import { AnalyticsInjector } from "@/components/site/analytics-injector";
