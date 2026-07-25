import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../../../../../modules/faire"
import FaireModuleService from "../../../../../modules/faire/service"

const PRODUCT_FIELDS = [
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
]

/**
 * POST /admin/faire/products/:id/sync — Create or update a single product on Faire.
 * - No `faire_product_id` in metadata → create on Faire and store the link.
 * - Has `faire_product_id` → update that Faire product.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const faireService = req.scope.resolve<FaireModuleService>(FAIRE_MODULE)
  const productModuleService = req.scope.resolve(Modules.PRODUCT)

  try {
    const { data: products } = await query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { id: [productId] },
    })

    const product = products[0]
    if (!product) {
      return res.status(404).json({ message: `Product ${productId} not found` })
    }

    const wholesalePercent = await faireService.getWholesalePercent()
    const existingFaireId = product.metadata?.faire_product_id as
      | string
      | undefined

    if (existingFaireId) {
      const faireProduct = await faireService.updateFaireProduct(
        existingFaireId,
        product,
        wholesalePercent
      )

      // Refresh the variant map in case new variants were created.
      const variantMap = product.metadata?.faire_variant_map
        ? JSON.parse(product.metadata.faire_variant_map as string)
        : {}
      for (const fv of faireProduct.variants ?? []) {
        if (fv.idempotence_token && fv.id) variantMap[fv.idempotence_token] = fv.id
      }
      await productModuleService.updateProducts(productId, {
        metadata: { faire_variant_map: JSON.stringify(variantMap) },
      })

      return res.status(200).json({
        action: "updated",
        faire_product_id: existingFaireId,
        variant_count: Object.keys(variantMap).length,
      })
    }

    // Create
    const faireProduct = await faireService.createFaireProduct(
      product,
      wholesalePercent
    )
    const variantMap: Record<string, string> = {}
    for (const fv of faireProduct.variants ?? []) {
      if (fv.idempotence_token && fv.id) variantMap[fv.idempotence_token] = fv.id
    }
    await productModuleService.updateProducts(productId, {
      metadata: {
        faire_product_id: faireProduct.id,
        synced_to_faire: true,
        faire_variant_map: JSON.stringify(variantMap),
      },
    })

    return res.status(200).json({
      action: "created",
      faire_product_id: faireProduct.id,
      variant_count: Object.keys(variantMap).length,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to sync product to Faire",
      error: error.message,
    })
  }
}
