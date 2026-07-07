import express from "express";
import { login, logout, getSession } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", authenticate, logout);
router.get("/session/:sessionId", authenticate, getSession);

export default router;
