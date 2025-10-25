import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';

type Subservice = {
  slug: string;
  name: string;
};

type ServiceOption = {
  slug: string;
  name: string;
  subservices?: Subservice[];
};

type LeadFormValues = {
  service: string;
  subservice: string;
  zip: string;
  name: string;
  phone: string;
  email: string;
  details: string;
  consent: boolean;
};

type Props = {
  services: ServiceOption[];
  submitMode?: 'stub' | 'live';
  source?: string;
  captcha?: {
    provider?: 'turnstile' | 'recaptcha';
    siteKey?: string;
  };
  className?: string;
};

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const initialValues: LeadFormValues = {
  service: '',
  subservice: '',
  zip: '',
  name: '',
  phone: '',
  email: '',
  details: '',
  consent: false,
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (key: string, options: { action: string }) => Promise<string>;
    };
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export default function LeadFormPanel({
  services,
  submitMode = 'stub',
  source,
  captcha,
  className,
}: Props) {
  const formId = useId();
  const [values, setValues] = useState<LeadFormValues>({ ...initialValues });
  const [errors, setErrors] = useState<Record<keyof LeadFormValues, string | null>>({
    service: null,
    subservice: null,
    zip: null,
    name: null,
    phone: null,
    email: null,
    details: null,
    consent: null,
  });
  const [status, setStatus] = useState<FormState>('idle');
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const selectedService = useMemo(
    () => services.find((svc) => svc.slug === values.service),
    [services, values.service],
  );

  useEffect(() => {
    if (!selectedService?.subservices?.length) {
      setValues((prev) => ({ ...prev, subservice: '' }));
    }
  }, [selectedService?.subservices?.length]);

  useEffect(() => {
    const provider = captcha?.provider;
    if (!provider || !captcha?.siteKey) {
      return;
    }

    if (provider === 'turnstile') {
      const ensureScript = () => {
        if (window.turnstile) {
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      };

      ensureScript().then(() => {
        if (!window.turnstile || !turnstileContainerRef.current) return;
        turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: captcha.siteKey!,
          callback: (token: string) => setCaptchaToken(token),
        });
      });
    }

    if (provider === 'recaptcha') {
      const ensureScript = () => {
        if (window.grecaptcha) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = `https://www.google.com/recaptcha/api.js?render=${captcha.siteKey}`;
          script.async = true;
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      };
      ensureScript().then(() => {
        window.grecaptcha?.ready(() => {
          window
            .grecaptcha!.execute(captcha.siteKey!, { action: 'lead_form' })
            .then((token) => setCaptchaToken(token));
        });
      });
    }
  }, [captcha?.provider, captcha?.siteKey]);

  const handleChange = (field: keyof LeadFormValues) => (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    let value: string | boolean = target.type === 'checkbox' ? target.checked : target.value;

    if (field === 'phone' && typeof value === 'string') {
      const numeric = value.replace(/\D/g, '').slice(0, 10);
      const area = numeric.slice(0, 3);
      const prefix = numeric.slice(3, 6);
      const line = numeric.slice(6, 10);
      let formatted = area;
      if (prefix) formatted = `${area}-${prefix}`;
      if (line) formatted = `${area}-${prefix}-${line}`;
      value = formatted;
    }

    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const nextErrors: typeof errors = { ...errors };
    const required: Array<keyof LeadFormValues> = ['service', 'zip', 'name', 'phone', 'email'];
    required.forEach((field) => {
      if (!values[field]) {
        nextErrors[field] = 'Required';
      }
    });
    if (selectedService?.subservices?.length && !values.subservice) {
      nextErrors.subservice = 'Choose a sub-service';
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Enter a valid email';
    }
    if (values.zip && !/^\d{5}$/.test(values.zip)) {
      nextErrors.zip = 'Zip should be 5 digits';
    }
    if (!values.consent) {
      nextErrors.consent = 'Consent is required';
    }
    setErrors(nextErrors);
    return Object.values(nextErrors).every((err) => !err);
  };

  const submitLead = async () => {
    if (!validate()) return;
    setStatus('submitting');

    const payload = {
      ...values,
      phone: values.phone.replace(/[^\d]/g, ''),
      source,
      captchaToken,
    };

    try {
      if (submitMode === 'stub') {
        await new Promise((resolve) => setTimeout(resolve, 800));
      } else {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Lead submission failed');
        }
      }

      window.dataLayer?.push({
        event: 'lead_submit',
        service: values.service,
        subservice: values.subservice,
        zip: values.zip,
      });

      setStatus('success');
      setValues({ ...initialValues });
      setCaptchaToken('');
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div class={`card w-full max-w-md space-y-6 ${className ?? ''}`} id="lead-form">
      <div>
        <h2 class="font-heading text-2xl font-semibold text-neutral-900">Get matched with a specialist</h2>
        <p class="mt-2 text-sm text-neutral-600">
          Share a few project details and our concierge team will introduce you to vetted pros in under 24 hours.
        </p>
      </div>
      <form
        noValidate
        aria-labelledby={`${formId}-title`}
        class="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submitLead();
        }}
      >
        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-service`}>
            Service needed
          </label>
          <select
            id={`${formId}-service`}
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={values.service}
            onInput={handleChange('service')}
            required
          >
            <option value="">Select a service</option>
            {services.map((svc) => (
              <option value={svc.slug}>{svc.name}</option>
            ))}
          </select>
          {errors.service && <p class="text-xs text-danger">{errors.service}</p>}
        </div>

        {selectedService?.subservices?.length ? (
          <div class="space-y-1">
            <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-subservice`}>
              Specific project type
            </label>
            <select
              id={`${formId}-subservice`}
              class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={values.subservice}
              onInput={handleChange('subservice')}
              required
            >
              <option value="">Choose an option</option>
              {selectedService.subservices!.map((item) => (
                <option value={item.slug}>{item.name}</option>
              ))}
            </select>
            {errors.subservice && <p class="text-xs text-danger">{errors.subservice}</p>}
          </div>
        ) : null}

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-zip`}>
              ZIP code
            </label>
            <input
              id={`${formId}-zip`}
              inputmode="numeric"
              maxLength={5}
              pattern="\d{5}"
              class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={values.zip}
              onInput={handleChange('zip')}
              required
            />
            {errors.zip && <p class="text-xs text-danger">{errors.zip}</p>}
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-phone`}>
              Phone
            </label>
            <input
              id={`${formId}-phone`}
              inputMode="tel"
              placeholder="555-555-1234"
              class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={values.phone}
              onInput={handleChange('phone')}
              required
            />
            {errors.phone && <p class="text-xs text-danger">{errors.phone}</p>}
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-name`}>
            Full name
          </label>
          <input
            id={`${formId}-name`}
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={values.name}
            onInput={handleChange('name')}
            required
          />
          {errors.name && <p class="text-xs text-danger">{errors.name}</p>}
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-email`}>
            Email
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={values.email}
            onInput={handleChange('email')}
            required
          />
          {errors.email && <p class="text-xs text-danger">{errors.email}</p>}
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-details`}>
            Project details (optional)
          </label>
          <textarea
            id={`${formId}-details`}
            rows={3}
            class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={values.details}
            onInput={handleChange('details')}
            placeholder="Share timeline, budget, or inspiration"
          />
        </div>

        <div class="flex items-start gap-3">
          <input
            id={`${formId}-consent`}
            type="checkbox"
            checked={values.consent}
            onInput={handleChange('consent')}
            class="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
          />
            <label class="text-xs text-neutral-600" htmlFor={`${formId}-consent`}>
              I agree to receive calls, texts, or emails about my project. Message and data rates may apply.
            </label>
        </div>
        {errors.consent && <p class="text-xs text-danger">{errors.consent}</p>}

        {captcha?.provider === 'turnstile' && (
          <div class="hidden" ref={turnstileContainerRef}></div>
        )}

        {status === 'error' && (
          <p class="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            Something went wrong. Please try again.
          </p>
        )}

        {status === 'success' ? (
          <div class="rounded-lg border border-success/20 bg-success/10 px-3 py-3 text-sm text-success">
            Thanks! Our concierge team will reach out shortly with curated specialists.
          </div>
        ) : (
          <button class="btn-cta w-full" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending...' : 'Get My Matches'}
          </button>
        )}
      </form>
    </div>
  );
}
