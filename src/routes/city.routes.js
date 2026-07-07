// src/routes/city.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createCity, updateCity, deleteCity, getCities, getCityByIdOrSlug } from "../controllers/city.controller.js";

const router = Router();

router.get("/", getCities);
router.get("/:idOrSlug", getCityByIdOrSlug);
router.post("/", authenticate, createCity);
router.put("/:id", authenticate, updateCity);
router.delete("/:id", authenticate, deleteCity);

export default router;
