# @kb0912/faire-plugin

Medusa V2 plugin for **bidirectional sync** between [MedusaJS](https://medusajs.com) and [Faire](https://www.faire.com) wholesale marketplace.

## Features

### 🔄 Product Sync (Medusa → Faire)

- **Auto-create** products on Faire when synced from Medusa
- **Auto-update** existing Faire products when changed in Medusa (name, description, images, price)
- **Dynamic options mapping** — product options (Size, Color, etc.) are read from Medusa, not hardcoded
- **Idempotent** — uses `idempotence_token` to prevent duplicate products on Faire
- **Tracks Faire IDs** — stores `faire_product_id` and `faire_variant_map` in product metadata for future updates

### 📦 Lifecycle State Sync

- Medusa `published` → Faire `PUBLISHED`
- Medusa `draft` → Faire `DRAFT`
- Medusa delete → Faire `DELETE`
- Real-time via `product.updated` and `product.deleted` event subscribers

### 📊 Inventory Sync

- Listens to Medusa `inventory-level.updated` events
- Syncs `stocked_quantity` (on-hand) to Faire via SKU matching
- Uses Faire V2 API field `on_hand_quantity`

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
      },
    },
  ],
})
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FAIRE_API_KEY` | ✅ | Your Faire API access token ([get it here](https://faire.github.io/external-api-v2-docs#using-oauth)) |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/admin/faire/sync` | Trigger product sync to Faire |
| `POST` | `/admin/faire/orders` | Trigger order import from Faire |

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
