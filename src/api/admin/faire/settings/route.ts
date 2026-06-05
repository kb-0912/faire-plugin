import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FAIRE_MODULE } from "../../../../modules/faire"
import FaireModuleService from "../../../../modules/faire/service"

/**
 * GET /admin/faire/settings — Get current Faire settings.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const faireService = req.scope.resolve<FaireModuleService>(FAIRE_MODULE)

    res.status(200).json({
        wholesale_price_percentage: await faireService.getWholesalePercent(),
    })
}

/**
 * POST /admin/faire/settings — Update Faire settings.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { wholesale_price_percentage } = req.body as {
        wholesale_price_percentage?: number
    }

    const faireService = req.scope.resolve<FaireModuleService>(FAIRE_MODULE)

    if (
        wholesale_price_percentage !== undefined &&
        typeof wholesale_price_percentage === "number"
    ) {
        await faireService.setWholesalePercent(wholesale_price_percentage)
    }

    res.status(200).json({
        wholesale_price_percentage: await faireService.getWholesalePercent(),
    })
}
