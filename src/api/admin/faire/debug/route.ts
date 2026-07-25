import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FAIRE_MODULE } from "../../../../modules/faire"
import FaireModuleService from "../../../../modules/faire/service"

/**
 * GET /admin/faire/debug — Diagnose what Faire ACTUALLY has for this account.
 *
 * - `/admin/faire/debug`               → list summary (total + count by lifecycle_state + sample)
 * - `/admin/faire/debug?id=p_xxx`      → fetch one product by id (shows its lifecycle_state
 *                                         even if DELETED — the dashboard hides those)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const faireService = req.scope.resolve<FaireModuleService>(FAIRE_MODULE)
  const id = req.query.id as string | undefined

  try {
    if (id) {
      const product = await faireService.getFaireProduct(id)
      return res.status(200).json({
        lookup_id: id,
        product: {
          id: product?.id,
          name: product?.name,
          lifecycle_state: product?.lifecycle_state,
          sale_state: product?.sale_state,
          variant_count: product?.variants?.length ?? 0,
          error: product?.error ?? false,
          error_status: product?.status,
        },
        raw: product,
      })
    }

    const products = await faireService.getFaireProducts()

    const byState: Record<string, number> = {}
    for (const p of products as any[]) {
      const s = p.lifecycle_state || "UNKNOWN"
      byState[s] = (byState[s] ?? 0) + 1
    }

    return res.status(200).json({
      total: products.length,
      by_lifecycle_state: byState,
      sample: (products as any[]).slice(0, 15).map((p) => ({
        id: p.id,
        name: p.name,
        lifecycle_state: p.lifecycle_state,
        variant_count: p.variants?.length ?? 0,
      })),
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Faire debug failed",
      error: error.message,
    })
  }
}
