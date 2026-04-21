/**
 * State machine utilities for auto-run lifecycle states
 */

export type AutoRunLifecycleState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error';

export interface StateMachine<S extends string> {
  state: S;
  transition: (newState: S) => void;
  canTransition: (from: S, to: S) => boolean;
}

/** Create a state machine with allowed transitions */
export function createStateMachine<S extends string>(
  initialState: S,
  transitions: Record<S, S[]>
): StateMachine<S> {
  let state = initialState;

  return {
    get state() { return state; },
    transition(newState: S) {
      if (this.canTransition(state, newState)) {
        state = newState;
      }
    },
    canTransition(from: S, to: S): boolean {
      return transitions[from]?.includes(to) ?? false;
    }
  };
}