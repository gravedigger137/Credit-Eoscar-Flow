import { storage } from "./storage";
import { db } from "./db";
import { onboardingSteps, clients } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  mapBookingCreatedToPlatformEvent,
  mapOnboardingStartedToPlatformEvent,
  safelyPublishPlatformEvent,
  safelyStartPlatformOnboardingWorkflow,
} from "./platform";

const ONBOARDING_STEPS = [
  { step: "welcome", label: "Welcome & Account Setup" },
  { step: "identity_verification", label: "Identity Verification (SSN, DOB, ID)" },
  { step: "credit_authorization", label: "Credit Pull Authorization" },
  { step: "document_collection", label: "Document Upload (ID, Proof of Address)" },
  { step: "credit_report_pull", label: "3-Bureau Credit Report Pull" },
  { step: "ai_analysis", label: "AI Credit Analysis & Strategy" },
  { step: "dispute_plan", label: "Dispute Plan Generation" },
  { step: "bank_linking", label: "Bank Account Linking (Plaid)" },
  { step: "payment_setup", label: "Payment Method & Plan Selection" },
  { step: "engagement_letter", label: "Engagement Letter / CROA Contract" },
  { step: "tradeline_matching", label: "Tradeline Opportunity Assessment" },
  { step: "onboarding_complete", label: "Onboarding Complete — Active Client" },
];

export async function initializeOnboarding(clientId: string) {
  const existing = await db.select().from(onboardingSteps).where(eq(onboardingSteps.clientId, clientId));
  if (existing.length > 0) return existing;

  const steps = [];
  for (const s of ONBOARDING_STEPS) {
    const [step] = await db.insert(onboardingSteps).values({
      clientId,
      step: s.step,
      label: s.label,
      status: "pending",
    }).returning();
    steps.push(step);
  }

  if (steps.length > 0) {
    await db.update(onboardingSteps)
      .set({ status: "in_progress" })
      .where(eq(onboardingSteps.id, steps[0].id));
  }

  await storage.createNotification({
    type: "client",
    title: "New Client Onboarding Started",
    message: `Automated onboarding pipeline initialized with ${ONBOARDING_STEPS.length} steps.`,
    read: false,
    clientId,
  });

  safelyPublishPlatformEvent(mapOnboardingStartedToPlatformEvent({
    clientId,
    stepCount: ONBOARDING_STEPS.length,
    source: "manual",
  }));
  safelyStartPlatformOnboardingWorkflow(clientId, ONBOARDING_STEPS.length);

  return steps;
}

export async function advanceOnboarding(clientId: string, stepName: string, data?: string) {
  const steps = await db.select().from(onboardingSteps)
    .where(eq(onboardingSteps.clientId, clientId));

  const currentStep = steps.find(s => s.step === stepName);
  if (!currentStep) return { error: "Step not found" };

  await db.update(onboardingSteps)
    .set({ status: "completed", completedAt: new Date(), data: data || null })
    .where(eq(onboardingSteps.id, currentStep.id));

  const stepIndex = ONBOARDING_STEPS.findIndex(s => s.step === stepName);
  if (stepIndex < ONBOARDING_STEPS.length - 1) {
    const nextStepName = ONBOARDING_STEPS[stepIndex + 1].step;
    const nextStep = steps.find(s => s.step === nextStepName);
    if (nextStep) {
      await db.update(onboardingSteps)
        .set({ status: "in_progress" })
        .where(eq(onboardingSteps.id, nextStep.id));
    }
  }

  const completedCount = steps.filter(s => s.status === "completed").length + 1;
  const progress = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

  await db.update(clients)
    .set({
      onboardingProgress: progress,
      status: progress >= 100 ? "active" : "onboarding",
    })
    .where(eq(clients.id, clientId));

  if (progress >= 100) {
    await storage.createNotification({
      type: "success",
      title: "Onboarding Complete!",
      message: `Client onboarding finished. Status changed to Active.`,
      read: false,
      clientId,
    });
  }

  return { progress, completedCount, total: ONBOARDING_STEPS.length };
}

export async function autoOnboardFromBooking(name: string, phone: string, email?: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(" ") || "TBD";

  const client = await storage.createClient({
    firstName,
    lastName,
    email: email || `${phone.replace(/\D/g, "")}@pending.com`,
    phone,
    status: "onboarding",
    onboardingProgress: 0,
  });

  const steps = await initializeOnboarding(client.id);

  safelyPublishPlatformEvent(mapBookingCreatedToPlatformEvent({
    bookingId: `booking_${client.id}`,
    clientName: `${firstName} ${lastName}`,
    phone,
    ...(email === undefined ? {} : { email }),
  }));

  await advanceOnboarding(client.id, "welcome", JSON.stringify({ source: "booking", bookedAt: new Date().toISOString() }));

  await storage.createNotification({
    type: "client",
    title: "Auto-Onboarding: New Client from Booking",
    message: `${firstName} ${lastName} (${phone}) booked a consultation and was auto-enrolled. Onboarding pipeline started.`,
    read: false,
    clientId: client.id,
  });

  return { client, steps };
}

export { ONBOARDING_STEPS };
