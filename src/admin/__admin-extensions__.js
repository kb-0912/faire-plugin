
      // Auto-generated index file for Medusa Admin UI extensions
    import WidgetComponent0, { config as WidgetConfig0 } from "/Users/kb/Downloads/faire-plugin-main-2/src/admin/widgets/SyncFaireButton.tsx"

const widgetModule = { widgets: [
  {
    Component: WidgetComponent0,
    zone: ["product.details.side.after"]
}
] }
    import RouteComponent0 from "/Users/kb/Downloads/faire-plugin-main-2/src/admin/routes/faire/page.tsx"

const routeModule = { routes: [
    {
    Component: RouteComponent0,
    path: "/faire"
  }
]
 }
    import { config as RouteConfig0 } from "/Users/kb/Downloads/faire-plugin-main-2/src/admin/routes/faire/page.tsx"

const menuItemModule = { menuItems: [
    {
    label: RouteConfig0.label,
    icon: undefined,
    path: "/faire",
    nested: undefined,
    rank: undefined,
    translationNs: undefined
  }
]
 }
    

const formModule = { customFields: {
  
} }
    

const displayModule = { 
    displays: {
      
    }
   }
    import { deepMerge } from "@medusajs/admin-shared"

const i18nModule = { resources: {} }
    
    const plugin = {
      widgetModule,
      routeModule,
      menuItemModule,
      formModule,
      displayModule,
      i18nModule
    }

    export default plugin
    