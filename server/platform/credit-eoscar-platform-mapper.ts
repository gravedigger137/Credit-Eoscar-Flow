import { createDomainEvent } from "@infinite-arcadia/event-bus";
import type { PlatformDomainEvent } from "./platform-contracts";

interface EventOptions {
  occurredAt?: Date | string;
  correlationId?: string;
  tenantId?: string;
}

export interface BookingCreatedInput {
  bookingId: string;
  clientName: string;
  phone: string;
  email?: string;
  bookedAt?: Date | string;
}

export interface ClientCreatedInput {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  createdAt?: Date | string;
}

export interface OnboardingStartedInput {
  clientId: string;
  stepCount: number;
  source: "booking" | "manual" | "import";
  startedAt?: Date | string;
}

export interface NotificationCreatedInput {
  notificationId: string;
  type: string;
  title: string;
  clientId?: string;
  createdAt?: Date | string;
}

export interface AuditLoggedInput {
  auditId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt?: Date | string;
}

export function toPlatformIso(value?: Date | string): string {
  if (value === undefined) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function baseEvent<TPayload extends Record<string, unknown>>(
  type: PlatformDomainEvent<TPayload>["type"],
  payload: TPayload,
  options: EventOptions = {}
): PlatformDomainEvent<TPayload> {
  const event = createDomainEvent({
    type,
    source: "credit-eoscar",
    payload,
    version: 1,
    ...(options.tenantId === undefined ? {} : { tenantId: options.tenantId }),
    ...(options.correlationId === undefined ? {} : { correlationId: options.correlationId })
  }) as PlatformDomainEvent<TPayload>;

  return {
    ...event,
    occurredAt: toPlatformIso(options.occurredAt)
  };
}

export function mapBookingCreatedToPlatformEvent(
  input: BookingCreatedInput,
  options: EventOptions = {}
): PlatformDomainEvent {
  return baseEvent(
    "BookingCreated",
    {
      bookingId: input.bookingId,
      clientName: input.clientName,
      phone: input.phone,
      ...(input.email === undefined ? {} : { email: input.email }),
      bookedAt: toPlatformIso(input.bookedAt ?? options.occurredAt)
    },
    options
  );
}

export function mapClientCreatedToPlatformEvent(
  input: ClientCreatedInput,
  options: EventOptions = {}
): PlatformDomainEvent {
  return baseEvent(
    "ClientCreated",
    {
      clientId: input.clientId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      status: input.status ?? "onboarding",
      createdAt: toPlatformIso(input.createdAt ?? options.occurredAt)
    },
    options
  );
}

export function mapOnboardingStartedToPlatformEvent(
  input: OnboardingStartedInput,
  options: EventOptions = {}
): PlatformDomainEvent {
  return baseEvent(
    "OnboardingStarted",
    {
      clientId: input.clientId,
      stepCount: input.stepCount,
      source: input.source,
      startedAt: toPlatformIso(input.startedAt ?? options.occurredAt)
    },
    options
  );
}

export function mapNotificationCreatedToPlatformEvent(
  input: NotificationCreatedInput,
  options: EventOptions = {}
): PlatformDomainEvent {
  return baseEvent(
    "NotificationCreated",
    {
      notificationId: input.notificationId,
      type: input.type,
      title: input.title,
      ...(input.clientId === undefined ? {} : { clientId: input.clientId }),
      createdAt: toPlatformIso(input.createdAt ?? options.occurredAt)
    },
    options
  );
}

export function mapAuditLoggedToPlatformEvent(input: AuditLoggedInput, options: EventOptions = {}): PlatformDomainEvent {
  return baseEvent(
    "AuditLogged",
    {
      auditId: input.auditId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      createdAt: toPlatformIso(input.createdAt ?? options.occurredAt)
    },
    options
  );
}
