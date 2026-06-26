// =============================================================================
// src/lib/fcm-cleanup-listener.ts — FCM token cleanup wiring (4.1.2)
// =============================================================================
// This module subscribes the FCM invalid-token callback to the device token
// deactivation function. Import it once at app boot (in instrumentation.ts)
// to activate the cleanup. Without this, dead FCM tokens are never deactivated.
//
// The subscription is a side-effect of importing this module. No exports.
// =============================================================================

import { setOnInvalidTokenCallback } from '@/lib/notification-service';
import { deactivateToken } from '@/lib/device-token';

// Wire the FCM invalid-token callback to device token deactivation
setOnInvalidTokenCallback(deactivateToken);
