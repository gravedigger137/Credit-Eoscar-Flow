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
