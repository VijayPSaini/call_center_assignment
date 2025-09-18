import { Router } from "express";
import { handleLivekitWebhook } from "../controller/webhook";

const router = Router();

// Webhook endpoint
router.post("/", handleLivekitWebhook);

export default router;
