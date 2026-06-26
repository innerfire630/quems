# SSE Stability Test

**Version:** 1.0.0
**Status:** QA Documentation
**Parent Document:** Sub-Phase 5.3.3

---

## 1. Overview

This document describes the stability test for the Server-Sent Events (SSE) infrastructure. The SSE system is the real-time backbone — it powers the display board, officer dashboard, and security screen. This test verifies the system can handle production-level concurrent connection loads without dropping events or leaking memory.

**Why this test matters:** A few SSE connections work fine in development. 50+ concurrent connections may expose leaks or efficiency issues that are invisible in normal testing.

**Prerequisites:**

- A staging environment that mirrors production (same server specs, PostgreSQL).
- A load testing script (`scripts/load-test-sse.ts`) or manual `curl` clients.
- A monitoring tool to track the server's heap usage (e.g., `node --inspect`, `htop`).

---

## 2. Load Testing Script

The project includes a load test script at `scripts/load-test-sse.ts`. Run it against the staging environment:

```bash
tsx scripts/load-test-sse.ts --url https://staging.example.com/api/sse/global --clients 50 --duration 300
```

**Arguments:**

- `--url` — the SSE endpoint (default: `http://localhost:3000/api/sse/global`)
- `--clients` — number of concurrent SSE connections (default: 50)
- `--duration` — test duration in seconds (default: 300)
- `--events` — number of ticket call events to trigger during the test (default: 100)

The script:

- Opens N concurrent `EventSource` connections.
- Tracks events received per client.
- Periodically checks heartbeats (every 30 seconds).
- Triggers events via the API.
- Reports: total events, missed events, reconnections, average latency.
- Exits with code 0 if zero events missed, code 1 otherwise.

---

## 3. Test Cases

### Test 1: 50 Concurrent Connections — 5 Minutes

1. Start the load test: `tsx scripts/load-test-sse.ts --clients 50 --duration 300`
2. Wait 5 minutes.
3. Check the output report.

**Pass Criteria:**

- [ ] All 50 connections open successfully.
- [ ] All 50 connections remain open for the full 5 minutes (no drops).
- [ ] Heartbeats are received on schedule by all clients.
- [ ] Server heap usage is stable (no continuous upward trend).

### Test 2: 100 Concurrent Connections — 5 Minutes

1. Start the load test with 100 clients.
2. Wait 5 minutes.

**Pass Criteria:**

- [ ] All 100 connections open successfully.
- [ ] All connections remain open (may need server scaling for this load).
- [ ] Server heap usage is stable.

### Test 3: 50 Connections + 100 Events

1. Start the load test with 50 clients.
2. During the test, trigger 100 ticket call events (the script handles this automatically).
3. Wait for the test to complete.

**Pass Criteria:**

- [ ] All 50 clients receive all 100 events (zero dropped events).
- [ ] Events arrive in FIFO order (no reordering).
- [ ] Average event latency is < 500ms.

### Test 4: Abrupt Client Disconnect

1. Start the load test with 50 clients.
2. After 1 minute, abruptly close 25 clients (kill the processes or close the browser tabs).
3. Wait 2 minutes.

**Pass Criteria:**

- [ ] The server detects the disconnects and removes the 25 clients from the SSE manager.
- [ ] The remaining 25 clients continue to receive events without interruption.
- [ ] No orphaned clients remain in the manager (check via server logs or a debug endpoint).

### Test 5: Network Timeout Simulation

1. Start the load test with 50 clients.
2. Simulate a 30-second network drop on 10 clients (use `iptables` DROP rule or a network proxy).
3. Restore the network.

**Pass Criteria:**

- [ ] The 10 affected clients reconnect after the network is restored.
- [ ] The reconnection uses exponential backoff (1s, 2s, 4s, 8s, max 30s).
- [ ] No events are permanently lost (the clients catch up via re-fetching state if needed).

---

## 4. Pass Criteria (Summary)

- [ ] Zero events dropped across all test cases.
- [ ] All clients reach the `open` state after connection and reconnection.
- [ ] Server heap usage is stable (no upward trend over the test duration).
- [ ] No orphaned clients in the SSE manager after disconnects.
- [ ] Heartbeats arrive on schedule (every 30 seconds, +- 5 seconds tolerance).

---

## 5. Troubleshooting

| Issue                             | Solution                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Events dropped                    | Check `SSEManager.sendToClient()` — it must handle closed `controller` gracefully. Check connection cleanup on `cancel` event                   |
| Heap usage growing                | Check for memory leaks: event payload sizes (large payloads accumulate), client map not being cleaned up on disconnect, closure references      |
| Clients fail to reconnect         | Check `useSSE` hook's reconnect logic, the exponential backoff, the `EventSource` API's `withCredentials` setting                               |
| nginx buffering SSE               | Verify `proxy_buffering off` and `proxy_cache off` in the nginx config. Without these, nginx buffers events and clients receive them in batches |
| nginx timeout killing connections | Verify `proxy_read_timeout 86400s` (24 hours). The default 60s kills SSE connections                                                            |

---

_End of SSE Stability Test — Version 1.0.0_
