/**
 * WebSocket utilities barrel export
 * 
 * @description Centralized exports for WebSocket helpers. Allows importing `@lib/websocket`.
 * Per websockets.mdc: WebSocket events are defined here.
 */

const { 
  WS_EVENTS, 
  CONNECTION_EVENTS, 
  AUTH_EVENTS
} = require('@lib/websocket/events');

const { emitToUser, emitBroadcast, emitToUsers } = require('@lib/websocket/emit');

module.exports = {
  // Event constants
  WS_EVENTS,
  CONNECTION_EVENTS,
  AUTH_EVENTS,
  // App-specific event groups are added in later phases
  
  // Emission utilities (for services)
  emitToUser,
  emitBroadcast,
  emitToUsers
};

