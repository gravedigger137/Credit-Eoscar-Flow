export type CreditEoscarPlatformEventType =
  | "BookingCreated"
  | "ClientCreated"
  | "OnboardingStarted"
  | "NotificationCreated"
  | "AuditLogged";

export interface PlatformDomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: CreditEoscarPlatformEventType;
  version: 1;
  source: "credit-eoscar";
  occurredAt: string;
  payload: TPayload;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
}

export interface PlatformPublishResult {
  status: "disabled" | "published" | "not_configured";
  eventType: CreditEoscarPlatformEventType;
  eventId?: string;
}

export interface PlatformEventPublisher {
  publish(event: PlatformDomainEvent): Promise<void>;
}
