import type { Suggestion } from '@/types/suggestion';

export type SuggestionEventType = 'accept' | 'reject' | 'modify' | 'add' | 'clear';

export interface SuggestionEvent {
  type: SuggestionEventType;
  suggestion?: Suggestion;
  timestamp: number;
}

type EventHandler = (event: SuggestionEvent) => void;

const handlers = new Set<EventHandler>();

export const suggestionEvents = {
  subscribe(handler: EventHandler): () => void {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },

  dispatch(event: SuggestionEvent): void {
    handlers.forEach((handler) => handler(event));
  },

  emitAccept(suggestion: Suggestion): void {
    this.dispatch({ type: 'accept', suggestion, timestamp: Date.now() });
  },

  emitReject(suggestion: Suggestion): void {
    this.dispatch({ type: 'reject', suggestion, timestamp: Date.now() });
  },

  emitModify(suggestion: Suggestion): void {
    this.dispatch({ type: 'modify', suggestion, timestamp: Date.now() });
  },

  emitAdd(suggestion: Suggestion): void {
    this.dispatch({ type: 'add', suggestion, timestamp: Date.now() });
  },

  emitClear(): void {
    this.dispatch({ type: 'clear', timestamp: Date.now() });
  },
};
