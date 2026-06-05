import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncProductsToFaireWorkflow } from "../../../../workflows/sync-product-to-faire"

/**
 * POST /admin/faire/sync — Trigger full product sync to Faire.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { result } = await syncProductsToFaireWorkflow(req.scope).run({})
    res.status(200).json({
      message: "Product sync to Faire complete",
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to sync products to Faire",
      error: error.message,
    })
  }
}