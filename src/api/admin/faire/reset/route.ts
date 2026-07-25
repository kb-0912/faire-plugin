import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resetFaireProductsWorkflow } from "../../../../workflows/reset-faire-products"

/**
 * POST /admin/faire/reset — Delete linked products on Faire and clear their
 * Faire metadata in Medusa, so a subsequent product sync re-creates them fresh.
 *
 * Body (optional):
 *   { "product_ids": ["prod_123", ...] }  // reset only these; omit = reset all
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_ids } = (req.body ?? {}) as { product_ids?: string[] }

  try {
    const { result } = await resetFaireProductsWorkflow(req.scope).run({
      input: { product_ids },
    })

    res.status(200).json({
      message: "Faire product reset complete. Run product sync to re-create.",
      deleted: result.deleted,
      cleared: result.cleared,
      errors: result.errors,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to reset Faire products",
      error: error.message,
    })
  }
}
