# ZeaWatch API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "preferredLanguage": "en"
}
```

**Response:** `201 Created`
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "verified": false
  }
}
```

---

### GET /api/auth/verify?token={token}
Verify email address using verification token.

**Response:** HTML success page or error JSON

---

### POST /api/auth/login
Login user and receive access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "access_token": "jwt_token",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "verified": true,
    "preferred_language": "en",
    "subscription_tier": "free"
  }
}
```

**Cookies:** Sets `refresh_token` as HTTP-only cookie

---

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request:** Cookie with `refresh_token` or JSON body with `refresh_token`

**Response:** `200 OK`
```json
{
  "access_token": "new_jwt_token"
}
```

---

### POST /api/auth/forgot
Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

---

### POST /api/auth/reset
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "NewSecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successful"
}
```

---

### GET /api/auth/me
Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "verified": true,
    "preferred_language": "en",
    "subscription_tier": "free",
    "subscription": {...}
  }
}
```

---

## Prediction Endpoints

### POST /api/analyze
Analyze maize leaf image for disease detection.

**Headers:** `Authorization: Bearer <token>` (optional for guest)

**Request:** `multipart/form-data`
- `image`: Image file (PNG, JPG, JPEG, GIF, WEBP)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "disease": "Northern Leaf Blight",
  "confidence": 0.875,
  "confidence_display": "87.5%",
  "description": "...",
  "recommendation": "...",
  "image_url": "/static/uploads/filename.jpg",
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Note:** Confidence is always in [0, 1] range. Frontend converts to percentage for display.

---

## Subscription Endpoints

### POST /api/payments/checkout-session
Create payment checkout session for subscription.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "tier": "premium1"
}
```

**Response:** `200 OK`
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "session_id"
}
```

---

### POST /api/payments/webhook
Handle payment webhook from Stripe/M-Pesa.

**Note:** This endpoint is called by payment providers, not directly by clients.

---

### GET /api/subscriptions/current
Get current user's subscription.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "subscription": {
    "id": "uuid",
    "tier": "premium1",
    "status": "active",
    "expires_at": "2024-02-01T12:00:00Z"
  }
}
```

---

### POST /api/subscriptions/cancel
Cancel current subscription.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "message": "Subscription canceled"
}
```

---

## Admin Endpoints

All admin endpoints require `role: "admin"` in JWT token.

### GET /api/admin/users
Get all users with filters.

**Query Parameters:**
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)
- `email`: Filter by email (partial match)
- `verified`: Filter by verified status (true/false)
- `subscription_tier`: Filter by subscription tier

**Response:** `200 OK`
```json
{
  "users": [...],
  "count": 50
}
```

---

### GET /api/admin/predictions
Get all predictions with filters.

**Query Parameters:**
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)
- `user_id`: Filter by user ID
- `label`: Filter by disease label (partial match)

**Response:** `200 OK`
```json
{
  "predictions": [...],
  "count": 100
}
```

---

### GET /api/admin/predictions/export
Export predictions as CSV.

**Query Parameters:** Same as `/api/admin/predictions`

**Response:** CSV file download

---

### GET /api/admin/stats
Get admin statistics.

**Response:** `200 OK`
```json
{
  "total_users": 1000,
  "verified_users": 850,
  "active_subscriptions": 200,
  "total_predictions": 5000,
  "avg_confidence": 0.82,
  "subscription_breakdown": {
    "free": 800,
    "premium1": 150,
    "premium2": 50
  }
}
```

---

### POST /api/admin/users/{user_id}/subscription
Update user subscription (admin).

**Request Body:**
```json
{
  "tier": "premium1"
}
```

**Response:** `200 OK`
```json
{
  "message": "Subscription updated",
  "user": {
    "id": "uuid",
    "subscription_tier": "premium1"
  }
}
```

---

### POST /api/admin/impersonate/{user_id}
Generate impersonation token for user (debugging).

**Response:** `200 OK`
```json
{
  "message": "Impersonation token generated",
  "access_token": "jwt_token",
  "user": {...}
}
```

---

## Error Responses

All endpoints return errors in consistent format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {...}  // Optional
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Input validation failed
- `INVALID_CREDENTIALS`: Wrong email/password
- `EMAIL_NOT_VERIFIED`: Email not verified
- `NO_TOKEN`: Missing authentication token
- `INVALID_TOKEN`: Invalid or expired token
- `FORBIDDEN`: Insufficient permissions
- `USER_NOT_FOUND`: User does not exist
- `INTERNAL_ERROR`: Server error

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error


