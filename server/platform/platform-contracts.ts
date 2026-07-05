import type { DomainEvent } from "./platform-core";

export type CreditEoscarPlatformEventType =
  | "BookingCreated"
  | "ClientCreated"
  | "OnboardingStarted"
  | "NotificationCreated"
  | "AuditLogged";

export type PlatformDomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  DomainEvent<TPayload> & {
    type: CreditEoscarPlatformEventType;
    source: "credit-eoscar";
    version: 1;
  };

export interface PlatformPublishResult {
  status: "disabled" | "published" | "not_configured";
  eventType: CreditEoscarPlatformEventType;
  eventId?: string;
}

export interface PlatformEventPublisher {
  publish(event: PlatformDomainEvent): Promise<void>;
}
