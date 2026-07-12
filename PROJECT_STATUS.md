# PROJECT_STATUS

Single-vendor, Shopify-style eCommerce platform built on TanStack Start + Lovable Cloud (Supabase).

## 1. Completed Features

### Storefront
- Home with dynamic sections, banners, popups, flash sales
- Product catalog: listing, filters, variants, gallery, related items
- Product detail: reviews, Q&A, recently viewed, compare, wishlist
- Search + category / brand browsing
- Cart with stock validation, guest → user merge on login
- Checkout: server-side quote (tax, shipping, coupons), address capture
- Order placement via atomic server function (`placeOrder`) with stock decrement RPC
- Order detail + cancellation with automatic restock
- Blog (list + post), FAQ, Contact form, Newsletter signup
- Compare page, Wishlist page, Account area
- SEO: per-route head metadata, sitemap.xml, robots.txt, JSON-LD

### Auth
- Email/password + Google OAuth via Lovable broker
- Password reset flow (`/reset-password`)
- `_authenticated` route gate (integration-managed, `ssr: false`)
- Roles table (`user_roles`) with `has_role` / `is_admin` security-definer RPCs
- First-admin claim RPC (`claim_first_admin`)

### Admin Panel (`/admin/*`)
- Dashboard, Products (+ variants, media), Categories, Brands
- Inventory, Warehouses, Suppliers, Purchase Orders, Stock movements
- Orders (fulfillment, tracking, partial refunds, event history)
- Customers, Customer Groups, Reviews, Q&A, Returns
- Coupons, Flash Sales, Taxes, Shipping (zones/rates/methods)
- Payments (gateway configuration incl. mock, Stripe placeholder, PayPal placeholder, COD, Bank transfer)
- CMS: Pages, Blog, FAQs, Home Sections, Banners, Popups, Menus
- Media library (Supabase Storage: `media` bucket)
- Settings (site, currency, brand — read via `useSiteSettings`)
- Contact submissions, Newsletter campaigns/subscribers, Email templates
- Webhooks, API keys, Audit logs

### Platform / Infra
- Server functions for all writes (RLS-scoped via `requireSupabaseAuth`)
- Atomic RPCs: `decrement_stock`, `restock_items`, `hit_rate_limit`
- Order-event trigger auto-logs status & payment transitions
- Rate limiting table + RPC (per-bucket, per-key sliding window)
- Audit logs table + admin viewer
- Modular payment adapter (`src/lib/payments.ts`) — swap providers with one file
- Site-wide currency/format helpers (`useFormatMoney`)
- Dynamic settings — no hardcoded business rules

## 2. Remaining Optional Enhancements
- Real Stripe / PayPal adapters (architecture ready, credentials required)
- Transactional email delivery (templates exist; needs verified sending domain)
- CSV product bulk import/export UI
- Full-text product search (currently ILIKE-based)
- Faceted attribute filtering driven by category attributes
- Multi-language / i18n
- Advanced analytics dashboards (currently basic reports)
- PWA / offline cart
- Automated backups & staging environment

## 3. Deployment Checklist
- [ ] Set site name, currency, and contact email in Admin → Settings
- [ ] Configure at least one shipping zone + rate
- [ ] Configure at least one tax rate (or mark tax-inclusive)
- [ ] Enable at least one payment method (mock for staging, real for prod)
- [ ] Seed categories, brands, and initial products
- [ ] Configure Google OAuth in Cloud auth settings
- [ ] Verify email sending domain for transactional emails
- [ ] Set og:image / social preview assets
- [ ] Publish and connect custom domain
- [ ] Run security scan; resolve any critical findings
- [ ] Enable HIBP leaked-password check
- [ ] Confirm RLS on every public table (already enabled)
- [ ] Claim first admin via `claim_first_admin` RPC after signup

## 4. Required Environment Variables
Managed automatically by Lovable Cloud:
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `LOVABLE_API_KEY` (AI Gateway)

Add when going live:
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (when enabling real Stripe)
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (when enabling PayPal)
- `RESEND_API_KEY` or equivalent (transactional email)

## 5. Database Migration Summary
- Core commerce: `products`, `product_variants`, `categories`, `brands`, `media_assets`
- Orders: `orders`, `order_items`, `order_events`, `shipments`, `return_requests`
- Inventory: `stock_movements`, `warehouses`, `suppliers`, `purchase_orders`, `inventory_transfers`
- Customers: `profiles`, `user_roles`, `addresses`, `customer_groups`, `wishlists`, `cart_items`
- Promotions: `coupons`, `coupon_usages`, `flash_sales`
- Shipping/Tax: `shipping_zones`, `shipping_rates`, `shipping_methods`, `tax_rates`
- Payments: `payment_methods`
- Content: `pages`, `blog_posts`, `blog_categories`, `faqs`, `home_sections`, `banners`, `popups`, `menu_items`
- Engagement: `reviews`, `product_questions`, `contact_submissions`, `newsletter_subscribers`, `newsletter_campaigns`, `email_templates`
- Ops: `activity_logs`, `audit_logs`, `notifications`, `api_keys`, `webhooks`, `rate_limits`, `site_settings`
- RPCs: `has_role`, `is_admin`, `handle_new_user`, `claim_first_admin`, `admin_status`, `decrement_stock`, `restock_items`, `hit_rate_limit`, `log_order_event`, `tg_updated_at`

All public tables have RLS enabled with role-scoped policies and explicit GRANTs.

## 6. Third-Party Integrations
- **Lovable Cloud (Supabase)** — DB, auth, storage, RLS
- **Lovable AI Gateway** — future AI features (recommendations, content gen)
- **Google OAuth** — via Lovable auth broker
- **Stripe / PayPal** — architecture ready, adapter swap required
- **Resend / SendGrid** — pluggable for transactional email
- **Cloudflare** — hosting runtime (Workers)

## 7. Known Limitations
- Payments run through a mock adapter until real credentials are provided
- Transactional emails require a verified sending domain
- Product search is ILIKE-based (fine up to ~50k products; add tsvector index for scale)
- No multi-currency conversion — single store currency per deployment
- Realtime inventory updates rely on refetch; websockets not wired
- Reports are aggregate SQL views; no BI/warehouse export yet
- Some admin CRUD screens use the generic `simple-crud` component — sufficient for config data but not tuned for bulk editing

## 8. Recommended Future Roadmap
1. Wire real Stripe (Payment Intents + webhook) once account is available
2. Enable transactional email via Resend + templated events
3. Product CSV import/export
4. Full-text search (Postgres `tsvector` + GIN)
5. Multi-warehouse fulfillment routing
6. Loyalty / store credit system
7. B2B pricing tiers per customer group
8. Mobile app (React Native) reusing server functions
9. AI: recommendations, description generation, review summarization
10. Advanced BI dashboards + scheduled exports

## 9. Architecture Overview
- **Framework:** TanStack Start v1 (React 19, Vite 7, SSR on Cloudflare Workers)
- **Styling:** Tailwind v4 + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Postgres + RLS + Storage + Auth
- **Data path:**
  - Reads: `useSuspenseQuery` + `ensureQueryData` in loaders
  - Writes: `createServerFn` + `requireSupabaseAuth` middleware
  - Public webhooks: `/api/public/*` routes (signature-verified)
- **Auth:** `_authenticated/` layout (`ssr:false`) gates admin/account
- **Payments:** provider-agnostic adapter (`src/lib/payments.ts`)
- **Money/format:** driven by `site_settings` + `useFormatMoney`
- **Order integrity:** server-side quoting, atomic stock RPCs, trigger-based event log

The platform is production-ready pending payment/email credentials.
