import { isPlatformIntegrationEnabled } from "./platform-feature";
import { InMemoryEventBus } from "./platform-core";
import type {
  PlatformDomainEvent,
  PlatformEventPublisher,
  PlatformPublishResult
} from "./platform-contracts";

export interface CreditEoscarPlatformAdapterOptions {
  enabled?: boolean;
  publisher?: PlatformEventPublisher;
}

export class CreditEoscarPlatformAdapter {
  private readonly enabled: boolean;
  private readonly publisher: PlatformEventPublisher;

  constructor(options: CreditEoscarPlatformAdapterOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.publisher = options.publisher ?? new EventBusPublisher(new InMemoryEventBus());
  }

  async publish(event: PlatformDomainEvent): Promise<PlatformPublishResult> {
    if (!this.enabled) {
      return {
        status: "disabled",
        eventType: event.type
      };
    }

    await this.publisher.publish(event);

    return {
      status: "published",
      eventType: event.type,
      eventId: event.id
    };
  }
}

export class EventBusPublisher implements PlatformEventPublisher {
  constructor(private readonly eventBus: InMemoryEventBus) {}

  async publish(event: PlatformDomainEvent): Promise<void> {
    const result = await this.eventBus.publish(event);

    if (!result.ok) {
      throw result.error;
    }
  }
}

export function createCreditEoscarPlatformAdapter(
  publisher?: PlatformEventPublisher,
  env: NodeJS.ProcessEnv = process.env
): CreditEoscarPlatformAdapter {
  return new CreditEoscarPlatformAdapter({
    enabled: isPlatformIntegrationEnabled(env),
    ...(publisher === undefined ? {} : { publisher })
  });
}
