import { Router } from "express";
import { ZodError } from "zod";
import {
  analyzeClientCredit,
  chatWithAI,
  generateDisputeLetter,
  validateMetro2Record,
} from "../ai";
import { recordUsageEvent } from "../usage-metering";
import { safeErrorMessage } from "../security-utils";

export const aiRouter = Router();

function handleError(res: import("express").Response, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", errors: err.errors });
  }

  const providerError = err as { code?: string; status?: number; message?: string };
  const code = providerError?.code;
  const status = providerError?.status;

  if (code === "insufficient_quota") {
    return res.status(402).json({
      message: "OpenAI quota is exhausted. Add credits in OpenAI billing and try again.",
      code: "quota_exceeded",
    });
  }
  if (code === "invalid_api_key" || status === 401) {
    return res.status(401).json({
      message: "OpenAI authentication failed. Update the configured server secret and redeploy.",
      code: "invalid_key",
    });
  }
  if (code === "rate_limit_exceeded" || status === 429) {
    return res.status(429).json({
      message: "The AI provider rate limit was reached. Try again shortly.",
      code: "rate_limited",
    });
  }
  if (code === "model_not_found") {
    return res.status(502).json({
      message: "The configured AI model is unavailable.",
      code: "model_unavailable",
    });
  }
  if (providerError?.message?.includes("OPENAI_API_KEY is required")) {
    return res.status(503).json({
      message: "The AI provider is not configured on the server.",
      code: "ai_not_configured",
    });
  }
  if (status === 400) {
    return res.status(400).json({
      message: "The AI provider rejected the request.",
      code: "provider_bad_request",
    });
  }

  console.error("AI request failed:", safeErrorMessage(err));
  return res.status(502).json({ message: "The AI provider could not complete the request.", code: "provider_error" });
}

aiRouter.post("/dispute-letter", async (req, res) => {
  try {
    const { clientName, bureau, accountName, accountNumber, reason, type } = req.body;
    if (!clientName || !bureau || !accountName || !reason || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const letter = await generateDisputeLetter({ clientName, bureau, accountName, accountNumber, reason, type });
    recordUsageEvent({ eventType: "ai_letter", metadata: { bureau }, quantity: 1 }).catch(() => {});
    res.json({ letter });
  } catch (err) {
    handleError(res, err);
  }
});

aiRouter.post("/analyze-client", async (req, res) => {
  try {
    const { clientName, scores, negativeItems, goal } = req.body;
    if (!clientName) return res.status(400).json({ message: "clientName is required" });
    const analysis = await analyzeClientCredit({ clientName, scores: scores ?? {}, negativeItems: negativeItems ?? [], goal });
    recordUsageEvent({ eventType: "ai_analysis", metadata: { clientName }, quantity: 1 }).catch(() => {});
    res.json({ analysis });
  } catch (err) {
    handleError(res, err);
  }
});

aiRouter.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ message: "messages array required" });
    const reply = await chatWithAI(messages);
    recordUsageEvent({ eventType: "ai_chat", quantity: 1 }).catch(() => {});
    res.json({ reply });
  } catch (err) {
    handleError(res, err);
  }
});

aiRouter.post("/validate-metro2", async (req, res) => {
  try {
    const { record } = req.body;
    if (!record) return res.status(400).json({ message: "record is required" });
    const result = await validateMetro2Record(record);
    res.json({ result });
  } catch (err) {
    handleError(res, err);
  }
});
