import OpenAI from "openai";

export interface AIProvider {
  generate(input: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    json?: boolean;
  }): Promise<string>;
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;

  constructor(private readonly apiKey = process.env.OPENAI_API_KEY) {}

  private getClient() {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is required to use OpenAI AI features.");
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }

    return this.client;
  }

  async generate(input: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    json?: boolean;
  }) {
    const resp = await this.getClient().chat.completions.create({
      model: input.model || process.env.AI_MODEL || "gpt-4o",
      messages: input.messages,
      max_tokens: input.maxTokens,
      temperature: input.temperature,
      response_format: input.json ? { type: "json_object" } : undefined,
    });

    return resp.choices[0].message.content ?? "";
  }
}

export class LocalModelProvider implements AIProvider {
  constructor(private readonly endpoint = process.env.LOCAL_MODEL_ENDPOINT) {}

  async generate(): Promise<string> {
    if (!this.endpoint) {
      throw new Error("LOCAL_MODEL_ENDPOINT is required for the local AI provider.");
    }
    throw new Error("Local model provider is configured but not implemented yet.");
  }
}

export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "openai";
  if (provider === "local") return new LocalModelProvider();
  return new OpenAIProvider();
}

export function getAIProviderStatus() {
  const provider = process.env.AI_PROVIDER || "openai";
  const openAiConfigured = !!process.env.OPENAI_API_KEY;
  const localConfigured = !!process.env.LOCAL_MODEL_ENDPOINT;

  return {
    provider,
    configured: provider === "local" ? localConfigured : openAiConfigured,
    status: provider === "local"
      ? localConfigured ? "configured" : "missing_local_model_endpoint"
      : openAiConfigured ? "configured" : "missing_openai_api_key",
  };
}

export const aiProvider = createAIProvider();
