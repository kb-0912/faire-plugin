import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../modules/faire"
import FaireModuleService from "../modules/faire/service"

/**
 * Handles product variant changes in Medusa (price, SKU, title, options) and
 * mirrors them to Faire by re-pushing the parent product.
 *
 * Listens to the real Medusa event `product-variant.updated` (emitted by
 * updateProductVariantsWorkflow / batchProductVariantsWorkflow).
 *
 * NOTE: This does NOT cover stock-quantity changes — Medusa's Inventory Module
 * does not emit any event when stock levels change. Inventory is synced by the
 * scheduled `poll-faire-inventory` job instead.
 */
export default async function handleProductVariantUpdated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const faireService = container.resolve<FaireModuleService>(FAIRE_MODULE)

  try {
    // Resolve the parent product id from the variant.
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product_id"],
      filters: { id: [data.id] },
    })

    const productId = variants[0]?.product_id
    if (!productId) return

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
      filters: { id: [productId] },
    })

    const product = products[0]
    const faireProductId = product?.metadata?.faire_product_id
    if (!faireProductId) return

    const wholesalePercent = await faireService.getWholesalePercent()
    await faireService.updateFaireProduct(
      faireProductId,
      product,
      wholesalePercent
    )

    logger.info(
      `[Faire Sync] Updated product "${product.title}" (${faireProductId}) on Faire (variant change)`
    )
  } catch (error: any) {
    logger.error(
      `[Faire Sync] Failed to sync variant update ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "product-variant.updated",
}
