"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handleProductDeleted;
const utils_1 = require("@medusajs/framework/utils");
const faire_1 = require("../modules/faire");
/**
 * Handles product deletion in Medusa.
 * Deletes the corresponding product on Faire if it was previously synced.
 */
async function handleProductDeleted({ event: { data }, container, }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const faireService = container.resolve(faire_1.FAIRE_MODULE);
    try {
        // Try to fetch the product to get metadata
        // Note: on product.deleted, the product may still be accessible briefly
        const { data: products } = await query.graph({
            entity: "product",
            fields: ["id", "metadata"],
            filters: { id: [data.id] },
        });
        const product = products[0];
        const faireProductId = product?.metadata?.faire_product_id;
        if (!faireProductId) {
            logger.debug(`[Faire Sync] Product ${data.id} was not synced to Faire, skipping delete`);
            return;
        }
        await faireService.deleteFaireProduct(faireProductId);
        logger.info(`[Faire Sync] Deleted product ${faireProductId} from Faire`);
    }
    catch (error) {
        logger.error(`[Faire Sync] Failed to delete product ${data.id} from Faire: ${error.message}`);
    }
}
exports.config = {
    event: ["product.deleted"],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC1kZWxldGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N1YnNjcmliZXJzL3Byb2R1Y3QtZGVsZXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFTQSx1Q0FxQ0M7QUE3Q0QscURBQThFO0FBQzlFLDRDQUErQztBQUcvQzs7O0dBR0c7QUFDWSxLQUFLLFVBQVUsb0JBQW9CLENBQUMsRUFDL0MsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQ2YsU0FBUyxHQUNvQjtJQUM3QixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xFLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEUsTUFBTSxZQUFZLEdBQ2QsU0FBUyxDQUFDLE9BQU8sQ0FBcUIsb0JBQVksQ0FBQyxDQUFBO0lBRXZELElBQUksQ0FBQztRQUNELDJDQUEyQztRQUMzQyx3RUFBd0U7UUFDeEUsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7WUFDekMsTUFBTSxFQUFFLFNBQVM7WUFDakIsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQztZQUMxQixPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7U0FDN0IsQ0FBQyxDQUFBO1FBRUYsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNCLE1BQU0sY0FBYyxHQUFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUE7UUFFMUQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQ1Isd0JBQXdCLElBQUksQ0FBQyxFQUFFLDJDQUEyQyxDQUM3RSxDQUFBO1lBQ0QsT0FBTTtRQUNWLENBQUM7UUFFRCxNQUFNLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsSUFBSSxDQUNQLGdDQUFnQyxjQUFjLGFBQWEsQ0FDOUQsQ0FBQTtJQUNMLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQ1IseUNBQXlDLElBQUksQ0FBQyxFQUFFLGdCQUFnQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQ2xGLENBQUE7SUFDTCxDQUFDO0FBQ0wsQ0FBQztBQUVZLFFBQUEsTUFBTSxHQUFxQjtJQUNwQyxLQUFLLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztDQUM3QixDQUFBIn0=