import { Router } from "express";
import { ZodError } from "zod";
import {
  analyzeClientCredit,
  chatWithAI,
  generateDisputeLetter,
  validateMetro2Record,
} from "../ai";
import { recordUsageEvent } from "../usage-metering";

export const aiRouter = Router();

function handleError(res: import("express").Response, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", errors: err.errors });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
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
