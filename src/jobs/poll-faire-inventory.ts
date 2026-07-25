import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../modules/faire"
import FaireModuleService from "../modules/faire/service"

/**
 * Scheduled job that syncs Medusa stock levels to Faire.
 *
 * WHY A JOB (and not a subscriber): Medusa V2's Inventory Module does not emit
 * any event when stock quantities change (no `inventory-level.updated` event
 * exists, and updateInventoryLevelsWorkflow emits nothing). Polling is therefore
 * the only reliable way to mirror inventory changes to Faire.
 *
 * HOW: In Medusa V2 stock lives on the Inventory Module, not on the variant.
 * We read `inventory_item.location_levels.stocked_quantity` (summed across
 * locations) and match to Faire variants by SKU via the batch by-skus endpoint.
 */
export default async function pollFaireInventory(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const faireService = container.resolve<FaireModuleService>(FAIRE_MODULE)

  try {
    logger.info("[Faire Inventory] Starting inventory sync...")

    // Read all inventory items with their per-location stock.
    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: [
        "id",
        "sku",
        "location_levels.stocked_quantity",
      ],
    })

    // Sum stocked_quantity across all locations, keyed by SKU.
    const bySku = new Map<string, number>()
    for (const item of inventoryItems as any[]) {
      if (!item.sku) continue
      const total = (item.location_levels ?? []).reduce(
        (sum: number, lvl: any) => sum + (lvl.stocked_quantity ?? 0),
        0
      )
      bySku.set(item.sku, (bySku.get(item.sku) ?? 0) + total)
    }

    if (bySku.size === 0) {
      logger.info("[Faire Inventory] No SKUs to sync.")
      return
    }

    const items = Array.from(bySku.entries()).map(([sku, onHandQuantity]) => ({
      sku,
      onHandQuantity,
    }))

    const { updated, errors } = await faireService.updateFaireInventoryBySkus(
      items
    )

    logger.info(
      `[Faire Inventory] Complete — synced: ${updated}, errors: ${errors}`
    )
  } catch (error: any) {
    logger.error(
      `[Faire Inventory] Failed to sync inventory: ${error.message}`
    )
  }
}

export const config = {
  name: "poll-faire-inventory",
  schedule: "*/10 * * * *", // Every 10 minutes
}
