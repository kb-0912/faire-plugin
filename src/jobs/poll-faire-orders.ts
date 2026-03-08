import { MedusaContainer } from "@medusajs/framework/types"
import { syncFaireOrdersWorkflow } from "../workflows/sync-faire-orders"

/**
 * Scheduled job that polls Faire for new orders every 5 minutes.
 * Creates draft orders in Medusa for manual review.
 */
export default async function pollFaireOrders(container: MedusaContainer) {
    const logger = container.resolve("logger")

    try {
        logger.info("[Faire Poll] Starting order poll...")
        const { result } = await syncFaireOrdersWorkflow(container).run({})

        logger.info(
            `[Faire Poll] Complete — created: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors}`
        )
    } catch (error: any) {
        logger.error(
            `[Faire Poll] Failed to poll orders: ${error.message}`
        )
    }
}

export const config = {
    name: "poll-faire-orders",
    schedule: "*/5 * * * *", // Every 5 minutes
}
