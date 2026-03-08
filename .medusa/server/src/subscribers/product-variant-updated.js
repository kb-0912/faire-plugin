"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = handleInventoryUpdated;
const utils_1 = require("@medusajs/framework/utils");
const faire_1 = require("../modules/faire");
/**
 * Handles inventory level changes in Medusa.
 * Syncs the updated inventory to Faire using the variant's SKU.
 *
 * Listens to the Medusa core event "inventory-level.updated" which fires
 * when stock quantities change.
 */
async function handleInventoryUpdated({ event: { data }, container, }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const faireService = container.resolve(faire_1.FAIRE_MODULE);
    try {
        const inventoryService = container.resolve(utils_1.Modules.INVENTORY);
        // Fetch the inventory level to get location/item details
        const inventoryLevel = await inventoryService.retrieveInventoryLevel(data.id);
        if (!inventoryLevel) {
            logger.warn(`[Faire Inventory] Inventory level ${data.id} not found`);
            return;
        }
        // Fetch the inventory item to get the SKU
        const inventoryItem = await inventoryService.retrieveInventoryItem(inventoryLevel.inventory_item_id);
        if (!inventoryItem?.sku) {
            logger.debug(`[Faire Inventory] No SKU for inventory item ${inventoryLevel.inventory_item_id}, skipping`);
            return;
        }
        const onHandQuantity = inventoryLevel.stocked_quantity ?? 0;
        await faireService.updateFaireInventoryBySku(inventoryItem.sku, onHandQuantity);
        logger.info(`[Faire Inventory] Updated SKU "${inventoryItem.sku}" → quantity: ${onHandQuantity}`);
    }
    catch (error) {
        logger.error(`[Faire Inventory] Failed to sync inventory ${data.id}: ${error.message}`);
    }
}
exports.config = {
    event: "inventory-level.updated",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC12YXJpYW50LXVwZGF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc3Vic2NyaWJlcnMvcHJvZHVjdC12YXJpYW50LXVwZGF0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBWUEseUNBa0RDO0FBN0RELHFEQUE4RTtBQUM5RSw0Q0FBK0M7QUFHL0M7Ozs7OztHQU1HO0FBQ1ksS0FBSyxVQUFVLHNCQUFzQixDQUFDLEVBQ25ELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxFQUNmLFNBQVMsR0FDc0I7SUFDL0IsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsRSxNQUFNLFlBQVksR0FDaEIsU0FBUyxDQUFDLE9BQU8sQ0FBcUIsb0JBQVksQ0FBQyxDQUFBO0lBRXJELElBQUksQ0FBQztRQUNILE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFN0QseURBQXlEO1FBQ3pELE1BQU0sY0FBYyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsc0JBQXNCLENBQ2xFLElBQUksQ0FBQyxFQUFFLENBQ1IsQ0FBQTtRQUVELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQixNQUFNLENBQUMsSUFBSSxDQUNULHFDQUFxQyxJQUFJLENBQUMsRUFBRSxZQUFZLENBQ3pELENBQUE7WUFDRCxPQUFNO1FBQ1IsQ0FBQztRQUVELDBDQUEwQztRQUMxQyxNQUFNLGFBQWEsR0FBRyxNQUFNLGdCQUFnQixDQUFDLHFCQUFxQixDQUNoRSxjQUFjLENBQUMsaUJBQWlCLENBQ2pDLENBQUE7UUFFRCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsK0NBQStDLGNBQWMsQ0FBQyxpQkFBaUIsWUFBWSxDQUM1RixDQUFBO1lBQ0QsT0FBTTtRQUNSLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFBO1FBRTNELE1BQU0sWUFBWSxDQUFDLHlCQUF5QixDQUMxQyxhQUFhLENBQUMsR0FBRyxFQUNqQixjQUFjLENBQ2YsQ0FBQTtRQUVELE1BQU0sQ0FBQyxJQUFJLENBQ1Qsa0NBQWtDLGFBQWEsQ0FBQyxHQUFHLGlCQUFpQixjQUFjLEVBQUUsQ0FDckYsQ0FBQTtJQUNILENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsOENBQThDLElBQUksQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUMxRSxDQUFBO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFWSxRQUFBLE1BQU0sR0FBcUI7SUFDdEMsS0FBSyxFQUFFLHlCQUF5QjtDQUNqQyxDQUFBIn0=