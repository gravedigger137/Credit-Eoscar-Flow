import { createDomainEvent, fail, type InMemoryEventBus, type Result } from "./platform-core";

export type NotificationChannel = "email" | "sms" | "push" | "in_app" | "admin_inbox" | "workflow" | "audit";
export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationRequest {
  channel: NotificationChannel;
  recipient: {
    recipientId?: string;
    email?: string;
    phone?: string;
  };
  priority?: NotificationPriority;
  message: {
    subject: string;
    body: string;
  };
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface NotificationDelivery {
  notificationId: string;
  channel: NotificationChannel;
  provider: string;
  acceptedAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  name: string;
  supports(channel: NotificationChannel): boolean;
  send(request: NotificationRequest): Result<NotificationDelivery> | Promise<Result<NotificationDelivery>>;
}

export class NotificationEngine {
  private readonly providers: NotificationProvider[] = [];

  constructor(private readonly eventBus?: InMemoryEventBus) {}

  registerProvider(provider: NotificationProvider): void {
    this.providers.push(provider);
  }

  async send(request: NotificationRequest): Promise<Result<NotificationDelivery>> {
    const provider = this.providers.find((candidate) => candidate.supports(request.channel));

    if (provider === undefined) {
      return fail(new Error(`No notification provider registered for channel ${request.channel}.`));
    }

    const delivery = await provider.send(request);

    if (!delivery.ok) {
      return delivery;
    }

    if (this.eventBus !== undefined) {
      await this.eventBus.publish(
        createDomainEvent({
          type: "NotificationCreated",
          source: "credit-eoscar-notification-engine",
          payload: {
            notificationId: delivery.value.notificationId,
            channel: delivery.value.channel,
            provider: delivery.value.provider
          },
          ...(request.correlationId === undefined ? {} : { correlationId: request.correlationId })
        })
      );
    }

    return delivery;
  }
}
