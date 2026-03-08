"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
const faire_1 = require("../../../../modules/faire");
/**
 * GET /admin/faire/settings — Get current Faire settings.
 */
const GET = async (req, res) => {
    const faireService = req.scope.resolve(faire_1.FAIRE_MODULE);
    res.status(200).json({
        wholesale_price_percentage: await faireService.getWholesalePercent(),
    });
};
exports.GET = GET;
/**
 * POST /admin/faire/settings — Update Faire settings.
 */
const POST = async (req, res) => {
    const { wholesale_price_percentage } = req.body;
    const faireService = req.scope.resolve(faire_1.FAIRE_MODULE);
    if (wholesale_price_percentage !== undefined &&
        typeof wholesale_price_percentage === "number") {
        await faireService.setWholesalePercent(wholesale_price_percentage);
    }
    res.status(200).json({
        wholesale_price_percentage: await faireService.getWholesalePercent(),
    });
};
exports.POST = POST;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2ZhaXJlL3NldHRpbmdzL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFEQUF3RDtBQUd4RDs7R0FFRztBQUNJLE1BQU0sR0FBRyxHQUFHLEtBQUssRUFBRSxHQUFrQixFQUFFLEdBQW1CLEVBQUUsRUFBRTtJQUNqRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBcUIsb0JBQVksQ0FBQyxDQUFBO0lBRXhFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2pCLDBCQUEwQixFQUFFLE1BQU0sWUFBWSxDQUFDLG1CQUFtQixFQUFFO0tBQ3ZFLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FBQTtBQU5ZLFFBQUEsR0FBRyxPQU1mO0FBRUQ7O0dBRUc7QUFDSSxNQUFNLElBQUksR0FBRyxLQUFLLEVBQUUsR0FBa0IsRUFBRSxHQUFtQixFQUFFLEVBQUU7SUFDbEUsTUFBTSxFQUFFLDBCQUEwQixFQUFFLEdBQUcsR0FBRyxDQUFDLElBRTFDLENBQUE7SUFFRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBcUIsb0JBQVksQ0FBQyxDQUFBO0lBRXhFLElBQ0ksMEJBQTBCLEtBQUssU0FBUztRQUN4QyxPQUFPLDBCQUEwQixLQUFLLFFBQVEsRUFDaEQsQ0FBQztRQUNDLE1BQU0sWUFBWSxDQUFDLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2pCLDBCQUEwQixFQUFFLE1BQU0sWUFBWSxDQUFDLG1CQUFtQixFQUFFO0tBQ3ZFLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FBQTtBQWpCWSxRQUFBLElBQUksUUFpQmhCIn0=