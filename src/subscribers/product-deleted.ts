import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FAIRE_MODULE } from "../modules/faire"
import FaireModuleService from "../modules/faire/service"

/**
 * Handles product deletion in Medusa.
 * Deletes the corresponding product on Faire if it was previously synced.
 */
export default async function handleProductDeleted({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const faireService =
        container.resolve<FaireModuleService>(FAIRE_MODULE)

    try {
        // Try to fetch the product to get metadata
        // Note: on product.deleted, the product may still be accessible briefly
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "metadata"],
            filters: { id: [data.id] },
        })

        const product = products[0]
        const faireProductId = product?.metadata?.faire_product_id

        if (!faireProductId) {
            logger.debug(
                `[Faire Sync] Product ${data.id} was not synced to Faire, skipping delete`
            )
            return
        }

        await faireService.deleteFaireProduct(faireProductId)
        logger.info(
            `[Faire Sync] Deleted product ${faireProductId} from Faire`
        )
    } catch (error: any) {
        logger.error(
            `[Faire Sync] Failed to delete product ${data.id} from Faire: ${error.message}`
        )
    }
}

export const config: SubscriberConfig = {
    event: ["product.deleted"],
}
