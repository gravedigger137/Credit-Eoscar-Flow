import { createId, InMemoryEventBus, nowIso } from "./platform-core";
import { NotificationEngine, type NotificationProvider, type NotificationRequest } from "./platform-notification-engine";
import { WorkflowEngine, type WorkflowDefinition } from "./platform-workflow-engine";
import type { Notification } from "@shared/schema";
import { CreditEoscarPlatformAdapter, EventBusPublisher } from "./credit-eoscar-platform-adapter";
import type { PlatformDomainEvent, PlatformPublishResult } from "./platform-contracts";
import { isPlatformIntegrationEnabled } from "./platform-feature";

export const creditEoscarPlatformEventBus = new InMemoryEventBus();
export const creditEoscarWorkflowEngine = new WorkflowEngine();

const notificationProvider: NotificationProvider = {
  name: "credit-eoscar-in-app",
  supports: (channel) => channel === "in_app" || channel === "admin_inbox" || channel === "workflow" || channel === "audit",
  send: (request: NotificationRequest) => ({
    ok: true,
    value: {
      notificationId: String(request.metadata?.["notificationId"] ?? createId("notif")),
      channel: request.channel,
      provider: "credit-eoscar-in-app",
      acceptedAt: nowIso(),
      metadata: request.metadata
    }
  })
};

export const creditEoscarNotificationEngine = new NotificationEngine(creditEoscarPlatformEventBus);
creditEoscarNotificationEngine.registerProvider(notificationProvider);

export const creditEoscarPlatformEventPublisher = new EventBusPublisher(creditEoscarPlatformEventBus);

function createRuntimePlatformAdapter(): CreditEoscarPlatformAdapter {
  return new CreditEoscarPlatformAdapter({
    enabled: isPlatformIntegrationEnabled(),
    publisher: creditEoscarPlatformEventPublisher
  });
}

export const creditEoscarPlatformAdapter = new CreditEoscarPlatformAdapter({
  enabled: isPlatformIntegrationEnabled(),
  publisher: creditEoscarPlatformEventPublisher
});

const onboardingWorkflow: WorkflowDefinition = {
  workflowKind: "client_onboarding",
  version: 1,
  initialState: "started",
  states: {
    started: {
      name: "started",
      transitions: [{ eventType: "complete", targetState: "completed" }]
    },
    completed: {
      name: "completed",
      terminal: true,
      transitions: []
    }
  }
};

creditEoscarWorkflowEngine.register(onboardingWorkflow);

export async function publishPlatformEvent(event: PlatformDomainEvent): Promise<PlatformPublishResult> {
  if (!isPlatformIntegrationEnabled()) {
    return {
      status: "disabled",
      eventType: event.type
    };
  }

  return createRuntimePlatformAdapter().publish(event);
}

export async function routeNotificationThroughPlatform(notification: Notification): Promise<PlatformPublishResult> {
  if (!isPlatformIntegrationEnabled()) {
    return {
      status: "disabled",
      eventType: "NotificationCreated"
    };
  }

  const delivery = await creditEoscarNotificationEngine.send({
    channel: "in_app",
    recipient: {
      ...(notification.clientId === null ? {} : { recipientId: notification.clientId ?? undefined })
    },
    priority: notification.type === "warning" ? "high" : "normal",
    message: {
      subject: notification.title,
      body: notification.message
    },
    metadata: {
      notificationId: notification.id,
      notificationType: notification.type,
      source: "credit-eoscar"
    }
  });

  if (!delivery.ok) {
    throw delivery.error;
  }

  return {
    status: "published",
    eventType: "NotificationCreated",
    eventId: delivery.value.notificationId
  };
}

export async function startPlatformOnboardingWorkflow(clientId: string, stepCount: number): Promise<string | undefined> {
  if (!isPlatformIntegrationEnabled()) {
    return undefined;
  }

  const started = await creditEoscarWorkflowEngine.start("client_onboarding", 1, {
    clientId,
    stepCount
  });

  if (!started.ok) {
    throw started.error;
  }

  return started.value.instanceId;
}

export function safelyPublishPlatformEvent(event: PlatformDomainEvent): void {
  publishPlatformEvent(event).catch(() => undefined);
}

export function safelyRouteNotificationThroughPlatform(notification: Notification): void {
  routeNotificationThroughPlatform(notification).catch(() => undefined);
}

export function safelyStartPlatformOnboardingWorkflow(clientId: string, stepCount: number): void {
  startPlatformOnboardingWorkflow(clientId, stepCount).catch(() => undefined);
}
