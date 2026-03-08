import { jsxs, jsx } from "react/jsx-runtime";
import { toast, Container, Heading, Text, Label, Input, Button, Badge } from "@medusajs/ui";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import Medusa from "@medusajs/js-sdk";
import { useState, useEffect } from "react";
const sdk = new Medusa({
  baseUrl: "/",
  debug: false,
  auth: {
    type: "session"
  }
});
const FairePage = () => {
  const [productResult, setProductResult] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [wholesalePercent, setWholesalePercent] = useState(50);
  const [wholesaleDirty, setWholesaleDirty] = useState(false);
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["faire-settings"],
    queryFn: () => sdk.client.fetch("/admin/faire/settings", {
      method: "GET"
    })
  });
  useEffect(() => {
    if ((settings == null ? void 0 : settings.wholesale_price_percentage) !== void 0) {
      setWholesalePercent(settings.wholesale_price_percentage);
      setWholesaleDirty(false);
    }
  }, [settings]);
  const saveSettings = useMutation({
    mutationFn: (percent) => sdk.client.fetch("/admin/faire/settings", {
      method: "POST",
      body: { wholesale_price_percentage: percent }
    }),
    onSuccess: (data) => {
      setWholesalePercent(data.wholesale_price_percentage);
      setWholesaleDirty(false);
      queryClient.invalidateQueries({ queryKey: ["faire-settings"] });
      toast.success("Wholesale price setting saved");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to save settings");
    }
  });
  const productSync = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/faire/sync", {
      method: "POST"
    }),
    onSuccess: (data) => {
      setProductResult(data);
      toast.success("Product sync to Faire complete");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to sync products to Faire");
    }
  });
  const orderSync = useMutation({
    mutationFn: () => sdk.client.fetch("/admin/faire/orders", {
      method: "POST"
    }),
    onSuccess: (data) => {
      setOrderResult(data);
      toast.success("Faire order import complete");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to import orders from Faire");
    }
  });
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxs(Container, { className: "divide-y p-0", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between px-6 py-4", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Heading, { level: "h2", children: "Wholesale Pricing" }),
        /* @__PURE__ */ jsx(Text, { size: "small", className: "text-ui-fg-subtle mt-1", children: "Set the wholesale price as a percentage of the retail price. This applies when syncing products to Faire." })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 px-6 py-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "wholesale-percent", className: "whitespace-nowrap", children: "Wholesale %" }),
          /* @__PURE__ */ jsx(
            Input,
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
          /* @__PURE__ */ jsx(Text, { size: "small", className: "text-ui-fg-subtle whitespace-nowrap", children: "of retail price" })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "small",
            onClick: () => saveSettings.mutate(wholesalePercent),
            isLoading: saveSettings.isPending,
            disabled: !wholesaleDirty,
            children: "Save"
          }
        ),
        !wholesaleDirty && settings && /* @__PURE__ */ jsxs(Badge, { color: "green", children: [
          "Active: ",
          settings.wholesale_price_percentage,
          "%"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Container, { className: "divide-y p-0", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between px-6 py-4", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Heading, { level: "h2", children: "Product Sync" }),
        /* @__PURE__ */ jsx(Text, { size: "small", className: "text-ui-fg-subtle mt-1", children: "Sync products from Medusa to Faire. New products will be created, existing ones updated." })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 px-6 py-4", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "primary",
            onClick: () => productSync.mutate(),
            isLoading: productSync.isPending,
            children: "Sync Products to Faire"
          }
        ),
        productResult && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          (productResult.created ?? 0) > 0 && /* @__PURE__ */ jsxs(Badge, { color: "green", children: [
            productResult.created,
            " created"
          ] }),
          (productResult.updated ?? 0) > 0 && /* @__PURE__ */ jsxs(Badge, { color: "blue", children: [
            productResult.updated,
            " updated"
          ] }),
          (productResult.errors ?? 0) > 0 && /* @__PURE__ */ jsxs(Badge, { color: "red", children: [
            productResult.errors,
            " errors"
          ] }),
          (productResult.created ?? 0) === 0 && (productResult.updated ?? 0) === 0 && (productResult.errors ?? 0) === 0 && /* @__PURE__ */ jsx(Badge, { color: "grey", children: "All products up to date" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Container, { className: "divide-y p-0", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between px-6 py-4", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Heading, { level: "h2", children: "Order Import" }),
        /* @__PURE__ */ jsx(Text, { size: "small", className: "text-ui-fg-subtle mt-1", children: "Import new orders from Faire as draft orders in Medusa. Orders are polled automatically every 5 minutes, or you can trigger manually." })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 px-6 py-4", children: [
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            onClick: () => orderSync.mutate(),
            isLoading: orderSync.isPending,
            children: "Import Orders from Faire"
          }
        ),
        orderResult && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          (orderResult.created ?? 0) > 0 && /* @__PURE__ */ jsxs(Badge, { color: "green", children: [
            orderResult.created,
            " imported"
          ] }),
          (orderResult.skipped ?? 0) > 0 && /* @__PURE__ */ jsxs(Badge, { color: "grey", children: [
            orderResult.skipped,
            " skipped"
          ] }),
          (orderResult.errors ?? 0) > 0 && /* @__PURE__ */ jsxs(Badge, { color: "red", children: [
            orderResult.errors,
            " errors"
          ] }),
          (orderResult.created ?? 0) === 0 && (orderResult.skipped ?? 0) === 0 && (orderResult.errors ?? 0) === 0 && /* @__PURE__ */ jsx(Badge, { color: "grey", children: "No new orders" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Container, { className: "p-0", children: /* @__PURE__ */ jsxs("div", { className: "px-6 py-4", children: [
      /* @__PURE__ */ jsx(Heading, { level: "h2", children: "How it works" }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2", children: [
        /* @__PURE__ */ jsxs(Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsx("strong", { children: "Products:" }),
          " New Medusa products are created on Faire. Existing synced products are updated (name, description, status, images, prices). Product options are mapped dynamically."
        ] }),
        /* @__PURE__ */ jsxs(Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsx("strong", { children: "Pricing:" }),
          " Wholesale price = Retail price × Wholesale %. Prices use the Faire V2 format with currency support."
        ] }),
        /* @__PURE__ */ jsxs(Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsx("strong", { children: "Lifecycle:" }),
          " Published → Faire PUBLISHED. Draft → Faire DRAFT. Deleted → Removed from Faire."
        ] }),
        /* @__PURE__ */ jsxs(Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsx("strong", { children: "Inventory:" }),
          " Stock changes in Medusa are automatically synced to Faire in real-time via event subscribers."
        ] }),
        /* @__PURE__ */ jsxs(Text, { size: "small", className: "text-ui-fg-subtle", children: [
          /* @__PURE__ */ jsx("strong", { children: "Orders:" }),
          " New Faire orders are polled every 5 minutes and created as draft orders in Medusa for your review. Already imported orders are skipped."
        ] })
      ] })
    ] }) })
  ] });
};
const config = defineRouteConfig({
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
export {
  plugin as default
};
