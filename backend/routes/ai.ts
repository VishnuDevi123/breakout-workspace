import { Router } from "express";

import { aiUsage, draftWorkflow } from "../services/ai.ts";
import { callerFrom } from "../services/app-context.ts";
import { HttpError } from "../services/http-error.ts";
import type { AiUsage, ApiResponse, DraftWorkflowResponse } from "../types/breakout.ts";

const router = Router();

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Host only: every call spends the CreateAI project budget. The request names no meeting (nothing
// is saved), so only the token and its role are checked; failures stop here with 401/403.
// The token's uid keys the host's daily prompt count.
router.use((req, res, next) => {
  const caller = callerFrom(req.get("X-Zoom-App-Context"));
  if (caller.role !== "host") throw new HttpError("Only the host can draft with AI.", 403);
  res.locals.caller = caller;
  next();
});

// GET /api/ai/usage   The host's AI prompts left today.
router.get("/usage", async (_req, res) => {
  const body: ApiResponse<AiUsage> = { success: true, data: await aiUsage(res.locals.caller.uid) };
  res.json(body);
});

// POST /api/ai/workflow   body: DraftWorkflowRequest. Returns a question or a proposal;
// the host applies a proposal with POST /api/workspace/replace.
router.post("/workflow", async (req, res) => {
  const body: ApiResponse<DraftWorkflowResponse> = { success: true, data: await draftWorkflow(req.body, res.locals.caller.uid) };
  res.json(body);
});

export default router;
