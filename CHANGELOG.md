# Changelog

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
