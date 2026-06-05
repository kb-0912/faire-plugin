import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../modules/faire"
import FaireModuleService from "../modules/faire/service"

/**
 * Handles inventory level changes in Medusa.
 * Syncs the updated inventory to Faire using the variant's SKU.
 *
 * Listens to the Medusa core event "inventory-level.updated" which fires
 * when stock quantities change.
 */
export default async function handleInventoryUpdated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const faireService =
    container.resolve<FaireModuleService>(FAIRE_MODULE)

  try {
    const inventoryService = container.resolve(Modules.INVENTORY)

    // Fetch the inventory level to get location/item details
    const inventoryLevel = await inventoryService.retrieveInventoryLevel(
      data.id
    )

    if (!inventoryLevel) {
      logger.warn(
        `[Faire Inventory] Inventory level ${data.id} not found`
      )
      return
    }

    // Fetch the inventory item to get the SKU
    const inventoryItem = await inventoryService.retrieveInventoryItem(
      inventoryLevel.inventory_item_id
    )

    if (!inventoryItem?.sku) {
      logger.debug(
        `[Faire Inventory] No SKU for inventory item ${inventoryLevel.inventory_item_id}, skipping`
      )
      return
    }

    const onHandQuantity = inventoryLevel.stocked_quantity ?? 0

    await faireService.updateFaireInventoryBySku(
      inventoryItem.sku,
      onHandQuantity
    )

    logger.info(
      `[Faire Inventory] Updated SKU "${inventoryItem.sku}" → quantity: ${onHandQuantity}`
    )
  } catch (error: any) {
    logger.error(
      `[Faire Inventory] Failed to sync inventory ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "inventory-level.updated",
}