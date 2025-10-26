interface Env {
  TURNSTILE_SECRET_KEY: string;
  N8N_BEARER_SECRET: string;
  N8N_WEBHOOK_URL: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

interface LeadSubmissionRequest {
  service: string;
  zip: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  timeline: 'asap' | '1-2-weeks' | 'flexible';
  budget: '1000-3000' | '3000-5000' | '5000-plus' | 'unsure';
  details?: string;
  consent: boolean;
  source: string;
  captchaToken: string;
  subservice?: string;
}

type MyPagesFunction = (context: {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  next(input?: Request | string, init?: RequestInit | Request): Promise<Response>;
}) => Promise<Response>;

export const onRequestPost: MyPagesFunction = async ({ request, env }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Minimal validation
    if (!body?.service || !body?.zip || !body?.name || !body?.email || !body?.phone || body?.consent !== true || !body?.captchaToken) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
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

    // Send to n8n webhook
    const n8nRes = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      leadId: payload.id,
      message: 'Lead submitted successfully'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Lead submission error:', errorMessage);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
