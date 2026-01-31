# API Schema (Draft)

## Overview
- Base URL: `/api/v1`
- WebSocket: `/ws/interview/{session_id}`

## Endpoints

### 1. Resume Analysis
- **POST** `/analysis`
  - Body: Multipart Form (File: Resume PDF/Image, Text: JD)
  - Response: `{ "task_id": "uuid" }` (Async processing)

- **GET** `/analysis/{task_id}`
  - Response: `{ "status": "processing" | "completed", "result": { ... } }`

### 2. Interview Session
- **POST** `/interview/session`
  - Body: `{ "analysis_id": "uuid" }`
  - Response: `{ "session_id": "uuid", "connection_token": "..." }`

### 3. WebSocket Protocol
- **Connect:** `ws://host/ws/interview/{session_id}`
- **Messages:**
  - Client -> Server: `{ "type": "audio", "data": "base64..." }` (or binary)
  - Server -> Client: `{ "type": "audio", "data": "base64..." }`
  - Server -> Client: `{ "type": "transcript", "text": "..." }`
