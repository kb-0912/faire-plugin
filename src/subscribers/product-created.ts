import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../modules/faire"
import FaireModuleService from "../modules/faire/service"

/**
 * Handles product creation in Medusa and creates the matching product on Faire.
 * This is what makes "create a product in Medusa → it also appears on Faire"
 * work automatically (Medusa is the single source of truth).
 *
 * - lifecycle_state mirrors the Medusa status (draft → DRAFT, published → PUBLISHED)
 * - variants / SKUs / options are mirrored from Medusa
 * - retail price = Medusa USD price; wholesale = retail × configured %
 *
 * Idempotent: skips if the product already has `faire_product_id`, and the Faire
 * create call uses `idempotence_token = product.id` so retries don't duplicate.
 */
export default async function handleProductCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const faireService = container.resolve<FaireModuleService>(FAIRE_MODULE)
  const productModuleService = container.resolve(Modules.PRODUCT)

  try {
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
      filters: { id: [data.id] },
    })

    const product = products[0]
    if (!product) {
      logger.warn(`[Faire Sync] Product ${data.id} not found on create`)
      return
    }

    // Already linked to Faire? Nothing to create.
    if (product.metadata?.faire_product_id) {
      logger.debug(
        `[Faire Sync] Product ${data.id} already has faire_product_id, skipping create`
      )
      return
    }

    const wholesalePercent = await faireService.getWholesalePercent()
    const faireProduct = await faireService.createFaireProduct(
      product,
      wholesalePercent
    )

    // Build medusa_variant_id → faire_variant_id map
    const faireVariantMap: Record<string, string> = {}
    if (faireProduct.variants) {
      for (const fv of faireProduct.variants) {
        if (fv.idempotence_token && fv.id) {
          faireVariantMap[fv.idempotence_token] = fv.id
        }
      }
    }

    // Persist Faire IDs (Medusa merges metadata, so other keys are preserved).
    await productModuleService.updateProducts(product.id, {
      metadata: {
        faire_product_id: faireProduct.id,
        synced_to_faire: true,
        faire_variant_map: JSON.stringify(faireVariantMap),
      },
    })

    logger.info(
      `[Faire Sync] Created product "${product.title}" (${faireProduct.id}) on Faire`
    )
  } catch (error: any) {
    logger.error(
      `[Faire Sync] Failed to create product ${data.id} on Faire: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["product.created"],
}
