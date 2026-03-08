import { Module } from "@medusajs/utils"
import FaireModuleService from "./service"

export const FAIRE_MODULE = "faire"

export default Module(FAIRE_MODULE, {
  service: FaireModuleService,
})