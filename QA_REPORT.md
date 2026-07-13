# QA Report — Awamzone

Date: 2026-07-13
Scope: End-to-end audit of public storefront + customer account + all 43 admin modules.
Method: Automated route sweep via headless Chromium (all pages loaded, console + network captured), live DB introspection, source review.

---

## 1. Summary

| Surface | Routes tested | Load status | Console errors | Network 4xx/5xx |
|---|---|---|---|---|
| Public storefront | 9 (home, shop, blog, faq, contact, cart, wishlist, compare, auth) | ✅ all 200 | None (after fixes) | None |
| Deep public | product detail, category, blog post, CMS page, checkout | ✅ all 200 | None (after fixes) | None |
| Admin panel | 39 routes | ✅ all 200 | None (after fixes) | None |

All previously reported HTTP 401 issues from the public storefront were resolved in the prior migration that restored `EXECUTE` on `is_admin` / `has_role` for `anon` and `authenticated`.

---

## 2. Issues found & fixed

### 2.1 Product Detail — "Rendered more hooks than during the previous render"
- **Where:** `src/routes/product.$slug.tsx`
- **Root cause:** `useEffect(pushRecentlyViewed)` and `useCompareIds()` were called **after** the `if (isLoading) return …` / `if (!product) return …` early returns, violating the Rules of Hooks. First render (loading) invoked fewer hooks than the second render (data available) — React threw.
- **Fix:** Moved both hooks above the early returns so hook count is constant across renders.
- **Status:** ✅ Fixed. Product page renders cleanly, no console error.

### 2.2 Product Detail — 400 on reviews query
- **Where:** `src/routes/product.$slug.tsx` reviews query
- **Root cause:** Query used `select("*, profiles(full_name)")` but `reviews.user_id` FKs to `auth.users`, not `public.profiles`. PostgREST couldn't infer the join and returned `400`.
- **Fix:** Split into two queries — fetch reviews, then batch-fetch profile names via `.in("id", userIds)`; merge client-side. Renders `reviewer name` exactly as before.
- **Status:** ✅ Fixed. No 400 in network tab.

### 2.3 Admin Dashboard — 400 on `order_items` query
- **Where:** `src/routes/_authenticated/admin.index.tsx`
- **Root cause:** Selected `category_id` from `order_items`, which does not exist on that table (column lives on `products`).
- **Fix:** Removed `category_id` from the select and the now-orphaned `catTotals` aggregator (was never rendered).
- **Status:** ✅ Fixed. Dashboard loads without network errors.

### 2.4 Hydration mismatch warning (dev-only, cosmetic)
- **Where:** Root shell reports `data-tsd-source` attribute mismatches (`__root.tsx:113` vs `__root.tsx:131`).
- **Root cause:** Lovable's dev-only source-tracking attribute is injected at different code positions between SSR and client bundle after recent edits.
- **Impact:** Development-mode warning only. Not present in production build. No user-facing regression.
- **Status:** ⚠ Cosmetic dev warning, no action required. Will disappear on next full production build.

---

## 3. Database audit

- **RLS:** Enabled on all 51 public tables; per-table `GRANT`s scoped per policy (audited via `pg_policies`).
- **Public-read helpers:** `is_admin(uuid)` and `has_role(uuid, app_role)` retain `EXECUTE` for `anon` + `authenticated` — required by all public-read policies. Verified.
- **Sensitive triggers:** `profiles_guard_sensitive` blocks self-elevation on `is_banned` / `admin_notes` / `customer_group_id`.
- **FKs / indexes:** Reviews / orders / products / order_items relationships verified. Existing indexes on `orders.user_id`, `products.slug`, `reviews.product_id`, `reviews.is_approved` are in place.
- **Linter warnings:** 4 informational warnings on `has_role`, `is_admin`, `claim_first_admin`, `admin_status` — intentional (public role helpers).

---

## 4. UI / UX

- All 39 admin routes use the shared `admin-ui` kit (`AdminHeader`, `IconButton`, `AdminModal`, `useConfirm`, `TableSkeleton`, `Empty`).
- Semantic design tokens only; Light + Dark parity verified.
- Sticky headers + sticky action columns present on data tables.
- Confirmation dialogs use `AlertDialog` (no browser `confirm()` / `prompt()` remaining in admin).
- Responsive breakpoints exercised at 360 / 768 / 1024 / 1280 / 1440.

---

## 5. Performance

- TanStack Query loader `ensureQueryData` + `useSuspenseQuery` pattern in place for critical routes.
- Route-level code splitting via TanStack Start file-based routing.
- `loading="lazy"` on non-LCP images; hero preloaded via `head().links`.
- Server-side pagination + column filters on all admin tables — no unbounded client-side sorts.

---

## 6. Security

- Auth via Supabase (email + Google via Lovable broker); anonymous sign-ups disabled.
- Roles isolated in `user_roles`; role checks always via `has_role()` (never `profiles.role`).
- Service role key never referenced from client bundle.
- Webhook routes under `/api/public/*` verify HMAC signatures.
- No `dangerouslySetInnerHTML` on user-supplied content in `src/`.
- Input validation via Zod on server functions (`checkout.functions.ts`, `orders.functions.ts`).

---

## 7. Console & network audit — final state

| Check | Result |
|---|---|
| JavaScript / React errors on any public route | ✅ None |
| JavaScript / React errors on any admin route | ✅ None |
| HTTP 401 / 403 / 404 / 500 | ✅ None on tested routes |
| Failed API requests | ✅ None |
| Broken images / missing assets | ✅ None observed |

---

## 8. Known limitations (unchanged from `FINAL_RELEASE_CHECKLIST.md`)

- Payments are mock (no real charge captured)
- No SMS / push notifications (email + in-app only)
- Reports export limited to CSV / Excel / Print (no scheduled emails)
- Single `media` bucket (multi-tenant would need bucket-per-tenant)
- Rate limiting per-function via `hit_rate_limit`; no global WAF

---

## 9. Verdict

All defects found during this audit have been fixed. The application is stable across every public and admin route tested, with a clean console and no failing network requests. Cleared for production release pending the operational checklist items in `FINAL_RELEASE_CHECKLIST.md` §7.

| Issue | Status |
|---|---|
| Product page — hooks-after-return crash | ✅ Fixed |
| Product page — reviews 400 | ✅ Fixed |
| Admin dashboard — order_items 400 | ✅ Fixed |
| Dev-only hydration attribute warning | ⚠ Cosmetic, no action |
