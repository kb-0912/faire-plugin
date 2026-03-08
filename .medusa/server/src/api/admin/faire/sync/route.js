"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const sync_product_to_faire_1 = require("../../../../workflows/sync-product-to-faire");
/**
 * POST /admin/faire/sync — Trigger full product sync to Faire.
 */
const POST = async (req, res) => {
    try {
        const { result } = await (0, sync_product_to_faire_1.syncProductsToFaireWorkflow)(req.scope).run({});
        res.status(200).json({
            message: "Product sync to Faire complete",
            created: result.created,
            updated: result.updated,
            errors: result.errors,
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Failed to sync products to Faire",
            error: error.message,
        });
    }
};
exports.POST = POST;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2ZhaXJlL3N5bmMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsdUZBQXlGO0FBRXpGOztHQUVHO0FBQ0ksTUFBTSxJQUFJLEdBQUcsS0FBSyxFQUFFLEdBQWtCLEVBQUUsR0FBbUIsRUFBRSxFQUFFO0lBQ3BFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUEsbURBQTJCLEVBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixPQUFPLEVBQUUsZ0NBQWdDO1lBQ3pDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztZQUN2QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1NBQ3RCLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25CLE9BQU8sRUFBRSxrQ0FBa0M7WUFDM0MsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPO1NBQ3JCLENBQUMsQ0FBQTtJQUNKLENBQUM7QUFDSCxDQUFDLENBQUE7QUFmWSxRQUFBLElBQUksUUFlaEIifQ==