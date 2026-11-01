import { Elysia } from "elysia";
import { ReferensiController } from "@/controllers/referensi.controller";
import { authPlugin } from "@/plugins/auth.plugin";

// Data pilihan untuk formulir dan filter, semua role
export const referensiRoutes = new Elysia({ prefix: "/referensi" }).use(authPlugin).get("/", ReferensiController.semua, { auth: true });
