import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { 
    getCitiesCount,
    getLocalitiesCount,
    getProjectsCount,
    getPropertiesCount,
    getKeymansCount
} from "../controllers/dashboard.controller.js";

const router = Router();

// Dashboard isolated metrics count endpoints
router.get("/cities/count", authenticate, getCitiesCount);
router.get("/localities/count", authenticate, getLocalitiesCount);
router.get("/projects/count", authenticate, getProjectsCount);
router.get("/properties/count", authenticate, getPropertiesCount);
router.get("/keymans/count", authenticate, getKeymansCount);

export default router;
