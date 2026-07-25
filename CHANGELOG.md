# Changelog

## [1.0.0] - 2026-07-25

Verified against Faire External API v2 (live docs) and Medusa v2.17.1 source.

### 🚨 Breaking Changes / Behavior
- **Price units corrected (100× fix).** Medusa V2 stores `prices.amount` in **major units**
  (e.g. `25` = `$25.00`), NOT cents. Prices are now multiplied by 100 for Faire's
  `amount_minor`. This reverses the incorrect v0.1.0 change that removed the `×100` and
  caused products to be pushed to Faire at 1/100th of their real price.
- **Inventory sync moved from a (non-existent) event to a scheduled job.** Medusa V2 does
  **not** emit any inventory event (`inventory.inventory-level.updated` is defined but
  disabled — see Medusa TODO #14478), so the old `inventory-level.updated` subscriber never
  fired. Replaced by `poll-faire-inventory` (every 10 min), reading
  `inventory_item.location_levels.stocked_quantity` and pushing via batched
  `PATCH /product-inventory/by-skus`.

### ✨ New Features
- **Auto-create on `product.created`** — new Medusa products are now created on Faire in real
  time (previously only the manual bulk-sync button created products).
- **Variant change sync** — `product-variant.updated` subscriber mirrors SKU/price/option
  changes to Faire.
- **OAuth auth support** — new `faire_app_credentials` option sends
  `X-FAIRE-OAUTH-ACCESS-TOKEN` + `X-FAIRE-APP-CREDENTIALS` (v2 OAuth apps); falls back to the
  legacy `X-FAIRE-ACCESS-TOKEN` header when omitted.
- **Batch inventory push** — `updateFaireInventoryBySkus` sends up to 50 SKUs per request.

### 🐛 Bug Fixes
- **`_skip_faire_sync` flag was permanent** — it was written to product metadata and never
  cleared. Because Medusa *merges* metadata, it persisted forever and silently blocked **all**
  future `product.updated` syncs after the first sync. Removed entirely (the update subscriber
  is idempotent and never writes metadata, so no loop exists).
- **Wholesale % ignored on real-time updates** — the `product.updated` subscriber called
  `updateFaireProduct` without the percentage, defaulting to a hardcoded 50%. It now reads the
  configured value from the DB (`getWholesalePercent()`).
- **Order import fetched wrong orders** — `GET /orders` has no `states` param (only
  `excluded_states`), so `states=NEW` was ignored and non-NEW orders could be imported. Now
  filtered client-side by `state === "NEW"`.
- **`available_quantity: 0` marked variants out of stock** — variant create no longer sends a
  `0` from the unreliable `variants.inventory_quantity`; stock is owned by the inventory job.

## [0.3.0] - 2026-06-05

### ⬆️ Dependencies
- Upgraded all `@medusajs/*` core packages from `2.13.1` → `2.15.5`
- Upgraded `@medusajs/ui` from `4.0.21` → `4.1.15`
- Updated peer dependency minimum from `>=2.4.0` → `>=2.10.0`
- Updated `@medusajs/ui` peer dependency minimum from `>=4.0.3` → `>=4.0.10`

## [0.1.0] - 2026-03-06

### 🚨 Breaking Changes
- Renamed `updateFaireInventory` → `updateFaireInventoryBySku` (correct API field)
- Changed inventory API payload from `quantity_available` to `on_hand_quantity` (Faire V2)
- Removed `* 100` price multiplication (Medusa V2 prices are already in cents)

### ✨ New Features
- **Product Update Sync** — `updateFaireProduct` method via `PATCH /products/<ID>`
- **Product Delete Sync** — `deleteFaireProduct` method via `DELETE /products/<ID>`
- **Dynamic Options** — product options (Size, Color, etc.) are read from Medusa product options, no longer hardcoded as "Size"
- **Lifecycle State Sync** — `product.updated` subscriber syncs status changes in real-time (published/draft/unpublished)
- **Product Delete Subscriber** — `product.deleted` event triggers Faire product deletion
- **Order Import** — polls Faire for `NEW` orders every 5 minutes, creates draft orders in Medusa
- **Manual Order Import** — `POST /admin/faire/orders` endpoint
- **Faire Retailer Lookup** — fetches retailer name/email from Faire API for imported orders
- **Admin UI Redesign** — product sync + order import buttons with result badges
- **Country Code Converter** — ISO alpha-3 (Faire) → alpha-2 (Medusa) for 50+ countries
- **Faire ID Tracking** — stores `faire_product_id`, `faire_variant_map`, `faire_order_id` in metadata

### 🐛 Bug Fixes
- **Options hardcoded "Size"** — all products got "Size" option regardless of actual Medusa options
- **Inventory hardcoded = 10** — `available_quantity` was always 10 instead of reading from Medusa
- **Wholesale price hardcoded 50%** — now configurable via `wholesalePercent` parameter
- **Price × 100 wrong** — Medusa V2 prices are already in smallest unit (cents), removed extra multiplication that caused 100x pricing
- **No `faire_product_id` tracking** — only stored `synced_to_faire: true`, making updates/deletes impossible
- **`product.updated` subscriber inactive** — was commented out, now fully functional
- **Inventory API field wrong** — used deprecated `quantity_available` instead of V2 `on_hand_quantity`
- **`inventory-sku.updated` event doesn't exist** — changed to Medusa core event `inventory-level.updated`
- **Subscriber loop** — sync workflow updating metadata triggered `product.updated` subscriber causing redundant Faire API calls; fixed with `_skip_faire_sync` guard flag
- **Variant ID lookup wrong** — `updateFaireProduct` looked for `variant.metadata.faire_variant_id` (doesn't exist), fixed to read from `product.metadata.faire_variant_map`

### 📝 Other
- Full TypeScript types for Faire API entities (Product, Variant, Order, Inventory)
- Proper error logging with `[Faire ${method}]` prefix
- Axios client timeout set to 30s (was unlimited)

## [0.0.6] - Previous

- Initial implementation with basic product creation on Faire
- Manual sync button in Admin UI
- Inventory update by SKU (deprecated API fields)
