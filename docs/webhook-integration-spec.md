# n8n Webhook Integration Specification (MVP)
**Austin Home Renovation Hub - Lead Form Integration**

Version: 1.0-MVP
Date: 2025-10-25
Author: System Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Authentication](#authentication)
4. [API Endpoint Design](#api-endpoint-design)
5. [Payload Structures](#payload-structures)
6. [Environment Configuration](#environment-configuration)
7. [n8n Workflow Setup](#n8n-workflow-setup)
8. [Error Handling](#error-handling)
9. [Manual Testing Checklist](#manual-testing-checklist)
10. [Implementation Steps](#implementation-steps)

---

## Executive Summary

### Purpose
Implement a simple webhook integration to forward validated lead form submissions from the Austin Home Renovation Hub website to an n8n workflow that saves leads to NocoDB.

### Current State
- **Frontend**: Fully functional 2-step lead qualification form (`LeadFormPanel.tsx`)
- **Form Mode**: Operating in `stub` mode (simulated submissions)
- **Backend**: No API endpoint currently implemented
- **Security**: CAPTCHA (Turnstile) implemented client-side, needs server verification

### Target State (MVP)
- Astro API endpoint at `/api/leads` receives form submissions
- Verifies CAPTCHA token server-side
- Forwards to n8n webhook with Bearer token authentication
- n8n saves lead to NocoDB "Leads" base
- Returns success/error response to frontend

### Key Technologies
- **Framework**: Astro 5.15.1 (Static Site Generator with API routes)
- **Frontend**: Preact 10.27.2
- **CAPTCHA**: Cloudflare Turnstile
- **Authentication**: Bearer token (high-entropy secret)
- **Target**: n8n Webhook → NocoDB
- **Protection**: Cloudflare WAF/Bot protection + edge rate limiting

---

## System Architecture

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│                                                                     │
│  ┌──────────────────┐                                              │
│  │ LeadFormPanel.tsx│                                              │
│  │  (Preact Form)   │                                              │
│  └────────┬─────────┘                                              │
│           │ User fills form & submits                              │
│           │ with CAPTCHA token                                     │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            │ POST /api/leads
            │ { leadData, captchaToken, source }
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ASTRO API ENDPOINT                               │
│                    /src/pages/api/leads.ts                          │
│                                                                     │
│  1. Validate request body (minimal)                                │
│  2. Verify CAPTCHA token ─────────> ┌──────────────────┐          │
│                                      │ Turnstile API    │          │
│                                      │ (Cloudflare)     │          │
│                                      └──────────────────┘          │
│  3. Build payload with id/timestamp                            │
│  4. POST to n8n webhook with Bearer token                       │
│  5. Return response                                              │
└───────────┬─────────────────────────────────────────────────────────┘
            │
            │ POST with headers:
            │ Authorization: Bearer <secret>
            │ Content-Type: application/json
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         n8n WEBHOOK                                 │
│                                                                     │
│  1. Verify Bearer token                                            │
│  2. Save lead to NocoDB                                           │
│  3. Return 200 OK                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Input | Output |
|-----------|---------------|-------|--------|
| **LeadFormPanel** | UI, validation, submission | User input | POST to `/api/leads` |
| **API Endpoint** | CAPTCHA verification, forwarding | Form data + token | Webhook request |
| **Turnstile API** | Bot detection | CAPTCHA token | Verification result |
| **n8n Webhook** | Token verification, NocoDB save | Payload with Bearer token | 200/401/500 status |
| **NocoDB** | Lead storage | Lead data | Record created |

---

## Authentication

### Bearer Token Approach

For MVP, we use a simple Bearer token instead of HMAC for these reasons:
- Cloudflare WAF/bot protection provides strong security
- Turnstile prevents automated submissions
- Single secret is easier to manage and rotate
- Sufficient security for trusted n8n endpoint

### Token Generation

Generate a secure random string (minimum 32 characters):

```bash
# OpenSSL (macOS/Linux)
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Layers

```
┌─────────────────────────────────────┐
│ Layer 1: Cloudflare WAF/Bot Protection │  Prevents attacks
├─────────────────────────────────────┤
│ Layer 2: Edge Rate Limiting         │  Prevents abuse
├─────────────────────────────────────┤
│ Layer 3: CAPTCHA Verification       │  Prevents bots
├─────────────────────────────────────┤
│ Layer 4: Bearer Token              │  Authenticates requests
├─────────────────────────────────────┤
│ Layer 5: HTTPS Encryption           │  Prevents eavesdropping
└─────────────────────────────────────┘
```

---

## API Endpoint Design

### Endpoint: `POST /api/leads`

#### Request Specification

**Headers:**
```
Content-Type: application/json
```

**Body Schema:**
```typescript
interface LeadSubmissionRequest {
  // Service Selection
  service: string;           // Required: Service slug (e.g., "landscaping")
  subservice?: string;       // Optional: Subservice slug (e.g., "xeriscaping")

  // Location
  zip: string;               // Required: 5-digit ZIP code
  address: string;           // Required: Full address from Google Places

  // Contact Information
  name: string;              // Required: Full name
  email: string;             // Required: Valid email
  phone: string;             // Required: 10-digit phone (no formatting)

  // Qualification
  timeline: 'asap' | '1-2-weeks' | 'flexible';
  budget: '1000-3000' | '3000-5000' | '5000-plus' | 'unsure';
  details?: string;          // Optional: Project description

  // Consent
  consent: boolean;          // Required: Must be true

  // Metadata
  source: string;            // Required: Form origin (e.g., "contact-page")
  captchaToken: string;      // Required: Turnstile response token
}
```

**Minimal Validation Rules:**
| Field | Rule | Error Message |
|-------|------|---------------|
| `service` | Non-empty string | "Service is required" |
| `zip` | Exactly 5 digits | "ZIP code must be 5 digits" |
| `email` | Contains @ | "Invalid email address" |
| `phone` | Exactly 10 digits | "Phone must be 10 digits" |
| `consent` | Must be `true` | "Consent required" |
| `captchaToken` | Non-empty string | "CAPTCHA token missing" |

**Example Request:**
```json
POST /api/leads HTTP/1.1
Content-Type: application/json

{
  "service": "landscaping",
  "subservice": "xeriscaping",
  "zip": "78701",
  "address": "123 Main St, Austin, TX 78701, USA",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "5125551234",
  "timeline": "asap",
  "budget": "5000-plus",
  "details": "Need xeriscaping for front yard",
  "consent": true,
  "source": "contact-page",
  "captchaToken": "0.aBcDeFgHiJkLmNoPqRsTuVwXyZ..."
}
```

#### Response Specification

**Success Response (200 OK):**
```json
{
  "success": true,
  "leadId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Lead submitted successfully"
}
```

**Error Responses:**

| Status | Condition | Response Body |
|--------|-----------|---------------|
| 400 | Invalid request body | `{ "error": "Invalid request", "details": "email: Invalid format" }` |
| 401 | CAPTCHA verification failed | `{ "error": "CAPTCHA verification failed" }` |
| 503 | n8n unreachable | `{ "error": "Service temporarily unavailable" }` |
| 500 | Server error | `{ "error": "Internal server error" }` |

#### Processing Steps (Simplified)

```typescript
// Pseudocode for /api/leads endpoint
export async function POST({ request }) {
  try {
    // STEP 1: Parse and validate request
    const body = await request.json();
    
    // Minimal validation
    if (!body.service || !body.zip || !body.name || !body.email || !body.phone || !body.consent || !body.captchaToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // STEP 2: Verify CAPTCHA token
    const captchaResult = await verifyCaptcha(
      body.captchaToken,
      request.headers.get('cf-connecting-ip')
    );

    if (!captchaResult.success) {
      return new Response(
        JSON.stringify({ error: 'CAPTCHA verification failed' }),
        { status: 401 }
      );
    }

    // STEP 3: Build payload
    const payload = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: body.source,
      lead: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        service: body.service,
        subservice: body.subservice,
        zip: body.zip,
        timeline: body.timeline,
        budget: body.budget,
        details: body.details,
        consent: body.consent,
      },
    };

    // STEP 4: Send to n8n webhook
    const response = await fetch(import.meta.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.N8N_BEARER_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    // STEP 5: Return success
    return new Response(
      JSON.stringify({
        success: true,
        leadId: payload.id,
        message: 'Lead submitted successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lead submission error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

---

## Payload Structures

### Webhook Payload (Sent to n8n)

```typescript
interface WebhookPayload {
  // Unique identifier for this lead submission
  id: string;                    // UUID v4

  // Submission timestamp (ISO 8601)
  timestamp: string;             // e.g., "2025-10-25T14:32:10.123Z"

  // Form source identifier
  source: string;                // e.g., "contact-page"

  // Lead data
  lead: {
    // Contact Information
    name: string;                // Full name
    email: string;               // Email address
    phone: string;               // Phone number, 10 digits
    address: string;             // Full address

    // Service Selection
    service: string;             // Service slug (e.g., "landscaping")
    subservice?: string;         // Optional subservice slug

    // Qualification Data
    zip: string;                 // 5-digit ZIP code
    timeline: 'asap' | '1-2-weeks' | 'flexible';
    budget: '1000-3000' | '3000-5000' | '5000-plus' | 'unsure';
    details?: string;            // Optional project description

    // Consent
    consent: boolean;            // Must be true
  };
}
```

### Complete Example Payload

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-25T14:32:10.123Z",
  "source": "contact-page",
  "lead": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "5125551234",
    "address": "123 Main St, Austin, TX 78701, USA",
    "service": "landscaping",
    "subservice": "xeriscaping",
    "zip": "78701",
    "timeline": "asap",
    "budget": "5000-plus",
    "details": "Looking for xeriscaping expertise for my front yard.",
    "consent": true
  }
}
```

### HTTP Headers (Sent to n8n)

```
POST /webhook/leads HTTP/1.1
Host: your-n8n-instance.app.n8n.cloud
Content-Type: application/json
Authorization: Bearer <your-secret-token>
Content-Length: 523

{...payload...}
```

---

## Environment Configuration

### Required Environment Variables

Add to `.env`:

```bash
# ============================================================================
# n8n Webhook Integration (MVP)
# ============================================================================

# n8n webhook endpoint URL (required)
N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/leads

# Bearer secret for authentication (required)
# Generate with: openssl rand -base64 32
N8N_BEARER_SECRET=

# Cloudflare Turnstile secret key (required)
TURNSTILE_SECRET_KEY=

# Frontend mode (required for production)
PUBLIC_LEADS_MODE=live
```

### Update `.env.example`

Add placeholders to `.env.example`:

```bash
# ============================================================================
# n8n Webhook Integration (MVP)
# ============================================================================

# n8n webhook endpoint URL
N8N_WEBHOOK_URL=

# Bearer secret for authentication (generate with: openssl rand -base64 32)
N8N_BEARER_SECRET=

# Cloudflare Turnstile secret key
TURNSTILE_SECRET_KEY=

# Frontend mode
PUBLIC_LEADS_MODE=live
```

### n8n Environment Variables

Set in n8n Settings > Environment Variables:

```
N8N_BEARER_SECRET=<same-secret-as-N8N_BEARER_SECRET-in-astro-env>
NOCODB_API_TOKEN=<your-nocodb-api-token>
```

---

## n8n Workflow Setup (MVP)

### Workflow Overview

```
┌────────────────┐
│ Webhook Trigger│
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Verify Bearer  │ ◄─── CRITICAL: Reject invalid requests
│ Token          │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Save to NocoDB │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Return 200 OK  │
└────────────────┘
```

### Node Configuration Details

#### 1. Webhook Trigger Node

**Type:** `n8n-nodes-base.webhook`

**Settings:**
```json
{
  "httpMethod": "POST",
  "path": "/webhook/leads",
  "responseMode": "responseNode",
  "authentication": "none",
  "options": {
    "rawBody": true
  }
}
```

#### 2. Bearer Token Verification Node

**Type:** `n8n-nodes-base.code`

**JavaScript Code:**
```javascript
// Extract Authorization header
const authHeader = $headers['authorization'];
const expectedToken = `Bearer ${$env.N8N_BEARER_SECRET}`;

if (authHeader !== expectedToken) {
  return {
    json: {
      success: false,
      error: 'Unauthorized'
    },
    pairedItem: { item: 0 }
  };
}

// Success: Forward payload
return {
  json: $body
};
```

#### 3. Save to NocoDB Node

**Type:** `n8n-nodes-base.httpRequest`

**Settings:**
```json
{
  "method": "POST",
  "url": "https://nocodb.pranitlab.com/api/v2/projects/Leads/tables/Leads/records",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "options": {
    "headers": {
      "Content-Type": "application/json",
      "xc-token": "={{ $env.NOCODB_API_TOKEN }}"
    }
  },
  "bodyParametersUi": {
    "parameter": [
      {
        "name": "Lead ID",
        "value": "={{ $json.id }}"
      },
      {
        "name": "Name",
        "value": "={{ $json.lead.name }}"
      },
      {
        "name": "Email",
        "value": "={{ $json.lead.email }}"
      },
      {
        "name": "Phone",
        "value": "={{ $json.lead.phone }}"
      },
      {
        "name": "Address",
        "value": "={{ $json.lead.address }}"
      },
      {
        "name": "Service",
        "value": "={{ $json.lead.service }}"
      },
      {
        "name": "Subservice",
        "value": "={{ $json.lead.subservice || '' }}"
      },
      {
        "name": "Timeline",
        "value": "={{ $json.lead.timeline }}"
      },
      {
        "name": "Budget",
        "value": "={{ $json.lead.budget }}"
      },
      {
        "name": "Details",
        "value": "={{ $json.lead.details || '' }}"
      },
      {
        "name": "Source",
        "value": "={{ $json.source }}"
      },
      {
        "name": "Submitted At",
        "value": "={{ $json.timestamp }}"
      }
    ]
  }
}
```

#### 4. Response Node (Success)

**Type:** `n8n-nodes-base.respondToWebhook`

**Settings:**
```json
{
  "options": {
    "responseCode": 200,
    "responseData": "json"
  },
  "responseBody": {
    "success": true,
    "leadId": "={{ $json.id }}",
    "message": "Lead processed successfully"
  }
}
```

#### 5. Response Node (Error)

**Type:** `n8n-nodes-base.respondToWebhook`

**Settings:**
```json
{
  "options": {
    "responseCode": 401,
    "responseData": "json"
  },
  "responseBody": {
    "success": false,
    "error": "={{ $json.error || 'Internal server error' }}"
  }
}
```

### Workflow Connections

- Webhook Trigger → Bearer Token Verification
- Bearer Token Verification (success) → Save to NocoDB → Success Response
- Bearer Token Verification (failure) → Error Response

---

## Error Handling

### Simple Error Categories

| Category | HTTP Status | User Message |
|----------|-------------|--------------|
| **Validation Error** | 400 | "Invalid request data" |
| **CAPTCHA Failed** | 401 | "Please try again" |
| **n8n Down** | 503 | "Service temporarily unavailable" |
| **Server Error** | 500 | "Something went wrong" |

### Error Logging

Simple console logging for MVP:

```typescript
console.error('Lead submission error:', {
  timestamp: new Date().toISOString(),
  error: error.message,
  leadId: payload?.id || 'unknown'
});
```

---

## Manual Testing Checklist

### Pre-Launch Tests

- [ ] Submit valid lead form → Verify 200 response with leadId
- [ ] Check NocoDB → Verify record created in "Leads" base
- [ ] Submit with invalid email → Verify 400 error
- [ ] Submit with missing required field → Verify 400 error
- [ ] Submit with invalid CAPTCHA token → Verify 401 error
- [ ] Submit without consent → Verify 400 error
- [ ] Test with n8n workflow disabled → Verify 503 error
- [ ] Test Bearer token mismatch in n8n → Verify 401 error
- [ ] Test malformed JSON → Verify 400 error
- [ ] Verify Cloudflare rate limiting works (if configured)

### Post-Launch Monitoring

- [ ] Check NocoDB for new leads after form submissions
- [ ] Monitor console errors in Astro deployment
- [ ] Verify n8n workflow execution logs
- [ ] Check for any 503 errors indicating n8n downtime

---

## Implementation Steps

### Step 1: Create API Endpoint

Create `/src/pages/api/leads.ts` with the simplified implementation from the "Processing Steps" section above.

### Step 2: Configure Environment Variables

Add the required environment variables to `.env` and `.env.example`.

### Step 3: Set Up n8n Workflow

1. Create new workflow in n8n
2. Add Webhook Trigger node with path `/webhook/leads`
3. Add Bearer Token Verification code node
4. Add HTTP Request node for NocoDB
5. Add Response nodes for success/error
6. Set environment variables in n8n

### Step 4: Configure NocoDB

1. Ensure "Leads" base exists in NocoDB
2. Generate API token with write permissions
3. Verify field names match the workflow mapping

### Step 5: Update Frontend

Set `PUBLIC_LEADS_MODE=live` in production environment to enable real submissions.

### Step 6: Test End-to-End

1. Submit test form
2. Verify 200 response
3. Check NocoDB for new record
4. Test error scenarios

### Step 7: Deploy to Production

1. Deploy Astro site
2. Activate n8n workflow
3. Monitor initial submissions

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0-MVP | 2025-10-25 | System | Simplified MVP specification |

---

**End of MVP Specification**
