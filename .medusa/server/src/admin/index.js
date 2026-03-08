"use strict";
const jsxRuntime = require("react/jsx-runtime");
const ui = require("@medusajs/ui");
const reactQuery = require("@tanstack/react-query");
const adminSdk = require("@medusajs/admin-sdk");
const Medusa = require("@medusajs/js-sdk");
const react = require("react");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const Medusa__default = /* @__PURE__ */ _interopDefault(Medusa);
const sdk = new Medusa__default.default({
  baseUrl: "/",
  debug: false,
  auth: {
    type: "session"
  }
});
const FairePage = () => {
  const [productResult, setProductResult] = react.useState(null);
  const [orderResult, setOrderResult] = react.useState(null);
  const [wholesalePercent, setWholesalePercent] = react.useState(50);
  const [wholesaleDirty, setWholesaleDirty] = react.useState(false);
  const queryClient = reactQuery.useQueryClient();
  const { data: settings } = reactQuery.useQuery({
    queryKey: ["faire-settings"],
    queryFn: () => sdk.client.fetch("/admin/faire/settings", {
      method: "GET"
    })
  });
  react.useEffect(() => {
    if ((settings == null ? void 0 : settings.wholesale_price_percentage) !== void 0) {
      setWholesalePercent(settings.wholesale_price_percentage);
      setWholesaleDirty(false);
    }
  }, [settings]);
  const saveSettings = reactQuery.useMutation({
    mutationFn: (percent) => sdk.client.fetch("/admin/faire/settings", {
      method: "POST",
      body: { wholesale_price_percentage: percent }
    }),
    onSuccess: (data) => {
      setWholesalePercent(data.wholesale_price_percentage);
      setWholesaleDirty(false);
      queryClient.invalidateQueries({ queryKey: ["faire-settings"] });
      ui.toast.success("Wholesale price setting saved");
    },
    onError: (err) => {
      console.error(err);
      ui.toast.error("Failed to save settings");
    }
  });
  const productSync = reactQuery.useMutation({
    mutationFn: () => sdk.client.fetch("/admin/faire/sync", {
      method: "POST"
    }),
    onSuccess: (data) => {
      setProductResult(data);
      ui.toast.success("Product sync to Faire complete");
    },
    onError: (err) => {
      console.error(err);
      ui.toast.error("Failed to sync products to Faire");
    }
  });
  const orderSync = reactQuery.useMutation({
    mutationFn: () => sdk.client.fetch("/admin/faire/orders", {
      method: "POST"
    }),
    onSuccess: (data) => {
      setOrderResult(data);
      ui.toast.success("Faire order import complete");
    },
    onError: (err) => {
      console.error(err);
      ui.toast.error("Failed to import orders from Faire");
    }
  });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxRuntime.jsxs(ui.Container, { className: "divide-y p-0", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex items-center justify-between px-6 py-4", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx(ui.Heading, { level: "h2", children: "Wholesale Pricing" }),
        /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "small", className: "text-ui-fg-subtle mt-1", children: "Set the wholesale price as a percentage of the retail price. This applies when syncing products to Faire." })
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-4 px-6 py-4", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntime.jsx(ui.Label, { htmlFor: "wholesale-percent", className: "whitespace-nowrap", children: "Wholesale %" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            ui.Input,
            {
              id: "wholesale-percent",
              type: "number",
              min: 1,
              max: 100,
              value: wholesalePercent,
              onChange: (e) => {
                setWholesalePercent(Number(e.target.value));
                setWholesaleDirty(true);
              },
              className: "w-24"
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "small", className: "text-ui-fg-subtle whitespace-nowrap", children: "of retail price" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          ui.Button,
          {
            variant: "secondary",
            size: "small",
            onClick: () => saveSettings.mutate(wholesalePercent),
            isLoading: saveSettings.isPending,
            disabled: !wholesaleDirty,
            children: "Save"
          }
        ),
        !wholesaleDirty && settings && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "green", children: [
          "Active: ",
          settings.wholesale_price_percentage,
          "%"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(ui.Container, { className: "divide-y p-0", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex items-center justify-between px-6 py-4", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx(ui.Heading, { level: "h2", children: "Product Sync" }),
        /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "small", className: "text-ui-fg-subtle mt-1", children: "Sync products from Medusa to Faire. New products will be created, existing ones updated." })
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-4 px-6 py-4", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          ui.Button,
          {
            variant: "primary",
            onClick: () => productSync.mutate(),
            isLoading: productSync.isPending,
            children: "Sync Products to Faire"
          }
        ),
        productResult && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [
          (productResult.created ?? 0) > 0 && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "green", children: [
            productResult.created,
            " created"
          ] }),
          (productResult.updated ?? 0) > 0 && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "blue", children: [
            productResult.updated,
            " updated"
          ] }),
          (productResult.errors ?? 0) > 0 && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "red", children: [
            productResult.errors,
            " errors"
          ] }),
          (productResult.created ?? 0) === 0 && (productResult.updated ?? 0) === 0 && (productResult.errors ?? 0) === 0 && /* @__PURE__ */ jsxRuntime.jsx(ui.Badge, { color: "grey", children: "All products up to date" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(ui.Container, { className: "divide-y p-0", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex items-center justify-between px-6 py-4", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx(ui.Heading, { level: "h2", children: "Order Import" }),
        /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "small", className: "text-ui-fg-subtle mt-1", children: "Import new orders from Faire as draft orders in Medusa. Orders are polled automatically every 5 minutes, or you can trigger manually." })
      ] }) }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-4 px-6 py-4", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          ui.Button,
          {
            variant: "secondary",
            onClick: () => orderSync.mutate(),
            isLoading: orderSync.isPending,
            children: "Import Orders from Faire"
          }
        ),
        orderResult && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-2", children: [
          (orderResult.created ?? 0) > 0 && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "green", children: [
            orderResult.created,
            " imported"
          ] }),
          (orderResult.skipped ?? 0) > 0 && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "grey", children: [
            orderResult.skipped,
            " skipped"
          ] }),
          (orderResult.errors ?? 0) > 0 && /* @__PURE__ */ jsxRuntime.jsxs(ui.Badge, { color: "red", children: [
            orderResult.errors,
            " errors"
          ] }),
          (orderResult.created ?? 0) === 0 && (orderResult.skipped ?? 0) === 0 && (orderResult.errors ?? 0) === 0 && /* @__PURE__ */ jsxRuntime.jsx(ui.Badge, { color: "grey", children: "No new orders" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(ui.Container, { className: "p-0", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "px-6 py-4", children: [
      /* @__PURE__ */ jsxRuntime.jsx(ui.Heading, { level: "h2", children: "How it works" }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "mt-3 space-y-2", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(ui.Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Products:" }),
          " New Medusa products are created on Faire. Existing synced products are updated (name, description, status, images, prices). Product options are mapped dynamically."
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(ui.Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Pricing:" }),
          " Wholesale price = Retail price × Wholesale %. Prices use the Faire V2 format with currency support."
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(ui.Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Lifecycle:" }),
          " Published → Faire PUBLISHED. Draft → Faire DRAFT. Deleted → Removed from Faire."
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(ui.Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Inventory:" }),
          " Stock changes in Medusa are automatically synced to Faire in real-time via event subscribers."
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(ui.Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Orders:" }),
          " New Faire orders are polled every 5 minutes and created as draft orders in Medusa for your review. Already imported orders are skipped."
        ] })
      ] })
    ] }) })
  ] });
};
const config = adminSdk.defineRouteConfig({
  label: "Faire"
});
const widgetModule = { widgets: [] };
const routeModule = {
  routes: [
    {
      Component: FairePage,
      path: "/faire"
    }
  ]
};
const menuItemModule = {
  menuItems: [
    {
      label: config.label,
      icon: void 0,
      path: "/faire",
      nested: void 0,
      rank: void 0,
      translationNs: void 0
    }
  ]
};
const formModule = { customFields: {} };
const displayModule = {
  displays: {}
};
const i18nModule = { resources: {} };
const plugin = {
  widgetModule,
  routeModule,
  menuItemModule,
  formModule,
  displayModule,
  i18nModule
};
module.exports = plugin;
