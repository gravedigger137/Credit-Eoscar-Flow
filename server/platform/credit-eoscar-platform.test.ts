import assert from "node:assert/strict";
import test from "node:test";
import {
  CreditEoscarPlatformAdapter,
  isPlatformIntegrationEnabled,
  mapAuditLoggedToPlatformEvent,
  mapBookingCreatedToPlatformEvent,
  mapClientCreatedToPlatformEvent,
  mapNotificationCreatedToPlatformEvent,
  mapOnboardingStartedToPlatformEvent,
  publishPlatformEvent,
  routeNotificationThroughPlatform,
  startPlatformOnboardingWorkflow,
  creditEoscarPlatformEventBus,
  type PlatformDomainEvent
} from "./index";

const occurredAt = "2026-01-01T00:00:00.000Z";

test("maps Credit-Eoscar concepts to platform event contracts", () => {
  const events = [
    mapBookingCreatedToPlatformEvent(
      {
        bookingId: "booking_123",
        clientName: "Example Client",
        phone: "+15555550100",
        email: "client@example.test"
      },
      { occurredAt, correlationId: "corr_123" }
    ),
    mapClientCreatedToPlatformEvent(
      {
        clientId: "client_123",
        firstName: "Example",
        lastName: "Client",
        email: "client@example.test"
      },
      { occurredAt }
    ),
    mapOnboardingStartedToPlatformEvent(
      {
        clientId: "client_123",
        stepCount: 12,
        source: "booking"
      },
      { occurredAt }
    ),
    mapNotificationCreatedToPlatformEvent(
      {
        notificationId: "notification_123",
        type: "client",
        title: "New Client Onboarding Started",
        clientId: "client_123"
      },
      { occurredAt }
    ),
    mapAuditLoggedToPlatformEvent(
      {
        auditId: "audit_123",
        action: "client.created",
        entityType: "client",
        entityId: "client_123"
      },
      { occurredAt }
    )
  ];

  assert.deepEqual(
    events.map((event) => event.type),
    ["BookingCreated", "ClientCreated", "OnboardingStarted", "NotificationCreated", "AuditLogged"]
  );

  for (const event of events) {
    assert.equal(event.source, "credit-eoscar");
    assert.equal(event.version, 1);
    assert.equal(event.occurredAt, occurredAt);
  }

  assert.equal(events[0].correlationId, "corr_123");
});

test("keeps platform adapter disabled by default", async () => {
  assert.equal(isPlatformIntegrationEnabled({}), false);

  const adapter = new CreditEoscarPlatformAdapter();
  const event = mapClientCreatedToPlatformEvent({
    clientId: "client_123",
    firstName: "Example",
    lastName: "Client",
    email: "client@example.test"
  });

  const result = await adapter.publish(event);

  assert.equal(result.status, "disabled");
  assert.equal(result.eventType, "ClientCreated");
});

test("publishes through the configured in-process publisher when enabled", async () => {
  const published: PlatformDomainEvent[] = [];
  const adapter = new CreditEoscarPlatformAdapter({
    enabled: true,
    publisher: {
      publish: async (event) => {
        published.push(event);
      }
    }
  });
  const event = mapOnboardingStartedToPlatformEvent({
    clientId: "client_123",
    stepCount: 12,
    source: "manual"
  });

  const result = await adapter.publish(event);

  assert.equal(result.status, "published");
  assert.equal(published.length, 1);
  assert.equal(published[0]?.type, "OnboardingStarted");
});

test("routes runtime event publishing through the shared event bus when enabled", async () => {
  await withPlatformIntegration("true", async () => {
    const received: PlatformDomainEvent[] = [];
    const unsubscribe = creditEoscarPlatformEventBus.subscribeAll((event) => {
      received.push(event as PlatformDomainEvent);
    });

    try {
      const event = mapClientCreatedToPlatformEvent({
        clientId: "client_runtime_123",
        firstName: "Runtime",
        lastName: "Client",
        email: "runtime@example.test"
      });

      const result = await publishPlatformEvent(event);

      assert.equal(result.status, "published");
      assert.equal(result.eventType, "ClientCreated");
      assert.equal(received.some((candidate) => candidate.id === event.id), true);
    } finally {
      unsubscribe();
    }
  });
});

test("keeps runtime event publishing disabled when the feature flag is off", async () => {
  await withPlatformIntegration(undefined, async () => {
    const event = mapAuditLoggedToPlatformEvent({
      auditId: "audit_runtime_123",
      action: "runtime.disabled",
      entityType: "test",
      entityId: "test_123"
    });

    const result = await publishPlatformEvent(event);
    const workflowInstanceId = await startPlatformOnboardingWorkflow("client_disabled_123", 12);

    assert.equal(result.status, "disabled");
    assert.equal(result.eventType, "AuditLogged");
    assert.equal(workflowInstanceId, undefined);
  });
});

test("routes notifications and workflows through shared engines when enabled", async () => {
  await withPlatformIntegration("true", async () => {
    const received: PlatformDomainEvent[] = [];
    const unsubscribe = creditEoscarPlatformEventBus.subscribeAll((event) => {
      received.push(event as PlatformDomainEvent);
    });

    try {
      const notificationResult = await routeNotificationThroughPlatform({
        id: "notification_runtime_123",
        type: "client",
        title: "Runtime Notification",
        message: "Shared notification engine routed this message.",
        read: false,
        clientId: "client_runtime_123",
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      });
      const workflowInstanceId = await startPlatformOnboardingWorkflow("client_runtime_123", 12);

      assert.equal(notificationResult.status, "published");
      assert.equal(notificationResult.eventType, "NotificationCreated");
      assert.equal(notificationResult.eventId, "notification_runtime_123");
      assert.equal(received.some((event) => event.type === "NotificationCreated"), true);
      assert.equal(workflowInstanceId?.startsWith("wf_"), true);
    } finally {
      unsubscribe();
    }
  });
});

async function withPlatformIntegration<T>(value: string | undefined, run: () => Promise<T>): Promise<T> {
  const originalValue = process.env.PLATFORM_INTEGRATION_ENABLED;

  if (value === undefined) {
    delete process.env.PLATFORM_INTEGRATION_ENABLED;
  } else {
    process.env.PLATFORM_INTEGRATION_ENABLED = value;
  }

  try {
    return await run();
  } finally {
    if (originalValue === undefined) {
      delete process.env.PLATFORM_INTEGRATION_ENABLED;
    } else {
      process.env.PLATFORM_INTEGRATION_ENABLED = originalValue;
    }
  }
}
