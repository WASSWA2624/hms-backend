/**
 * WebSocket Event Types
 * 
 * Centralized WebSocket event type constants per websockets.mdc
 * All WebSocket messages must follow format: { "event": "event_name", "payload": {} }
 * Event types must be centralized in lib/websocket/events.js
 * 
 * Only services may emit WebSocket events
 * Controllers must not emit events directly
 */

/**
 * Connection Events
 * Events related to WebSocket connection lifecycle
 */
const CONNECTION_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  HEARTBEAT: 'heartbeat',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error'
};

/**
 * Authentication Events
 * Events related to user authentication
 */
const AUTH_EVENTS = {
  AUTHENTICATED: 'authenticated',
  AUTHENTICATION_FAILED: 'authentication_failed',
  SESSION_EXPIRED: 'session_expired',
  UNAUTHORIZED: 'unauthorized'
};

/**
 * All WebSocket Events
 * Combined export of all event types
 */
const WS_EVENTS = {
  ...CONNECTION_EVENTS,
  ...AUTH_EVENTS
};

module.exports = {
  // Individual event groups
  CONNECTION_EVENTS,
  AUTH_EVENTS,
  // Future app-specific events should be added in later phases
  
  // Combined events
  WS_EVENTS
};

