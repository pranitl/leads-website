# Prerequisites – Cloudflare Pages + Functions (MVP Lead Webhook)

**Austin Home Renovation Hub – Lead Form Integration**

Version: 1.0-MVP
Date: 2025-10-25
Purpose: Environmental and setup requirements for MVP implementation

---

## 1. Overview

**Goal**: Deploy static Astro site to Cloudflare Pages with `/api/leads` as a Pages Function (Workers runtime). The function verifies Turnstile and forwards validated leads to an n8n workflow (behind Cloudflare Access), which saves to NocoDB.

**Architecture**:
- Frontend (static) → Cloudflare Pages → `/api/leads` Function → Turnstile verify → n8n webhook → NocoDB
- Secrets managed in Cloudflare Pages environment variables
- No staging environment for MVP (local dev stub mode, production live mode)

---

## 2. Versions & Tooling

| Component | Minimum Version | Recommended | Notes |
|-----------|----------------|----------|-------|
| **Node.js** | 18.x LTS | 18.x | crypto.randomUUID() and fetch API |
| **Astro** | ^5.15.1 | ^5.15.1 | API routes and Workers runtime |
| **Package Manager** | npm 8+ or pnpm 8+ | npm | Standard for this project |
| **TypeScript** | 5.0+ | 5.0+ | Configured in project |

### Local Development Setup
```bash
# Verify Node version
node --version  # Should show 18.x or higher

# Optional: Pin Node version for team consistency
echo "18" > .nvmrc
nvm install

# Install dependencies
npm install

# Local development (stub mode)
npm run dev
```

### Production Build
```bash
# Build for deployment
npm run build

# Verify output in dist/ directory
ls dist/
```

---

## 3. Cloudflare Pages Setup

### 3.1 Project Creation
1. Go to Cloudflare Dashboard → Pages
2. Create new Pages project
3. Connect to your Git repository
4. Build settings:
   - Framework preset: **None** (static site)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
   - Node.js version: `18.x`

### 3.2 Functions Configuration
1. Enable Functions for the Pages project
2. Functions runtime: **Workers** (compatible with Astro API routes)
3. Auto-bind: Functions in `functions/` directory auto-route to `/api/*`
4. Environment variables scope: **Production** (not preview)

### 3.3 Environment Variables (Production)
Set in **Cloudflare Pages → Settings → Environment variables**:

| Variable | Value | Scope | Notes |
|----------|------|-------|-------|
| `N8N_WEBHOOK_URL` | `https://your-n8n-domain.com/webhook/leads` | Production | n8n webhook URL |
| `N8N_BEARER_SECRET` | `<32+ char random secret>` | Production | Generate with `openssl rand -base64 32` |
| `TURNSTILE_SECRET_KEY` | `<turnstile secret>` | Production | From Cloudflare Turnstile dashboard |
| `PUBLIC_TURNSTILE_SITE_KEY` | `<turnstile site key>` | Production | From Cloudflare Turnstile dashboard |
| `PUBLIC_LEADS_MODE` | `live` | Production | Enables real form submissions |

### 3.4 Cloudflare WAF & Rate Limiting
Create rate limiting rule in **Cloudflare → Security → WAF → Custom rules**:

```yaml
# Rate limit /api/leads endpoint
Filter:
  - http.request.uri.path contains "/api/leads"
Action:
  - Rate Limit
Parameters:
  - Requests per minute: 5
  - Period: 60 seconds
  - Mitigation timeout: 86400 seconds (24 hours)
  - Action to take: Block
Scope:
  - Your production domain(s)
Description:
  - Rate limit lead form submissions to prevent abuse
```

### 3.5 Turnstile Configuration
1. In Cloudflare → Turnstile → Manage Widget:
   - Site key: `PUBLIC_TURNSTILE_SITE_KEY` (used in frontend)
   - Secret key: `TURNSTILE_SECRET_KEY` (used in Function)
2. Widget mode: **Managed** (recommended)
3. Verify domain is added to Turnstile site list

---

## 4. n8n Setup (Behind Cloudflare Access)

### 4.1 Cloudflare Access Configuration
Since n8n is behind Cloudflare Access:

1. In Zero Trust → Access → Applications:
   - Create **Service Token** for n8n
   - Client ID: Store in Cloudflare Pages env as `CF_ACCESS_CLIENT_ID`
   - Client Secret: Store in Cloudflare Pages env as `CF_ACCESS_CLIENT_SECRET`

2. Add Service Token to n8n:
   - n8n Settings → Security → Cloudflare Access
   - Enter Client ID and Client Secret

3. Access Policy:
   - Allow Service Token access
   - Restrict to your Pages Function's IP ranges if desired
   - Enable audit logging

### 4.2 n8n Environment Variables
Set in **n8n → Settings → Environment variables**:

| Variable | Value | Notes |
|----------|------|-------|
| `N8N_BEARER_SECRET` | `<same secret as Cloudflare Pages>` | Must match exactly |
| `NOCODB_API_TOKEN` | `<NocoDB API token>` | Write access to Leads base |

### 4.3 Webhook Configuration
- Webhook path: `/webhook/leads`
- Production URL: `https://your-n8n-domain.com/webhook/leads`
- Authentication: Bearer token (no built-in auth)
- Response mode: Response Node (returns custom JSON)

### 4.4 Workflow Security
- Verify `Authorization: Bearer <secret>` header exactly
- Reject invalid tokens with 401 response
- Log all verification attempts for troubleshooting

---

## 5. NocoDB Configuration

### 5.1 Instance Access
- URL: `https://nocodb.pranitlab.com/`
- Base: **Leads**
- Table: **Leads**

### 5.2 API Token
1. In NocoDB:
   - Account Settings → API Tokens
   - Generate new token
   - Permissions: **Write** access to Leads base
2. Store token in n8n environment as `NOCODB_API_TOKEN`

### 5.3 Field Schema
Ensure these fields exist in the Leads table (adjust mapping in n8n if different):

| Field Name | Type | Required | Notes |
|-------------|------|---------|-------|
| `LeadID` | Text/VarChar | Yes | UUID from submission |
| `Name` | Text/VarChar | Yes | Full name |
| `Email` | Text/VarChar | Yes | Email address |
| `Phone` | Text/VarChar | Yes | 10-digit phone |
| `Address` | Text/VarChar | Yes | Full address |
| `Service` | Text/VarChar | Yes | Service slug |
| `Subservice` | Text/VarChar | No | Optional subservice |
| `Timeline` | Text/VarChar | Yes | asap/1-2-weeks/flexible |
| `Budget` | Text/VarChar | Yes | Budget range |
| `Details` | Text/VarChar | No | Project description |
| `Source` | Text/VarChar | Yes | Form origin |
| `SubmittedAt` | DateTime/Timestamp | Yes | ISO 8601 timestamp |

---

## 6. Pages Function Implementation

### 6.1 File Structure
```
/leads-website/
├── functions/
│   └── api/
│       └── leads.ts          # Pages Function (Workers runtime)
├── src/
│   ├── pages/
│   │   └── api/          # Remove old API route
│   └── components/
│       └── LeadFormPanel.tsx
├── package.json
├── astro.config.mjs              # No adapter needed for Pages
└── .env.example
```

### 6.2 Function Handler Template
```typescript
// functions/api/leads.ts
import type { PagesFunction } from '@cloudflare/workers-types';

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const body = await request.json();

    // Minimal validation
    if (!body?.service || !body?.zip || !body?.name || !body?.email || !body?.phone || body?.consent !== true || !body?.captchaToken) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Turnstile verification
    const ip = request.headers.get('cf-connecting-ip') || undefined;
    const form = new URLSearchParams();
    form.set('secret', env.TURNSTILE_SECRET_KEY);
    form.set('response', body.captchaToken);
    if (ip) form.set('remoteip', ip);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), { status: 401 });
    }

    // Build payload
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

    // Prepare headers for n8n
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.N8N_BEARER_SECRET}`,
    };

    // Add Cloudflare Access headers if configured
    if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
      headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
      headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
    }

    // Send to n8n
    const n8nRes = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), { status: 503 });
    }

    return new Response(JSON.stringify({
      success: true,
      leadId: payload.id,
      message: 'Lead submitted successfully'
    }), { status: 200 });

  } catch (error) {
    console.error('Lead submission error:', error?.message || String(error));
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
```

---

## 7. Connectivity & Firewall

### 7.1 Required Outbound Connections
All outbound HTTPS (443) connections must be allowed:

| From | To | Purpose |
|------|----|---------|
| **Pages Function** | `challenges.cloudflare.com` | Turnstile verification |
| **Pages Function** | `your-n8n-domain.com` | Webhook submission |
| **n8n** | `nocodb.pranitlab.com` | Lead storage |

### 7.2 DNS Resolution
- `your-domain.com` → Cloudflare Pages
- `challenges.cloudflare.com` → Cloudflare
- `your-n8n-domain.com` → n8n hosting
- `nocodb.pranitlab.com` → NocoDB instance

### 7.3 SSL/TLS
- All endpoints must use HTTPS
- TLS 1.2+ enforced everywhere
- Valid certificates required

---

## 8. Local Development

### 8.1 Environment File (.env)
```bash
# Analytics - Optional
PUBLIC_GA4_ID=

# Lead Form Configuration
PUBLIC_LEADS_MODE=stub

# CAPTCHA Configuration
PUBLIC_CAPTCHA_PROVIDER=turnstile
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Google Maps API - Used for address autocomplete in lead forms
PUBLIC_GOOGLE_MAPS_API_KEY=

# Development
NODE_ENV=development
PORT=4321
```

### 8.2 Testing the Function
```bash
# Deploy to preview
wrangler pages dev functions/api/leads.ts

# Test with curl
curl -X POST https://your-domain.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "service": "landscaping",
    "zip": "78701",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "5125551234",
    "address": "123 Test St",
    "timeline": "asap",
    "budget": "5000-plus",
    "consent": true,
    "source": "test",
    "captchaToken": "test-token"
  }'
```

---

## 9. Validation & Testing

### 9.1 End-to-End Test Commands

**Test Turnstile Verification:**
```bash
# Get a real Turnstile token from your site first, then:
curl -X POST https://challenges.cloudflare.com/turnstile/v0/siteverify \
  -d "secret=$TURNSTILE_SECRET_KEY" \
  -d "response=YOUR_REAL_TOKEN" \
  -d "remoteip=1.2.3.4"
```

**Test n8n Webhook:**
```bash
curl -X POST https://your-n8n-domain.com/webhook/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_N8N_SECRET" \
  -d '{
    "id": "test-123",
    "timestamp": "2025-10-25T12:00:00Z",
    "source": "test",
    "lead": {
      "name": "Test User",
      "email": "test@example.com",
      "phone": "5125551234",
      "address": "123 Test St",
      "service": "landscaping",
      "zip": "78701",
      "timeline": "asap",
      "budget": "5000-plus",
      "consent": true
    }
  }'
```

**Test NocoDB Record Creation:**
```bash
curl -X POST https://nocodb.pranitlab.com/api/v2/projects/Leads/tables/Leads/records \
  -H "Content-Type: application/json" \
  -H "xc-token: YOUR_NOCODB_TOKEN" \
  -d '{
    "Lead ID": "test-123",
    "Name": "Test User",
    "Email": "test@example.com",
    "Phone": "5125551234",
    "Address": "123 Test St",
    "Service": "landscaping",
    "Timeline": "asap",
    "Budget": "5000-plus",
    "Source": "test",
    "Submitted At": "2025-10-25T12:00:00Z"
  }'
```

### 9.2 Pre-Launch Checklist

- [ ] Cloudflare Pages project created and connected to Git
- [ ] Functions enabled in Pages settings
- [ ] Environment variables configured in Cloudflare Pages
- [ ] WAF rate limiting rule created for `/api/leads`
- [ ] Turnstile widget configured and working on frontend
- [ ] n8n workflow created and active
- [ ] n8n environment variables set
- [ ] Cloudflare Access configured for n8n (if applicable)
- [ ] NocoDB API token generated with write permissions
- [ ] NocoDB Leads table schema verified
- [ ] Local development environment working with `npm run dev`
- [ ] `functions/api/leads.ts` created and tested locally

### 9.3 Production Deployment Checklist

- [ ] `npm run build` completes successfully
- [ ] Functions deployed to Cloudflare Pages
- [ ] `/api/leads` endpoint accessible and returns 400 on missing fields
- [ ] Turnstile verification working (returns 401 on bad token)
- [ ] Valid submission returns 200 with leadId
- [ ] n8n receives payload and processes successfully
- [ ] NocoDB record created with all fields
- [ ] Error scenarios return appropriate status codes
- [ ] Cloudflare rate limiting active (test with rapid requests)

---

## 10. Troubleshooting

### 10.1 Common Issues

**Pages Function Not Found (404)**
- Verify `functions/api/leads.ts` exists
- Check Functions is enabled in Pages settings
- Ensure build includes functions directory

**CAPTCHA Verification Always Fails**
- Verify TURNSTILE_SECRET_KEY matches between Cloudflare and Pages env
- Check Turnstile widget is using correct site key
- Ensure `cf-connecting-ip` header is available

**n8n Webhook Fails**
- Verify N8N_WEBHOOK_URL is correct and publicly accessible
- Check N8N_BEARER_SECRET matches exactly between Pages and n8n
- If using Cloudflare Access, verify CF-Access headers are set

**NocoDB Record Not Created**
- Verify NOCODB_API_TOKEN has write permissions
- Check field names match exactly between n8n and NocoDB
- Test NocoDB API directly with curl

### 10.2 Debug Information

**Enable Debug Logging in Pages Function:**
```typescript
// Add at top of function
console.log('Function invoked:', {
  method: request.method,
  url: request.url,
  headers: Object.fromEntries(request.headers.entries()),
  body: await request.text(),
  env: Object.keys(env)
});
```

**Check Cloudflare Pages Logs:**
1. Cloudflare Dashboard → Pages → Your Project → Functions
2. View real-time logs and historical executions
3. Filter by function name and time range

---

## 11. Security Considerations

### 11.1 Secret Management
- Use Cloudflare Pages environment variables for production secrets
- Never commit secrets to Git
- Rotate secrets quarterly or on compromise
- Use separate secrets for development vs production

### 11.2 Input Validation
- Validate all required fields before processing
- Sanitize inputs to prevent injection
- Use type checking where possible

### 11.3 Rate Limiting
- Implement Cloudflare WAF rate limiting
- Monitor for abuse patterns
- Consider CAPTCHA score thresholds

### 11.4 HTTPS Only
- Enforce HTTPS everywhere
- Use secure headers in API responses
- No mixed content on pages

---

## 12. Monitoring & Maintenance

### 12.1 Production Monitoring
- Monitor Cloudflare Pages Function logs
- Check n8n workflow execution logs
- Verify NocoDB record creation
- Monitor error rates and response times

### 12.2 Backup Strategy
- NocoDB regular backups (configured by NocoDB admin)
- Export n8n workflows regularly
- Keep Git history of configuration changes

### 12.3 Performance
- Monitor Function cold start times
- Optimize bundle size for faster Functions
- Consider edge caching for static assets

---

**End of Prerequisites**
