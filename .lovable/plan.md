## Continuation Roadmap (Phase 2 → Phase 8)

Each phase ends in a working, testable state. I'll ship them sequentially, starting Phase 2 immediately after you approve.

### Phase 2 — Media, Variants, Inventory (starting now)
- Supabase Storage buckets: `product-media`, `site-media`, `cms-media` (public read, admin write)
- **Media Manager**: upload, folders (virtual via path prefix), rename, delete, copy URL, pick-from-library dialog reused everywhere
- **Product Variants UI**: option types (size/color/…), option values, auto-generate variant matrix, per-variant price/stock/SKU/image
- **Inventory**: stock adjustments log table, low-stock threshold, out-of-stock badge, inventory report page
- Image uploader wired into products, categories, brands, banners, home sections, CMS pages

### Phase 3 — Commerce Engine
- Coupons & discount engine (percent/fixed/BOGO/free-shipping, min-cart, usage limits, per-user limits, product/category scoping, schedules)
- Flash Sales + Deal of the Day (scheduled price overrides)
- Shipping Zones & Rules (country/region, weight/price tiers, free-shipping threshold)
- Tax rules (per zone / per category)
- Real Stripe checkout (Lovable-managed), COD, Bank Transfer, PayPal-ready adapter interface
- Payment methods admin (enable/disable, per-method config)

### Phase 4 — Customer Experience
- Product Compare, Recently Viewed, Related Products, Frequently Bought Together
- Reviews moderation queue
- Wishlist polish, address book, order history detail, reorder
- Customer management screens (list, detail, orders, spend, notes, ban)

### Phase 5 — Fulfillment & Documents
- Order state machine (pending → paid → processing → shipped → delivered → returned)
- Returns & Refunds workflow
- Invoice PDF, Packing Slip, Shipping Label (react-pdf, all templated & brandable)
- Email templates (transactional) via Lovable managed email + SMTP override option
- Notification center (in-app + email triggers)

### Phase 6 — Content & Marketing
- Blog (posts, categories, tags, author, SEO fields)
- FAQ manager, Contact form manager (submissions inbox)
- Newsletter (subscribers export, campaign compose, send via Lovable email)
- Header Builder, Footer Builder, Dynamic Menus (already partial), Theme Customizer (colors/typography/radius live to CSS vars)
- Maintenance Mode toggle

### Phase 7 — SEO, Analytics, Integrations
- XML sitemap route, robots.txt manager, JSON-LD schema per page type
- GA4, GTM, Meta Pixel, TikTok Pixel, Search Console verification — all pasted from admin, injected in `<head>`
- Analytics dashboard (sales/inventory/customer/tax reports with charts, CSV export)

### Phase 8 — Platform Hardening
- Roles & granular permissions (admin, staff, manager, editor, customer) with permission matrix
- Audit logs (who changed what) + Activity logs (customer actions)
- CSV bulk import/export for products, customers, orders
- Webhooks (outgoing: order.created, order.paid, …) + REST API keys
- Backup/restore (SQL export via Cloud → Export)
- Image optimization (responsive srcset, lazy, blur placeholders), perf audit, security scan pass

### Technical Notes (for reference)
- All new tables follow the RLS + GRANT pattern; admin-only writes via `has_role(auth.uid(),'admin')`.
- Payment gateways use a common `PaymentAdapter` interface so adding providers is drop-in.
- PDFs render server-side via `createServerFn` returning a signed URL to a generated file in storage.
- Pixel/tag scripts inject through `__root.tsx` head, reading from `site_settings` singleton.
- Media Manager is a single reusable `<MediaPicker />` component backed by a `media_assets` table indexing storage objects.

I'll start Phase 2 (Media + Variants + Inventory) immediately on approval.