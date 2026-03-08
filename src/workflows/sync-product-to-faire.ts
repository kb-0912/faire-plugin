import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import FaireModuleService from "../modules/faire/service"
import { FAIRE_MODULE } from "../modules/faire"
import { Modules } from "@medusajs/framework/utils"



/**
 * Step 1: Get all products that need sync to Faire.
 * - Products without `faire_product_id` in metadata → create
 * - Products with `faire_product_id` → update
 */
const getProductsForSyncStep = createStep(
  "get-products-for-sync",
  async (_, { container }) => {
    const query = container.resolve("query")

    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "description",
        "status",
        "thumbnail",
        "images.url",
        "collection.title",
        "categories.name",
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.allow_backorder",
        "variants.manage_inventory",
        "variants.options.id",
        "variants.options.option_value.value",
        "variants.options.option.title",
        "variants.prices.currency_code",
        "variants.prices.amount",
        "variants.inventory_quantity",
        "metadata",
      ],
    })

    // Separate into new vs existing
    const toCreate = products.filter(
      (p: any) => !p.metadata?.faire_product_id
    )
    const toUpdate = products.filter(
      (p: any) => !!p.metadata?.faire_product_id
    )

    return new StepResponse({ toCreate, toUpdate })
  }
)

/**
 * Step 2: Create new products on Faire & update existing ones.
 */
const syncProductsToFaireStep = createStep(
  "sync-products-to-faire",
  async (
    input: {
      toCreate: any[]
      toUpdate: any[]
    },
    { container }
  ) => {
    const faireService =
      container.resolve<FaireModuleService>(FAIRE_MODULE)
    const productModuleService = container.resolve(Modules.PRODUCT)

    let created = 0
    let updated = 0
    let errors = 0
    const wholesalePercent = await faireService.getWholesalePercent()

    // --- Create new products ---
    for (const product of input.toCreate) {
      try {
        const faireProduct = await faireService.createFaireProduct(
          product,
          wholesalePercent
        )

        // Build variant ID mapping
        const faireVariantMap: Record<string, string> = {}
        if (faireProduct.variants) {
          for (const fv of faireProduct.variants) {
            if (fv.idempotence_token && fv.id) {
              faireVariantMap[fv.idempotence_token] = fv.id
            }
          }
        }

        // Store Faire product & variant IDs in metadata
        // _skip_faire_sync prevents the product.updated subscriber from
        // re-triggering an update to Faire (which was just done above)
        await productModuleService.updateProducts(product.id, {
          metadata: {
            faire_product_id: faireProduct.id,
            synced_to_faire: true,
            faire_variant_map: JSON.stringify(faireVariantMap),
            _skip_faire_sync: true,
          },
        })

        created++
      } catch (err: any) {
        console.error(
          `[Faire Sync] Create error for ${product.id}:`,
          err.message
        )
        errors++
      }
    }

    // --- Update existing products ---
    for (const product of input.toUpdate) {
      try {
        const faireProductId = product.metadata.faire_product_id
        const faireProduct = await faireService.updateFaireProduct(
          faireProductId,
          product,
          wholesalePercent
        )

        // Update variant mapping if new variants were created
        if (faireProduct.variants) {
          const existingMap = product.metadata.faire_variant_map
            ? JSON.parse(product.metadata.faire_variant_map)
            : {}

          for (const fv of faireProduct.variants) {
            if (fv.idempotence_token && fv.id) {
              existingMap[fv.idempotence_token] = fv.id
            }
          }

          await productModuleService.updateProducts(product.id, {
            metadata: {
              faire_variant_map: JSON.stringify(existingMap),
              _skip_faire_sync: true,
            },
          })
        }

        updated++
      } catch (err: any) {
        console.error(
          `[Faire Sync] Update error for ${product.id}:`,
          err.message
        )
        errors++
      }
    }

    return new StepResponse({ created, updated, errors })
  }
)

/**
 * Main sync workflow.
 * Creates new products and updates existing ones on Faire.
 */
export const syncProductsToFaireWorkflow = createWorkflow(
  { name: "sync-products-to-faire" },
  function () {
    const data = getProductsForSyncStep()
    const result = syncProductsToFaireStep(data)
    return new WorkflowResponse(result)
  }
)