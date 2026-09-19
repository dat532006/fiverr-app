import { createContext } from 'react';
import type { SessionRequestContext, SessionView } from '../model/session';
import type { SessionCommands } from './session-runtime';

// Three contexts so a consumer of the (stable) commands is not re-rendered by every state
// change, and a display consumer never receives anything that carries the token.
export const SessionViewContext = createContext<SessionView | null>(null);
export const SessionCommandsContext = createContext<SessionCommands | null>(null);
export const SessionRequestContextContext = createContext<SessionRequestContext | null>(null);
