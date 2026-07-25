import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import FaireModuleService from "../modules/faire/service"
import { FAIRE_MODULE } from "../modules/faire"

/**
 * Step 1: Find all products currently linked to Faire (have `faire_product_id`).
 * Optionally restrict to a given list of Medusa product ids.
 */
const getFaireLinkedProductsStep = createStep(
  "get-faire-linked-products",
  async (input: { product_ids?: string[] }, { container }) => {
    const query = container.resolve("query")

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "metadata"],
      ...(input.product_ids?.length
        ? { filters: { id: input.product_ids } }
        : {}),
    })

    const linked = products.filter((p: any) => p.metadata?.faire_product_id)
    return new StepResponse({ products: linked })
  }
)

/**
 * Step 2: For each linked product, delete it on Faire and clear the Faire
 * metadata so a subsequent sync re-creates it fresh.
 *
 * Clearing is done by setting the keys to "" — Medusa's metadata merge removes
 * any key whose value is an empty string.
 */
const resetFaireProductsStep = createStep(
  "reset-faire-products",
  async (input: { products: any[] }, { container }) => {
    const faireService = container.resolve<FaireModuleService>(FAIRE_MODULE)
    const productModuleService = container.resolve(Modules.PRODUCT)

    let deleted = 0
    let cleared = 0
    let errors = 0

    for (const product of input.products) {
      const faireProductId = product.metadata.faire_product_id

      // 1) Delete on Faire (best-effort — a 404 just means it's already gone).
      try {
        await faireService.deleteFaireProduct(faireProductId)
        deleted++
      } catch (err: any) {
        console.error(
          `[Faire Reset] Delete on Faire failed for ${product.id} (${faireProductId}): ${err.message}`
        )
        errors++
      }

      // 2) Clear ONLY the Faire link keys and BUMP faire_sync_version so the next
      //    sync uses fresh variant idempotence_tokens (otherwise Faire would keep
      //    returning the just-deleted product). Medusa MERGES metadata (it spreads
      //    the existing object first) and removes any key whose new value is "" —
      //    so every other metadata key on the product is preserved untouched.
      const nextVersion = (Number(product.metadata.faire_sync_version) || 0) + 1
      try {
        await productModuleService.updateProducts(product.id, {
          metadata: {
            faire_product_id: "",
            faire_variant_map: "",
            synced_to_faire: "",
            faire_sync_version: nextVersion,
          },
        })
        cleared++
      } catch (err: any) {
        console.error(
          `[Faire Reset] Failed to clear metadata for ${product.id}: ${err.message}`
        )
        errors++
      }
    }

    return new StepResponse({ deleted, cleared, errors })
  }
)

/**
 * Workflow: Reset Faire links.
 * Deletes the linked products on Faire and clears their Faire metadata in Medusa
 * so that running the product sync afterwards re-creates them from scratch (with
 * correct pricing / variants). Pass `product_ids` to reset a subset.
 */
export const resetFaireProductsWorkflow = createWorkflow(
  { name: "reset-faire-products" },
  function (input: { product_ids?: string[] }) {
    const data = getFaireLinkedProductsStep(input)
    const result = resetFaireProductsStep(data)
    return new WorkflowResponse(result)
  }
)
