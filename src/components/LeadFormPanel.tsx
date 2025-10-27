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
  email: string;
  phone: string;
  address: string;
  timeline: string;
  budget: string;
  details: string;
  consent: boolean;
};

type LeadFormErrors = Record<keyof LeadFormValues, string | null>;

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
type Step = 1 | 2;

const initialValues: LeadFormValues = {
  service: '',
  subservice: '',
  zip: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  timeline: '',
  budget: '',
  details: '',
  consent: false,
};

const createEmptyErrors = (): LeadFormErrors => ({
  service: null,
  subservice: null,
  zip: null,
  name: null,
  email: null,
  phone: null,
  address: null,
  timeline: null,
  budget: null,
  details: null,
  consent: null,
});

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          // Additional optional Turnstile options (loosen typing to avoid TS errors)
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          'refresh-expired'?: 'auto' | 'manual' | boolean;
          retry?: 'auto' | 'never';
          appearance?: 'always' | 'execute' | 'interaction-only' | 'invisible' | string;
          execution?: 'render' | 'execute' | string;
          theme?: 'auto' | 'dark' | 'light';
          size?: 'normal' | 'compact' | 'invisible';
          action?: string;
          cData?: string;
          'response-field'?: boolean;
          'response-field-name'?: string;
        },
      ) => string;
      reset: (widgetId: string) => void;
      execute: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (key: string, options: { action: string }) => Promise<string>;
    };
    google?: any;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const googleMapsKey = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;
let placesScriptPromise: Promise<void> | null = null;

const loadPlacesScript = (apiKey: string) => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (placesScriptPromise) return placesScriptPromise;

  placesScriptPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[data-google-maps]') as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.maps?.places) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');
    script.onload = () => resolve();
    document.head.appendChild(script);
  });

  return placesScriptPromise;
};

export default function LeadFormPanel({
  services,
  submitMode = 'stub',
  source,
  captcha,
  className,
}: Props) {
  const formId = useId();
  const [values, setValues] = useState<LeadFormValues>({ ...initialValues });
  const [errors, setErrors] = useState<LeadFormErrors>(createEmptyErrors());
  const [status, setStatus] = useState<FormState>('idle');
  const [step, setStep] = useState<Step>(1);
  const [captchaToken, setCaptchaToken] = useState('');
  const [submittedZip, setSubmittedZip] = useState('');
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const placesAutocompleteRef = useRef<any>(null);

  const selectedService = useMemo(
    () => services.find((svc) => svc.slug === values.service),
    [services, values.service],
  );

  const displayZip = values.zip || submittedZip;

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
        if (typeof window === 'undefined') return Promise.resolve();
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
          // Invisible widget; we will execute programmatically on submit
          appearance: 'invisible',
          retry: 'auto',
          'refresh-expired': 'auto',
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => setCaptchaToken(''),
        });
      });
    }

    if (provider === 'recaptcha') {
      const ensureScript = () => {
        if (typeof window === 'undefined') return Promise.resolve();
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

  useEffect(() => {
    if (step !== 2 || !googleMapsKey || typeof window === 'undefined') return;
    if (!addressInputRef.current) return;
    if (placesAutocompleteRef.current) return;

    loadPlacesScript(googleMapsKey).then(() => {
      if (!addressInputRef.current) return;
      const google = window.google;
      const Autocomplete = google?.maps?.places?.Autocomplete;
      if (!Autocomplete) return;

      placesAutocompleteRef.current = new Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address', 'address_components'],
        types: ['address'],
      });

      placesAutocompleteRef.current.addListener('place_changed', () => {
        const place = placesAutocompleteRef.current?.getPlace();
        const formatted = place?.formatted_address ?? addressInputRef.current?.value ?? '';
        setValues((prev) => ({ ...prev, address: formatted }));
      });
    });
  }, [step]);

  const handleChange = (field: keyof LeadFormValues) => (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    let value: string | boolean;
    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else {
      value = target.value;
    }

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
    if (field === 'zip') {
      setSubmittedZip('');
    }
  };

  const validate = (currentStep: Step) => {
    const nextErrors = createEmptyErrors();

    if (!values.service) nextErrors.service = 'Required';
    if (!values.zip) nextErrors.zip = 'Required';
    else if (!/^\d{5}$/.test(values.zip)) nextErrors.zip = 'Zip should be 5 digits';

    if (currentStep === 2) {
      if (!values.name) nextErrors.name = 'Required';
      if (!values.email) nextErrors.email = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = 'Enter a valid email';
      if (!values.phone) nextErrors.phone = 'Required';
      else if (values.phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Phone should include 10 digits';
      if (!values.address) nextErrors.address = 'Required';
      if (!values.timeline) nextErrors.timeline = 'Choose a timeline';
      if (!values.budget) nextErrors.budget = 'Select a budget';
      if (selectedService?.subservices?.length && !values.subservice) {
        nextErrors.subservice = 'Choose a sub-service';
      }
      if (!values.consent) nextErrors.consent = 'Consent is required';
    }

    setErrors(nextErrors);

    const fieldsToInspect: Array<keyof LeadFormErrors> =
      currentStep === 1
        ? ['service', 'zip']
        : ['service', 'zip', 'subservice', 'name', 'email', 'phone', 'address', 'timeline', 'budget', 'consent'];

    return fieldsToInspect.every((field) => !nextErrors[field]);
  };

  const startQualification = (event: Event) => {
    event.preventDefault();
    if (validate(1)) {
      setErrors(createEmptyErrors());
      setStatus('idle');
      setStep(2);
    }
  };

  const submitLead = async () => {
    if (!validate(2)) return;
    setStatus('submitting');

    // Ensure Turnstile token for invisible/non-interactive/preclearance modes
    if (captcha?.provider === 'turnstile' && typeof window !== 'undefined' && window.turnstile && turnstileWidgetId.current) {
      try {
        // Helper to read current token from the widget (do not rely on stale state)
        const getResp = () => {
          try {
            return window.turnstile!.getResponse(turnstileWidgetId.current!);
          } catch {
            return '';
          }
        };

        let token = getResp();
        if (!token) {
          // Trigger token generation for invisible widgets
          try {
            window.turnstile!.execute(turnstileWidgetId.current!);
          } catch {
            // Some modes may auto-execute on render; ignore
          }
          const start = Date.now();
          await new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
              token = getResp();
              if (token) {
                clearInterval(interval);
                setCaptchaToken(token);
                resolve();
              } else if (Date.now() - start > 6000) {
                clearInterval(interval);
                reject(new Error('CAPTCHA timeout'));
              }
            }, 100);
          });
        }
      } catch {
        setStatus('error');
        return;
      }
    }

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

      setSubmittedZip(values.zip);
      setStatus('success');
      setValues({ ...initialValues, service: values.service, zip: values.zip });
      setCaptchaToken('');
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current);
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const resetForm = () => {
    setValues({ ...initialValues });
    setErrors(createEmptyErrors());
    setStatus('idle');
    setStep(1);
    setSubmittedZip('');
    setCaptchaToken('');
    if (turnstileWidgetId.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId.current);
    }
  };

  return (
    <div class={`card w-full max-w-md space-y-6 ${className ?? ''}`} id="lead-form">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">Step {step} of 2</p>
        <h2 class="mt-2 font-heading text-2xl font-semibold text-neutral-900">
          {step === 1 ? 'Find vetted pros near you' : `Great! We've found 3 pros in ${displayZip || 'your area'}.`}
        </h2>
        <p class="mt-2 text-sm text-neutral-600">
          {step === 1
            ? 'Start with your project type and zip code. We’ll show you curated matches in the next step.'
            : 'Just tell us where to send your free quotes and we will introduce you within 24 hours.'}
        </p>
      </div>

      {step === 1 ? (
        <form class="space-y-4" onSubmit={startQualification} noValidate>
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
                <option value={svc.slug} key={svc.slug}>
                  {svc.name}
                </option>
              ))}
            </select>
            {errors.service && <p class="text-xs text-danger">{errors.service}</p>}
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-zip`}>
              ZIP code
            </label>
            <input
              id={`${formId}-zip`}
              inputmode="numeric"
              maxLength={5}
              pattern="\\d{5}"
              class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={values.zip}
              onInput={handleChange('zip')}
              required
            />
            {errors.zip && <p class="text-xs text-danger">{errors.zip}</p>}
          </div>

          <button class="btn-cta w-full" type="submit">
            Find Pros Near Me
          </button>
        </form>
      ) : (
        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            <span>
              {selectedService ? selectedService.name : 'Service'} · ZIP {displayZip}
            </span>
            <button
              type="button"
              class="font-semibold text-brand-600 hover:text-brand-700"
              onClick={() => {
                setStep(1);
                setStatus('idle');
                setErrors(createEmptyErrors());
              }}
            >
              Edit
            </button>
          </div>

          {status === 'success' ? (
            <div class="space-y-4 rounded-2xl border border-success/20 bg-success/10 p-5 text-sm text-success">
              <p class="font-semibold">Thanks! Your request is in motion.</p>
              <p>Expect an email and text with your curated specialists soon.</p>
              <button
                type="button"
                class="btn-outline w-full border-success/30 text-success hover:border-success hover:bg-success/10"
                onClick={resetForm}
              >
                Start another project
              </button>
            </div>
          ) : (
            <form
              class="space-y-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                submitLead();
              }}
            >
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

              <div class="grid gap-4 sm:grid-cols-2">
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
                  <p class="text-xs text-neutral-500">We’ll email your match confirmation here.</p>
                  {errors.email && <p class="text-xs text-danger">{errors.email}</p>}
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
                  <p class="text-xs text-neutral-500">So matched pros can send you a quote. We never spam.</p>
                  {errors.phone && <p class="text-xs text-danger">{errors.phone}</p>}
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-address`}>
                  Full address
                </label>
                <input
                  id={`${formId}-address`}
                  ref={addressInputRef}
                  class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={values.address}
                  onInput={handleChange('address')}
                  placeholder="Street, city, state"
                  required
                />
                {errors.address && <p class="text-xs text-danger">{errors.address}</p>}
              </div>

              {selectedService?.subservices?.length ? (
                <div class="space-y-1">
                  <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-subservice`}>
                    Specific project type (optional)
                  </label>
                  <select
                    id={`${formId}-subservice`}
                    class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    value={values.subservice}
                    onInput={handleChange('subservice')}
                  >
                    <option value="">Choose an option</option>
                    {selectedService.subservices.map((item) => (
                      <option value={item.slug} key={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {errors.subservice && <p class="text-xs text-danger">{errors.subservice}</p>}
                </div>
              ) : null}

              <fieldset class="space-y-2">
                <legend class="text-sm font-medium text-neutral-700">What is your timeline?</legend>
                <div class="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: 'asap', label: 'As soon as possible' },
                    { value: '1-2-weeks', label: 'Within 1-2 weeks' },
                    { value: 'flexible', label: 'Flexible' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      class={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${values.timeline === option.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-200 text-neutral-500 hover:border-brand-200'}`}
                    >
                      <input
                        type="radio"
                        name="timeline"
                        value={option.value}
                        class="hidden"
                        checked={values.timeline === option.value}
                        onInput={handleChange('timeline')}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {errors.timeline && <p class="text-xs text-danger">{errors.timeline}</p>}
              </fieldset>

              <fieldset class="space-y-2">
                <legend class="text-sm font-medium text-neutral-700">What is your estimated budget?</legend>
                <div class="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: '1000-3000', label: '$1,000 - $3,000' },
                    { value: '3000-5000', label: '$3,000 - $5,000' },
                    { value: '5000-plus', label: '$5,000+' },
                    { value: 'unsure', label: 'Not sure' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      class={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${values.budget === option.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-200 text-neutral-500 hover:border-brand-200'}`}
                    >
                      <input
                        type="radio"
                        name="budget"
                        value={option.value}
                        class="hidden"
                        checked={values.budget === option.value}
                        onInput={handleChange('budget')}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {errors.budget && <p class="text-xs text-danger">{errors.budget}</p>}
              </fieldset>

              <div class="space-y-1">
                <label class="text-sm font-medium text-neutral-700" htmlFor={`${formId}-details`}>
                  Add a short description (optional)
                </label>
                <textarea
                  id={`${formId}-details`}
                  rows={3}
                  class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={values.details}
                  onInput={handleChange('details')}
                  placeholder="Share vision, materials, or inspiration links"
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
                <div
                  ref={turnstileContainerRef}
                  style={{
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    overflow: 'hidden',
                    opacity: 0,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {status === 'error' && (
                <p class="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                  Something went wrong. Please try again.
                </p>
              )}

              <button class="btn-cta w-full" type="submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Sending...' : 'Get My Free Quotes!'}
              </button>

              <div class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                <svg viewBox="0 0 20 20" aria-hidden="true" class="h-4 w-4 fill-current text-brand-600">
                  <path d="M10 2a4 4 0 0 1 4 4v1h1a1 1 0 0 1 1 1v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1h1V6a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2Zm-4 7v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-5H6Z" />
                </svg>
                <span>Your information is 100% secure. We never sell your data.</span>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
