# QuickNotes REST API Design

## Purpose and conventions

This document describes the **proposed production QuickNotes API**, not the JSONPlaceholder practice service used by the browser client. The production service uses `/api/v1`, JSON request/response bodies, HTTPS, and bearer-token authentication for protected routes. IDs are opaque identifiers. Timestamps are ISO 8601 UTC strings. Pagination uses `limit` and `cursor`.

Base URL: `https://api.quicknotes.example/api/v1`

## Endpoint catalogue

| Method | Path | Description | Success status |
|---|---|---|---:|
| POST | `/auth/register` | Create a user account | `201 Created` |
| POST | `/auth/login` | Authenticate and issue access/refresh tokens | `200 OK` |
| GET | `/notes` | List the authenticated user's notes; supports `limit`, `cursor`, `tag` | `200 OK` |
| POST | `/notes` | Create a note owned by the authenticated user | `201 Created` |
| GET | `/notes/{noteId}` | Retrieve one owned note | `200 OK` |
| PATCH | `/notes/{noteId}` | Update selected note fields | `200 OK` |
| DELETE | `/notes/{noteId}` | Delete a note owned by the user | `204 No Content` |
| GET | `/tags` | List the authenticated user's tags | `200 OK` |
| POST | `/notes/{noteId}/tags/{tagId}` | Attach an existing tag to a note | `204 No Content` |

All note and tag routes require a valid access token. The server must enforce ownership on every resource lookup; an ID alone must never grant access.

## Create a note

Request:

```http
POST /api/v1/notes
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "title": "Ideas for Saturday",
  "body": "Review the project plan and call the team.",
  "tagIds": ["tag_8f3a"]
}
```

Response (`201 Created`):

```json
{
  "data": {
    "id": "note_2c91",
    "userId": "user_104",
    "title": "Ideas for Saturday",
    "body": "Review the project plan and call the team.",
    "tags": [{"id": "tag_8f3a", "name": "Planning"}],
    "createdAt": "2026-10-11T08:00:00Z",
    "updatedAt": "2026-10-11T08:00:00Z"
  }
}
```

The server derives `userId` from the authenticated identity rather than trusting a client-supplied owner ID. Titles are required and limited to 100 characters; bodies are optional. Unknown fields should be rejected or ignored consistently and documented.

## List notes

Request:

```http
GET /api/v1/notes?limit=2&cursor=eyJpZCI6...
Authorization: Bearer <access-token>
```

Response (`200 OK`):

```json
{
  "data": [
    {
      "id": "note_2c91",
      "userId": "user_104",
      "title": "Ideas for Saturday",
      "body": "Review the project plan and call the team.",
      "tags": [{"id": "tag_8f3a", "name": "Planning"}],
      "createdAt": "2026-10-11T08:00:00Z",
      "updatedAt": "2026-10-11T08:00:00Z"
    },
    {
      "id": "note_2c92",
      "userId": "user_104",
      "title": "Reading list",
      "body": "Database design chapter.",
      "tags": [],
      "createdAt": "2026-10-10T17:15:00Z",
      "updatedAt": "2026-10-10T17:15:00Z"
    }
  ],
  "page": {"limit": 2, "nextCursor": "eyJpZCI6..."}
}
```

Omit `cursor` on the first page. Set a maximum page size (for example, 100) and use stable cursor pagination rather than unbounded offset pagination for large datasets.

## Error contract

Use a consistent JSON envelope and avoid leaking SQL, stack traces, tokens, or other internal details.

| Status | Meaning | Example situation |
|---:|---|---|
| `400 Bad Request` | Invalid JSON, missing title, or invalid field | Title exceeds 100 characters |
| `401 Unauthorized` | Missing, expired, or invalid authentication | No bearer token |
| `403 Forbidden` | Authenticated user lacks permission | Attempt to access an admin-only operation |
| `404 Not Found` | Resource does not exist or is not visible to this user | Unknown note ID |
| `409 Conflict` | State conflict | Duplicate unique tag name for a user |
| `422 Unprocessable Entity` | Well-formed request fails business validation | Invalid tag association |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in a short interval |
| `500 Internal Server Error` | Unexpected server failure | Unhandled database/service error |
| `503 Service Unavailable` | Temporary overload or maintenance | Database failover in progress |

Example error body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title is required and must be 100 characters or fewer.",
    "details": [{"field": "title", "issue": "required"}],
    "requestId": "req_7bd291"
  }
}
```

## Security and operational notes

- Require HTTPS, hash passwords with a modern password-hashing algorithm, and store secrets outside source control.
- Apply per-user authorization, rate limits, request-size limits, and input validation.
- Use structured logs with request IDs while excluding note contents and credentials by default.
- Return `204` with no body for successful deletion; clients should not attempt to parse JSON from that response.
- Define retention, account deletion, backups, and data-export policies before launch.
