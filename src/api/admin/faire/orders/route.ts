import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFaireOrdersWorkflow } from "../../../../workflows/sync-faire-orders"

/**
 * POST /admin/faire/orders — Manually trigger Faire order import.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    try {
        const { result } = await syncFaireOrdersWorkflow(req.scope).run({})
        res.status(200).json({
            message: "Faire order sync complete",
            created: result.created,
            skipped: result.skipped,
            errors: result.errors,
        })
    } catch (error: any) {
        res.status(500).json({
            message: "Failed to sync Faire orders",
            error: error.message,
        })
    }
}
