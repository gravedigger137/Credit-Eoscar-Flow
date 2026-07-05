import crypto from "node:crypto";
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

function iso(value?: Date | string): string {
  if (value === undefined) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function eventId(type: string): string {
  return `credit_eoscar_${type}_${crypto.randomUUID()}`;
}

function baseEvent<TPayload extends Record<string, unknown>>(
  type: PlatformDomainEvent<TPayload>["type"],
  payload: TPayload,
  options: EventOptions = {}
): PlatformDomainEvent<TPayload> {
  return {
    id: eventId(type),
    type,
    version: 1,
    source: "credit-eoscar",
    occurredAt: iso(options.occurredAt),
    payload,
    ...(options.tenantId === undefined ? {} : { tenantId: options.tenantId }),
    ...(options.correlationId === undefined ? {} : { correlationId: options.correlationId })
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
      bookedAt: iso(input.bookedAt ?? options.occurredAt)
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
      createdAt: iso(input.createdAt ?? options.occurredAt)
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
      startedAt: iso(input.startedAt ?? options.occurredAt)
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
      createdAt: iso(input.createdAt ?? options.occurredAt)
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
      createdAt: iso(input.createdAt ?? options.occurredAt)
    },
    options
  );
}
