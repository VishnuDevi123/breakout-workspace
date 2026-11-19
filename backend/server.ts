import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import dotenv from "dotenv";

import roundPlanRoutes from "./routes/round-plans.ts";
import type { ApiResponse, HealthResponse } from "./types/breakout.ts";
import { HttpError } from "./services/http-error.ts";
import webhookRoutes from "./routes/webhooks.ts";
import liveRoutes from "./routes/live.ts";
import workSpaceRoutes from "./routes/workspace.ts";
import taskRoutes from "./routes/tasks.ts";
import activity_responses_routes from "./routes/activity_responses.ts";
import challengeRoutes from "./routes/challenges.ts";
import templateRoutes from "./routes/templates.ts";
import aiRoutes from "./routes/ai.ts";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;

// The deployed frontend calls the backend from another origin (FRONTEND_URL). Unset, no
// cross-origin call is allowed; local requests come through Caddy on the same origin.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || false,
    allowedHeaders: ["Content-Type", "X-Zoom-App-Context"],
    maxAge: 600,
  }),
);

// Webhooks need the raw bytes to check Zoom's signature, so they parse before express.json().
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhookRoutes,
);
app.use(express.json());

app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    referrerPolicy: {
      policy: "same-origin",
    },
  }),
);

// The router adds /:roundId/rooms. Draft saves never change actual Zoom rooms.
app.use("/api/rounds", roundPlanRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/workspace", workSpaceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/responses", activity_responses_routes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/ai", aiRoutes);
// Zoom sends the user here after they add the app (the Marketplace OAuth redirect URL).
// The app reads who they are from the app context token, so this page only says what to do next.
app.get("/auth/callback", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Breakout Workspace installed</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f7f8fa;color:#1f2937">
<main style="max-width:420px;padding:24px;text-align:center">
<h1 style="font-size:22px;font-weight:600;margin:0 0 8px">Breakout Workspace is installed</h1>
<p style="font-size:15px;line-height:1.5;margin:0;color:#4b5563">Start or join a Zoom meeting, then open Breakout Workspace from Apps in the meeting toolbar. You can close this page.</p>
</main>
</body>
</html>`);
});

function health(): ApiResponse<HealthResponse> {
  return {
    success: true,
    data: {
      status: "ok",
      service: "breakout-workspace-backend",
      uptimeSeconds: Math.round(process.uptime()),
    },
  };
}

app.get("/health", (req, res) => {
  res.status(200).json(health());
});

app.get("/api/health", (req, res) => {
  res.status(200).json(health());
});

// Every error ends here, sync or async (Express 5): a refusal a store or check threw,
// a bad JSON body, or a bug. Always the JSON envelope, never Express's HTML page.
const handleUnknownError: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    const body: ApiResponse<never> = { success: false, error: error.message };
    res.status(error.status).json(body);
    return;
  }
  const status = (error as { status?: number }).status;
  if (status === 400 || status === 413) {
    const body: ApiResponse<never> = {
      success: false,
      error: "The request body could not be read.",
    };
    res.status(status).json(body);
    return;
  }
  console.error("Unhandled error:", error);
  const body: ApiResponse<never> = {
    success: false,
    error: "Something went wrong on the server. Try again.",
  };
  res.status(500).json(body);
};
app.use(handleUnknownError);

app.listen(PORT, () => {
  console.log(`Express backend running on port ${PORT}`);
});

