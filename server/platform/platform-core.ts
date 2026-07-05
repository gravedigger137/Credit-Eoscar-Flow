import { randomUUID } from "node:crypto";

export type Result<TValue, TError = Error> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError };

export function ok<TValue>(value: TValue): Result<TValue> {
  return { ok: true, value };
}

export function fail<TError = Error>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export function createId(prefix?: string): string {
  const id = randomUUID();
  return prefix === undefined ? id : `${prefix}_${id}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function readBooleanEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue = false
): boolean {
  const value = env[name]?.trim().toLowerCase();

  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  return defaultValue;
}

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: string;
  version: number;
  source: string;
  occurredAt: string;
  payload: TPayload;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
}

export interface CreateDomainEventInput<TPayload extends Record<string, unknown>> {
  type: string;
  source: string;
  payload: TPayload;
  version?: number;
  occurredAt?: Date | string;
  tenantId?: string;
  correlationId?: string;
  causationId?: string;
}

export function createDomainEvent<TPayload extends Record<string, unknown>>(
  input: CreateDomainEventInput<TPayload>
): DomainEvent<TPayload> {
  return {
    id: createId("evt"),
    type: input.type,
    version: input.version ?? 1,
    source: input.source,
    occurredAt: normalizeIso(input.occurredAt),
    payload: input.payload,
    ...(input.tenantId === undefined ? {} : { tenantId: input.tenantId }),
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.causationId === undefined ? {} : { causationId: input.causationId })
  };
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> =
  (event: TEvent) => void | Promise<void>;
export type EventUnsubscribe = () => void;

export class InMemoryEventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly globalHandlers = new Set<EventHandler>();

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<Result<void>> {
    const handlers = [
      ...Array.from(this.handlers.get(event.type) ?? []),
      ...Array.from(this.globalHandlers)
    ];

    try {
      await Promise.all(handlers.map((handler) => handler(event)));
      return ok(undefined);
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  subscribe<TEvent extends DomainEvent>(type: string, handler: EventHandler<TEvent>): EventUnsubscribe {
    const handlers = this.handlers.get(type) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(type, handlers);

    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  subscribeAll(handler: EventHandler): EventUnsubscribe {
    this.globalHandlers.add(handler);

    return () => {
      this.globalHandlers.delete(handler);
    };
  }
}

function normalizeIso(value?: Date | string): string {
  if (value === undefined) {
    return nowIso();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
