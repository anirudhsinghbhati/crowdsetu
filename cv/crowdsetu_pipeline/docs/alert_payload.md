# CrowdSetu Alert Payload v1.0

The computer-vision service emits a `AlertPayload` object for the backend teammate.
The payload is a recommendation for a human operator. It does not close gates, block
entries, or trigger physical equipment.

```json
{
  "schema_version": "1.0",
  "camera_id": "gate-a",
  "zone_id": "gate-a-queue",
  "timestamp": "2026-11-17T10:00:00+00:00",
  "count": 42.0,
  "density": 3.2,
  "level": "warning",
  "threshold": 4.0,
  "recommended_action": "Ask a human operator to assess flow and consider controlled entry.",
  "model_version": "csrnet-shanghaitech-b-v0.1.0",
  "camera_health": "healthy"
}
```

`timestamp` is UTC. `level` is one of `normal`, `watch`, `warning`, or `critical`.
Invalid camera health blocks crowd notifications and should be handled as an operational
camera issue rather than a zero-count observation.