import { createId, fail, nowIso, ok, type Result } from "./platform-core";

export type WorkflowKind = string;

export interface WorkflowEvent {
  type: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export interface WorkflowTransition {
  eventType: string;
  targetState: string;
}

export interface WorkflowState {
  name: string;
  terminal?: boolean;
  transitions: WorkflowTransition[];
}

export interface WorkflowDefinition {
  workflowKind: WorkflowKind;
  version: number;
  initialState: string;
  states: Record<string, WorkflowState>;
}

export interface WorkflowInstance {
  instanceId: string;
  workflowKind: WorkflowKind;
  definitionVersion: number;
  currentState: string;
  status: "active" | "completed";
  data: Record<string, unknown>;
  history: Array<{
    fromState: string;
    toState: string;
    eventType: string;
    occurredAt: string;
    correlationId?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export class WorkflowEngine {
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly instances = new Map<string, WorkflowInstance>();

  register(definition: WorkflowDefinition): Result<void> {
    if (definition.states[definition.initialState] === undefined) {
      return fail(new Error(`Initial state ${definition.initialState} is not defined.`));
    }

    this.definitions.set(this.key(definition.workflowKind, definition.version), definition);
    return ok(undefined);
  }

  async start(
    workflowKind: WorkflowKind,
    version: number,
    data: Record<string, unknown> = {}
  ): Promise<Result<WorkflowInstance>> {
    const definition = this.definitions.get(this.key(workflowKind, version));

    if (definition === undefined) {
      return fail(new Error(`Workflow definition ${workflowKind}:${version} is not registered.`));
    }

    const now = nowIso();
    const instance: WorkflowInstance = {
      instanceId: createId("wf"),
      workflowKind,
      definitionVersion: version,
      currentState: definition.initialState,
      status: "active",
      data: { ...data },
      history: [],
      createdAt: now,
      updatedAt: now
    };

    this.instances.set(instance.instanceId, instance);

    return ok(this.clone(instance));
  }

  get(instanceId: string): Result<WorkflowInstance> {
    const instance = this.instances.get(instanceId);

    if (instance === undefined) {
      return fail(new Error(`Workflow instance ${instanceId} is not registered.`));
    }

    return ok(this.clone(instance));
  }

  private key(workflowKind: WorkflowKind, version: number): string {
    return `${workflowKind}:${version}`;
  }

  private clone(instance: WorkflowInstance): WorkflowInstance {
    return {
      ...instance,
      data: { ...instance.data },
      history: instance.history.map((entry) => ({ ...entry }))
    };
  }
}
