# @kb0912/faire-plugin

Medusa V2 plugin for **bidirectional sync** between [MedusaJS](https://medusajs.com) and [Faire](https://www.faire.com) wholesale marketplace.

## Features

### 🔄 Product Sync (Medusa → Faire)

- **Auto-create** on Faire in real time via the `product.created` subscriber (Medusa is the single source of truth)
- **Auto-update** existing Faire products on `product.updated` / `product-variant.updated` (name, description, status, images, price, SKUs, options)
- **Bulk sync** button in Admin creates any missing products and updates the rest
- **Dynamic options mapping** — product options (Size, Color, etc.) are read from Medusa, not hardcoded
- **Idempotent** — uses `idempotence_token` to prevent duplicate products on Faire
- **Tracks Faire IDs** — stores `faire_product_id` and `faire_variant_map` in product metadata for future updates

### 📦 Lifecycle State Sync

- Medusa `published` → Faire `PUBLISHED`
- Medusa `draft` → Faire `DRAFT`
- Medusa delete → Faire `DELETE`
- Real-time via `product.updated` and `product.deleted` event subscribers

### 📊 Inventory Sync

- **Scheduled poll job** (`poll-faire-inventory`, every 10 min) — Medusa V2's Inventory
  Module emits **no** stock-change event, so inventory is synced by polling, not a subscriber
- Reads `inventory_item.location_levels.stocked_quantity` (summed across locations), matched by SKU
- Pushes to Faire via the batched `PATCH /product-inventory/by-skus` endpoint (`on_hand_quantity`)

### 🛒 Order Import (Faire → Medusa)

- **Polls Faire API** every 5 minutes for new orders (`state=NEW`)
- Creates **draft orders** in Medusa (status `pending`) for manual review
- Deduplicates via `faire_order_id` in order metadata
- Fetches retailer info from Faire for customer details
- Manual import trigger available via Admin UI or API

### 🖥️ Admin UI

- **Faire page** in Medusa Admin with:
  - "Sync Products to Faire" button with result badges (created/updated/errors)
  - "Import Orders from Faire" button with result badges (imported/skipped/errors)
  - Info section explaining sync behavior

## Installation

```bash
npm install @kb0912/faire-plugin
# or
yarn add @kb0912/faire-plugin
```

## Configuration

Add the plugin to your `medusa-config.ts`:

```ts
module.exports = defineConfig({
  // ...
  plugins: [
    {
      resolve: "@kb0912/faire-plugin",
      options: {
        faire_api_key: process.env.FAIRE_API_KEY,
        // Required only for Faire OAuth apps (sends X-FAIRE-OAUTH-ACCESS-TOKEN
        // + X-FAIRE-APP-CREDENTIALS). Omit for legacy single-brand tokens.
        faire_app_credentials: process.env.FAIRE_APP_CREDENTIALS,
        // Wholesale price as a % of the Medusa USD retail price (default 50).
        // Can also be changed at runtime from the Admin "Faire" page.
        wholesale_price_percentage: 50,
      },
    },
  ],
})
```

### Options

| Option | Required | Description |
|--------|----------|-------------|
| `faire_api_key` | ✅ | Your Faire API access token. For **OAuth apps** this is the OAuth access token; for legacy brand integrations it is the brand token. |
| `faire_app_credentials` | ⛳️ | Required **only for OAuth apps**. When set, requests use `X-FAIRE-OAUTH-ACCESS-TOKEN` + `X-FAIRE-APP-CREDENTIALS`. When omitted, the legacy `X-FAIRE-ACCESS-TOKEN` header is used. |
| `wholesale_price_percentage` | — | Wholesale price as a % of retail (default `50`). |

> **Pricing note:** Medusa V2 stores variant prices in **major units** (e.g. `25` = `$25.00`).
> The plugin converts to Faire's `amount_minor` (cents) automatically. Only the Medusa **USD**
> price is used as retail; wholesale = retail × `wholesale_price_percentage`.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/admin/faire/sync` | Trigger product sync to Faire |
| `POST` | `/admin/faire/orders` | Trigger order import from Faire |
| `POST` | `/admin/faire/reset` | Delete linked products on Faire + clear Faire metadata (body `{ product_ids?: string[] }`, omit = all), then re-run sync to re-create |

## Data Mapping

### Product Metadata (Medusa → Faire)

| Metadata Key | Description |
|---|---|
| `faire_product_id` | Faire product ID (e.g. `p_xxx`) |
| `faire_variant_map` | JSON map: `{medusa_variant_id: faire_variant_id}` |
| `synced_to_faire` | Boolean flag |

### Order Metadata (Faire → Medusa)

| Metadata Key | Description |
|---|---|
| `faire_order_id` | Faire order ID (e.g. `bo_xxx`) |
| `faire_display_id` | Human-readable Faire order ID |
| `faire_retailer_id` | Faire retailer/buyer ID |
| `faire_retailer_name` | Retailer company name |
| `faire_source` | Order source (e.g. `MARKETPLACE`) |
| `faire_notes` | Buyer notes |
| `faire_purchase_order_number` | PO number |

## Compatibility

- Medusa V2 >= 2.4.0
- Faire External API V2

## License

MIT
