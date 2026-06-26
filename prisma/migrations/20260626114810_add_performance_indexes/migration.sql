-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "BroadcastMessage_isActive_expiresAt_idx" ON "BroadcastMessage"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "CounterStatusEvent_counterId_createdAt_idx" ON "CounterStatusEvent"("counterId", "createdAt");

-- CreateIndex
CREATE INDEX "CounterStatusEvent_status_createdAt_idx" ON "CounterStatusEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_counterOfficerId_status_idx" ON "Notification"("counterOfficerId", "status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationReply_notificationId_idx" ON "NotificationReply"("notificationId");

-- CreateIndex
CREATE INDEX "Ticket_serviceId_businessDate_idx" ON "Ticket"("serviceId", "businessDate");

-- CreateIndex
CREATE INDEX "Ticket_status_businessDate_idx" ON "Ticket"("status", "businessDate");

-- CreateIndex
CREATE INDEX "TicketEvent_eventType_createdAt_idx" ON "TicketEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEvent_ticketId_createdAt_idx" ON "TicketEvent"("ticketId", "createdAt");
