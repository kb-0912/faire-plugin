import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../modules/faire"
import FaireModuleService from "../modules/faire/service"

/**
 * Handles product updates in Medusa and syncs changes to Faire.
 * - Status change → update lifecycle_state on Faire
 * - Fields change (title, description, images) → update product on Faire
 */
export default async function handleProductUpdated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const faireService =
    container.resolve<FaireModuleService>(FAIRE_MODULE)

  try {
    // Fetch full product with all relations
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "status",
        "thumbnail",
        "images.url",
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.options.id",
        "variants.options.option_value.value",
        "variants.options.option.title",
        "variants.prices.currency_code",
        "variants.prices.amount",
        "variants.inventory_quantity",
        "metadata",
      ],
      filters: {
        id: [data.id],
      },
    })

    const product = products[0]
    if (!product) {
      logger.warn(`[Faire Sync] Product ${data.id} not found`)
      return
    }

    // Only sync if product has been previously synced to Faire
    const faireProductId = product.metadata?.faire_product_id
    if (!faireProductId) {
      logger.debug(
        `[Faire Sync] Product ${data.id} not synced to Faire, skipping update`
      )
      return
    }

    // Guard: skip if the update was triggered by the sync workflow itself
    // (e.g., when sync workflow saves faire_product_id/faire_variant_map to metadata)
    // The sync workflow sets _skip_faire_sync=true temporarily
    if (product.metadata?._skip_faire_sync) {
      logger.debug(
        `[Faire Sync] Skipping re-sync for ${data.id} (triggered by sync workflow)`
      )
      return
    }

    // Update the product on Faire
    await faireService.updateFaireProduct(faireProductId, product)
    logger.info(
      `[Faire Sync] Updated product "${product.title}" (${faireProductId}) on Faire`
    )
  } catch (error: any) {
    logger.error(
      `[Faire Sync] Failed to sync product update ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["product.updated"],
}