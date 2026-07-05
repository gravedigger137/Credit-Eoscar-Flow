import { isPlatformIntegrationEnabled } from "./platform-feature";
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
  private readonly publisher?: PlatformEventPublisher;

  constructor(options: CreditEoscarPlatformAdapterOptions = {}) {
    this.enabled = options.enabled ?? false;

    if (options.publisher !== undefined) {
      this.publisher = options.publisher;
    }
  }

  async publish(event: PlatformDomainEvent): Promise<PlatformPublishResult> {
    if (!this.enabled) {
      return {
        status: "disabled",
        eventType: event.type
      };
    }

    if (this.publisher === undefined) {
      return {
        status: "not_configured",
        eventType: event.type,
        eventId: event.id
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

export function createCreditEoscarPlatformAdapter(
  publisher?: PlatformEventPublisher,
  env: NodeJS.ProcessEnv = process.env
): CreditEoscarPlatformAdapter {
  return new CreditEoscarPlatformAdapter({
    enabled: isPlatformIntegrationEnabled(env),
    ...(publisher === undefined ? {} : { publisher })
  });
}
