"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = pollFaireOrders;
const sync_faire_orders_1 = require("../workflows/sync-faire-orders");
/**
 * Scheduled job that polls Faire for new orders every 5 minutes.
 * Creates draft orders in Medusa for manual review.
 */
async function pollFaireOrders(container) {
    const logger = container.resolve("logger");
    try {
        logger.info("[Faire Poll] Starting order poll...");
        const { result } = await (0, sync_faire_orders_1.syncFaireOrdersWorkflow)(container).run({});
        logger.info(`[Faire Poll] Complete — created: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors}`);
    }
    catch (error) {
        logger.error(`[Faire Poll] Failed to poll orders: ${error.message}`);
    }
}
exports.config = {
    name: "poll-faire-orders",
    schedule: "*/5 * * * *", // Every 5 minutes
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9sbC1mYWlyZS1vcmRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvam9icy9wb2xsLWZhaXJlLW9yZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFPQSxrQ0FlQztBQXJCRCxzRUFBd0U7QUFFeEU7OztHQUdHO0FBQ1ksS0FBSyxVQUFVLGVBQWUsQ0FBQyxTQUEwQjtJQUNwRSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRTFDLElBQUksQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLDJDQUF1QixFQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVuRSxNQUFNLENBQUMsSUFBSSxDQUNQLG9DQUFvQyxNQUFNLENBQUMsT0FBTyxjQUFjLE1BQU0sQ0FBQyxPQUFPLGFBQWEsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUM3RyxDQUFBO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDbEIsTUFBTSxDQUFDLEtBQUssQ0FDUix1Q0FBdUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUN6RCxDQUFBO0lBQ0wsQ0FBQztBQUNMLENBQUM7QUFFWSxRQUFBLE1BQU0sR0FBRztJQUNsQixJQUFJLEVBQUUsbUJBQW1CO0lBQ3pCLFFBQVEsRUFBRSxhQUFhLEVBQUUsa0JBQWtCO0NBQzlDLENBQUEifQ==