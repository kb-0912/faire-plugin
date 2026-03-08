"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handleProductUpdated;
const utils_1 = require("@medusajs/framework/utils");
const faire_1 = require("../modules/faire");
/**
 * Handles product updates in Medusa and syncs changes to Faire.
 * - Status change → update lifecycle_state on Faire
 * - Fields change (title, description, images) → update product on Faire
 */
async function handleProductUpdated({ event: { data }, container, }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const faireService = container.resolve(faire_1.FAIRE_MODULE);
    try {
        // Fetch full product with all relations
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
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
            ],
            filters: {
                id: [data.id],
            },
        });
        const product = products[0];
        if (!product) {
            logger.warn(`[Faire Sync] Product ${data.id} not found`);
            return;
        }
        // Only sync if product has been previously synced to Faire
        const faireProductId = product.metadata?.faire_product_id;
        if (!faireProductId) {
            logger.debug(`[Faire Sync] Product ${data.id} not synced to Faire, skipping update`);
            return;
        }
        // Guard: skip if the update was triggered by the sync workflow itself
        // (e.g., when sync workflow saves faire_product_id/faire_variant_map to metadata)
        // The sync workflow sets _skip_faire_sync=true temporarily
        if (product.metadata?._skip_faire_sync) {
            logger.debug(`[Faire Sync] Skipping re-sync for ${data.id} (triggered by sync workflow)`);
            return;
        }
        // Update the product on Faire
        await faireService.updateFaireProduct(faireProductId, product);
        logger.info(`[Faire Sync] Updated product "${product.title}" (${faireProductId}) on Faire`);
    }
    catch (error) {
        logger.error(`[Faire Sync] Failed to sync product update ${data.id}: ${error.message}`);
    }
}
exports.config = {
    event: ["product.updated"],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC11cGRhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N1YnNjcmliZXJzL3Byb2R1Y3QtdXBkYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFVQSx1Q0EyRUM7QUFwRkQscURBQThFO0FBQzlFLDRDQUErQztBQUcvQzs7OztHQUlHO0FBQ1ksS0FBSyxVQUFVLG9CQUFvQixDQUFDLEVBQ2pELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxFQUNmLFNBQVMsR0FDc0I7SUFDL0IsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsRSxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sWUFBWSxHQUNoQixTQUFTLENBQUMsT0FBTyxDQUFxQixvQkFBWSxDQUFDLENBQUE7SUFFckQsSUFBSSxDQUFDO1FBQ0gsd0NBQXdDO1FBQ3hDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQzNDLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLE1BQU0sRUFBRTtnQkFDTixJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsYUFBYTtnQkFDYixRQUFRO2dCQUNSLFdBQVc7Z0JBQ1gsWUFBWTtnQkFDWixZQUFZO2dCQUNaLGVBQWU7Z0JBQ2YsbUJBQW1CO2dCQUNuQixzQkFBc0I7Z0JBQ3RCLGFBQWE7Z0JBQ2IsZ0JBQWdCO2dCQUNoQixjQUFjO2dCQUNkLHFCQUFxQjtnQkFDckIscUNBQXFDO2dCQUNyQywrQkFBK0I7Z0JBQy9CLCtCQUErQjtnQkFDL0Isd0JBQXdCO2dCQUN4Qiw2QkFBNkI7Z0JBQzdCLFVBQVU7YUFDWDtZQUNELE9BQU8sRUFBRTtnQkFDUCxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2FBQ2Q7U0FDRixDQUFDLENBQUE7UUFFRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDeEQsT0FBTTtRQUNSLENBQUM7UUFFRCwyREFBMkQ7UUFDM0QsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQTtRQUN6RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDcEIsTUFBTSxDQUFDLEtBQUssQ0FDVix3QkFBd0IsSUFBSSxDQUFDLEVBQUUsdUNBQXVDLENBQ3ZFLENBQUE7WUFDRCxPQUFNO1FBQ1IsQ0FBQztRQUVELHNFQUFzRTtRQUN0RSxrRkFBa0Y7UUFDbEYsMkRBQTJEO1FBQzNELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQ1YscUNBQXFDLElBQUksQ0FBQyxFQUFFLCtCQUErQixDQUM1RSxDQUFBO1lBQ0QsT0FBTTtRQUNSLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsTUFBTSxZQUFZLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxJQUFJLENBQ1QsaUNBQWlDLE9BQU8sQ0FBQyxLQUFLLE1BQU0sY0FBYyxZQUFZLENBQy9FLENBQUE7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixNQUFNLENBQUMsS0FBSyxDQUNWLDhDQUE4QyxJQUFJLENBQUMsRUFBRSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FDMUUsQ0FBQTtJQUNILENBQUM7QUFDSCxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQXFCO0lBQ3RDLEtBQUssRUFBRSxDQUFDLGlCQUFpQixDQUFDO0NBQzNCLENBQUEifQ==