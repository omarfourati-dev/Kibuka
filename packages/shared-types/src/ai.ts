export type MessageRole = 'user' | 'assistant' | 'system';
export type AgentStatus = 'idle' | 'running' | 'done' | 'error';
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  spaceId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  spaceId: string;
  filename: string;
  contentType: string;
  status: DocumentStatus;
  chunkCount?: number;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  task: string;
  status: AgentStatus;
  tools: string[];
  result?: string;
  steps: AgentStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentStep {
  id: string;
  type: 'thought' | 'tool_call' | 'observation' | 'final';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  createdAt: string;
}

export interface AIUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  createdAt: string;
}
