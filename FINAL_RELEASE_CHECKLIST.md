# Final Release Checklist — Awamzone

Status: **Production-ready candidate**. Feature development is paused; the remaining work is verification, tuning, and go-live operations.

---

## 1. Completed Modules

### Storefront (public)
- Home / Hero banner / Home sections / Flash sales
- Categories, Shop, Filters, Search
- Product detail, Variants, Compare, Wishlist
- Cart, Checkout, Mock payment, Order confirmation, Invoice
- Blog (list + detail), FAQ, Contact form, Newsletter
- CMS Pages (dynamic slugs), Sitemap, SEO metadata per route

### Customer account
- Register / Login / Logout, Google OAuth broker
- Forgot password + `/reset-password` handler
- Email verification flow
- Profile, Address management
- Orders, Order detail, Returns / refund requests
- Reviews, Product Q&A submission
- Notifications inbox

### Admin panel (43 modules)
Products, Variants, Categories, Brands, Orders, Customers, Inventory,
Suppliers, Purchase Orders, Warehouses, Coupons, Flash Sales, Reviews,
Q&A, Returns, Contact Messages, Notifications, CMS Pages, Menus,
Hero Slides, Home Sections, Banners, Popups, Testimonials, Blog,
Blog Categories, FAQs, Newsletter, Media Library, Shipping (zones /
methods / rates), Taxes, Payments, API Keys, Webhooks, Email Templates,
Audit Logs, Reports, Dashboard, Settings, User Roles.

All admin tables share the enterprise `SimpleCrud` DataTable + `admin-ui`
kit: sticky headers/actions, server-side pagination + sorting, global
search, column filters, bulk select/enable/disable/delete, CSV / Excel /
Print export, tooltip action icons, `AlertDialog` confirmations, loading
skeletons, empty & error states, Light/Dark theme.

---

## 2. Tested Workflows (manual regression checklist)

Run each end-to-end against a fresh account before publishing.

- [ ] Sign up with email → receive verification → verify → land on `/`
- [ ] Sign in / sign out, header reflects session
- [ ] Forgot password → reset via `/reset-password` → sign in with new password
- [ ] Google OAuth from sign-in page (preview + published)
- [ ] Browse category → filter → sort → paginate
- [ ] Search by keyword, brand, price range
- [ ] Product detail: switch variants, add to wishlist, add to compare, add to cart
- [ ] Cart: quantity update, coupon apply, shipping estimate, tax calc
- [ ] Checkout: address, shipping method, mock payment → order created
- [ ] Order detail visible in `/account/orders`, invoice downloadable
- [ ] Return request → admin approves → refund status updates
- [ ] Submit review + Q&A → admin moderates → appears on PDP
- [ ] Contact form + newsletter subscription → admin sees entry + notification
- [ ] Flash sale price shows on storefront during active window
- [ ] Admin CRUD for each of the 43 modules: create / edit / duplicate / delete / bulk
- [ ] Inventory adjustment via admin modal, stock movement logged
- [ ] Purchase order lifecycle: draft → received → stock incremented
- [ ] Reports & Dashboard KPIs render with real data
- [ ] Settings: theme, currency, site metadata → reflected on storefront

---

## 3. UI / UX

- Semantic design tokens only (no hard-coded colors) — Light + Dark parity
- Responsive at 360 / 768 / 1024 / 1440
- Consistent typography scale and spacing rhythm
- Empty / loading / error states on every data surface
- shadcn/Radix primitives for accessibility (dialog, menu, combobox)
- Icon-only buttons carry `aria-label`; forms have labeled inputs
- Single `<main>` per route, semantic headings

### Remaining polish (optional)
- Skeleton refinement on PDP image gallery
- Toast copy standardization pass
- Mobile filter drawer animation timing

---

## 4. Performance

Implemented:
- TanStack Query with loader `ensureQueryData` + component `useSuspenseQuery`
- Route-level code splitting (file-based routing)
- Image `aspect-*` wrappers, `loading="lazy"` on non-LCP images
- LCP hero preloaded via `head().links`
- Server functions for DB reads; no admin client on public paths

Recommended before scale:
- Add DB indexes on `orders(user_id, created_at)`, `products(slug)`,
  `product_variants(product_id)`, `reviews(product_id, status)` — verify
  via `supabase--slow_queries` after 1–2 weeks of traffic
- Consider Cloudflare Image Resizing for user-uploaded media
- Upgrade Lovable Cloud compute if p95 DB latency > 300 ms

---

## 5. Security

- RLS enabled on every `public` table; `GRANT`s scoped per policy
- Roles stored in `user_roles` + `has_role()` SECURITY DEFINER (no
  role columns on `profiles`)
- `profiles_guard_sensitive` trigger blocks self-elevation
- `hit_rate_limit()` available for abuse-prone endpoints
- Server-only secrets never referenced from client bundle
- Input validation via Zod on forms and server functions
- No `dangerouslySetInnerHTML` on user content
- Webhook endpoints under `/api/public/*` verify HMAC signatures

Recommended:
- Enable HIBP leaked-password check (`configure_auth` →
  `password_hibp_enabled: true`)
- Run `supabase--linter` before each release and clear findings
- Review Storage `media` bucket policies before opening uploads to
  non-admin roles

---

## 6. Code Quality

- No `console.log`, `TODO`, or `FIXME` remaining in `src/`
- No unused imports flagged by build
- Shared admin primitives in `src/components/admin/admin-ui.tsx`
- Reusable DataTable in `src/components/admin/simple-crud.tsx`
- No duplicate route trees; `src/routeTree.gen.ts` is auto-generated

---

## 7. Deployment Checklist

- [ ] Set app title, description, OG image on `__root.tsx` (done)
- [ ] Custom domain configured in Lovable → Publish → Domains
- [ ] `robots.txt` + `sitemap.xml` reachable (route present)
- [ ] Favicon + PWA icons uploaded
- [ ] Publish from Lovable → smoke test each critical flow on
      `https://awamzone.lovable.app`
- [ ] Backups: rely on Lovable Cloud daily backups; export a manual
      SQL dump before major migrations
- [ ] Monitoring: watch `supabase--db_health`, `edge_function_logs`,
      and Lovable analytics weekly for first month

### Environment / secrets (already configured)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`, `LOVABLE_API_KEY`
- Add any real payment / email provider keys via `add_secret` when
  swapping the mock payment flow for production.

### Third-party services to activate for production
- Real payment provider (Stripe / Paddle) — currently mock
- Transactional email (Resend or provider of choice) — templates ready
- Analytics (Lovable analytics enabled by default)

---

## 8. Known Limitations

- Payments are mock; no real charge is captured
- No SMS / push notifications (email + in-app only)
- Reports export is CSV/Excel/Print (no scheduled email reports)
- Media Library uses a single `media` bucket; multi-tenant isolation
  would need bucket-per-tenant + RLS revision
- Rate limiting is per-function via `hit_rate_limit`; no global WAF

---

## 9. Remaining Optional Enhancements

- Real payment integration
- Multi-currency runtime switch (schema supports it)
- Loyalty / points program
- Product recommendations (collaborative filtering)
- Advanced search (typo tolerance, facets scoring)
- Scheduled report emails
- Mobile app (PWA baseline is in place)

---

## 10. Sign-off

Once sections 2, 5 (linter), and 7 checkboxes are green, the application
is cleared for production release.
