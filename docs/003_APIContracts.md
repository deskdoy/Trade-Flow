# API Contracts: TradeFlow

All TradeFlow API endpoints follow a standardized response wrapper for consistency and seamless parsing by frontend consumers.

## Response Wrapper

Every response is wrapped in a generic container specifying success, data payload, or error particulars:

### Success Payload Schema
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Payload Schema
```json
{
  "success": false,
  "error": {
    "message": "String explaining the failure",
    "statusCode": 400,
    "details": null,
    "timestamp": "2026-07-18T00:00:00.000Z"
  }
}
```

## Available Endpoints

### GET `/api/health`

Fetches system operational status, memory indicators, CPU thread counts, and active database configurations.

- **URL**: `/api/health`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**:
  - **Code**: `200 OK`
  - **Payload**:
    ```json
    {
      "success": true,
      "data": {
        "status": "UP",
        "timestamp": "2026-07-18T00:14:02.471Z",
        "uptimeSeconds": 112.484,
        "system": {
          "platform": "linux",
          "memoryFree": 3791847424,
          "memoryTotal": 4294967296,
          "cpuCount": 2
        },
        "database": {
          "connected": false,
          "provider": "PostgreSQL",
          "configured": false
        },
        "version": "1.0.0"
      }
    }
    ```
