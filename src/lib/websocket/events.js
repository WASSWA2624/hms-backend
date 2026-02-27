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
 * Appointment Events
 */
const APPOINTMENT_EVENTS = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CANCELED: 'appointment.canceled'
};

/**
 * OPD Flow Events
 */
const OPD_EVENTS = {
  OPD_FLOW_UPDATED: 'opd.flow.updated'
};

/**
 * IPD Flow Events
 */
const IPD_EVENTS = {
  IPD_FLOW_UPDATED: 'ipd.flow.updated'
};

/**
 * Visit Queue Events
 */
const VISIT_QUEUE_EVENTS = {
  VISIT_QUEUE_POSITION_CHANGED: 'visit_queue.position_changed',
  VISIT_QUEUE_TRIAGE_UPDATED: 'visit_queue.triage_updated'
};

/**
 * Admission & Bed Assignment Events
 */
const ADMISSION_BED_EVENTS = {
  PATIENT_ADMITTED: 'admission.patient_admitted',
  PATIENT_TRANSFERRED: 'admission.patient_transferred',
  PATIENT_DISCHARGED: 'admission.patient_discharged',
  BED_ASSIGNMENT_CHANGED: 'admission.bed_assignment_changed'
};

/**
 * Critical Alert Events
 */
const CRITICAL_ALERT_EVENTS = {
  CRITICAL_ALERT_RAISED: 'critical_alert.raised',
  CRITICAL_ALERT_RESOLVED: 'critical_alert.resolved'
};

/**
 * Diagnostics Events (Lab/Radiology)
 */
const DIAGNOSTIC_EVENTS = {
  LAB_WORKFLOW_UPDATED: 'diagnostic.lab_workflow_updated',
  LAB_RESULT_READY: 'diagnostic.lab_result_ready',
  LAB_RESULT_UPDATED: 'diagnostic.lab_result_updated',
  RADIOLOGY_WORKFLOW_UPDATED: 'diagnostic.radiology_workflow_updated',
  RADIOLOGY_RESULT_READY: 'diagnostic.radiology_result_ready',
  RADIOLOGY_RESULT_UPDATED: 'diagnostic.radiology_result_updated'
};

/**
 * Pharmacy Events
 */
const PHARMACY_EVENTS = {
  PHARMACY_ORDER_CREATED: 'pharmacy.order_created',
  PHARMACY_ORDER_DISPENSED: 'pharmacy.order_dispensed',
  PHARMACY_ORDER_CANCELED: 'pharmacy.order_canceled'
};

/**
 * Inventory Events
 */
const INVENTORY_EVENTS = {
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  INVENTORY_STOCK_ADJUSTED: 'inventory.stock_adjusted'
};

/**
 * Emergency Dispatch Events
 */
const EMERGENCY_EVENTS = {
  EMERGENCY_CASE_ASSIGNED: 'emergency.case_assigned',
  AMBULANCE_DISPATCHED: 'emergency.ambulance_dispatched',
  AMBULANCE_ARRIVAL_UPDATED: 'emergency.ambulance_arrival_updated'
};

/**
 * Billing Events
 */
const BILLING_EVENTS = {
  BILLING_INVOICE_ISSUED: 'billing.invoice_issued',
  BILLING_PAYMENT_RECEIVED: 'billing.payment_received',
  BILLING_REFUND_PROCESSED: 'billing.refund_processed'
};

/**
 * Notification & Message Events
 */
const NOTIFICATION_EVENTS = {
  NOTIFICATION_CREATED: 'notification.created',
  CONVERSATION_MESSAGE_CREATED: 'conversation.message_created'
};

/**
 * Subscription & Entitlement Events
 */
const SUBSCRIPTION_EVENTS = {
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_DEACTIVATED: 'subscription.deactivated',
  SUBSCRIPTION_EXPIRING: 'subscription.expiring',
  MODULE_ENTITLEMENT_UPDATED: 'module.entitlement_updated'
};

/**
 * Integration Events
 */
const INTEGRATION_EVENTS = {
  INTEGRATION_WEBHOOK_RETRY: 'integration.webhook_retry',
  INTEGRATION_FAILURE: 'integration.failure',
  INTEGRATION_REPLAY_COMPLETE: 'integration.replay_complete'
};

/**
 * All WebSocket Events
 * Combined export of all event types
 */
const WS_EVENTS = {
  ...CONNECTION_EVENTS,
  ...AUTH_EVENTS,
  ...APPOINTMENT_EVENTS,
  ...OPD_EVENTS,
  ...IPD_EVENTS,
  ...VISIT_QUEUE_EVENTS,
  ...ADMISSION_BED_EVENTS,
  ...CRITICAL_ALERT_EVENTS,
  ...DIAGNOSTIC_EVENTS,
  ...PHARMACY_EVENTS,
  ...INVENTORY_EVENTS,
  ...EMERGENCY_EVENTS,
  ...BILLING_EVENTS,
  ...NOTIFICATION_EVENTS,
  ...SUBSCRIPTION_EVENTS,
  ...INTEGRATION_EVENTS
};

module.exports = {
  // Individual event groups
  CONNECTION_EVENTS,
  AUTH_EVENTS,
  APPOINTMENT_EVENTS,
  OPD_EVENTS,
  IPD_EVENTS,
  VISIT_QUEUE_EVENTS,
  ADMISSION_BED_EVENTS,
  CRITICAL_ALERT_EVENTS,
  DIAGNOSTIC_EVENTS,
  PHARMACY_EVENTS,
  INVENTORY_EVENTS,
  EMERGENCY_EVENTS,
  BILLING_EVENTS,
  NOTIFICATION_EVENTS,
  SUBSCRIPTION_EVENTS,
  INTEGRATION_EVENTS,
  
  // Combined events
  WS_EVENTS
};

