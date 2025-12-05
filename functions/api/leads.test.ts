import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestPost } from './leads';

// Mock types since we're in a node environment for testing but code expects Cloudflare types
type Env = {
  TURNSTILE_SECRET_KEY: string;
  N8N_BEARER_SECRET: string;
  N8N_WEBHOOK_URL: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
};

const mockEnv: Env = {
  TURNSTILE_SECRET_KEY: 'dummy_turnstile_secret',
  N8N_BEARER_SECRET: 'dummy_bearer_token',
  N8N_WEBHOOK_URL: 'https://n8n.example.com/webhook',
};

describe('onRequestPost', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    // Silence console.error for expected error tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const createRequest = (body: any, headers: Record<string, string> = {}) => {
    return new Request('http://localhost/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  const validBody = {
    service: 'renovation',
    zip: '90210',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '5551234567',
    consent: true,
    captchaToken: 'valid-token',
  };

  it('should return 400 if required fields are missing', async () => {
    const body = { ...validBody, name: undefined }; // Missing name
    const req = createRequest(body);
    
    const context: any = {
      request: req,
      env: mockEnv,
      params: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequestPost(context);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: 'Missing required fields' });
  });

  it('should return 401 if Turnstile verification fails', async () => {
    // Mock Turnstile failure
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false }),
    });

    const req = createRequest(validBody);
    const context: any = {
      request: req,
      env: mockEnv,
      params: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequestPost(context);
    expect(res.status).toBe(401);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.anything()
    );
  });

  it('should return 503 if n8n webhook fails', async () => {
    // Mock Turnstile success
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    // Mock n8n failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    const req = createRequest(validBody);
    const context: any = {
      request: req,
      env: mockEnv,
      params: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequestPost(context);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data).toEqual({ error: 'Service temporarily unavailable' });
  });

  it('should return 200 on successful submission', async () => {
    // Mock Turnstile success
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    // Mock n8n success
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const req = createRequest(validBody);
    const context: any = {
      request: req,
      env: mockEnv,
      params: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    const res = await onRequestPost(context);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Lead submitted successfully');
    expect(data.leadId).toBeDefined();

    // Verify n8n call arguments
    const n8nCall = (global.fetch as any).mock.calls[1];
    expect(n8nCall[0]).toBe(mockEnv.N8N_WEBHOOK_URL);
    expect(n8nCall[1].headers['X-API-Key']).toBe(mockEnv.N8N_BEARER_SECRET);
    
    const sentBody = JSON.parse(n8nCall[1].body);
    expect(sentBody.lead.email).toBe(validBody.email);
  });

  it('should include CF Access headers if configured', async () => {
     // Mock Turnstile success
     (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    // Mock n8n success
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const envWithAccess = {
      ...mockEnv,
      CF_ACCESS_CLIENT_ID: 'mock_client_id',
      CF_ACCESS_CLIENT_SECRET: 'mock_client_secret',
    };

    const req = createRequest(validBody);
    const context: any = {
      request: req,
      env: envWithAccess,
      params: {},
      waitUntil: vi.fn(),
      next: vi.fn(),
    };

    await onRequestPost(context);

    // Check n8n call
    const n8nCall = (global.fetch as any).mock.calls[1];
    expect(n8nCall[1].headers['CF-Access-Client-Id']).toBe('mock_client_id');
    expect(n8nCall[1].headers['CF-Access-Client-Secret']).toBe('mock_client_secret');
  });
});
