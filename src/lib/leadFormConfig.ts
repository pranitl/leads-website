type CaptchaConfig = {
  provider: 'turnstile' | 'recaptcha';
  siteKey?: string;
};

type LeadFormConfig = {
  submitMode: 'stub' | 'live';
  captcha?: CaptchaConfig;
};

/**
 * Derives the configuration for the lead form based on public env variables.
 * Keeping this in one spot prevents drift between pages rendering the form.
 */
export const getLeadFormConfig = (): LeadFormConfig => {
  const submitMode: LeadFormConfig['submitMode'] =
    import.meta.env.PUBLIC_LEADS_MODE === 'live' ? 'live' : 'stub';

  const provider = import.meta.env.PUBLIC_CAPTCHA_PROVIDER as CaptchaConfig['provider'] | undefined;

  if (!provider) {
    return { submitMode };
  }

  const siteKey =
    provider === 'turnstile'
      ? import.meta.env.PUBLIC_TURNSTILE_SITE_KEY
      : provider === 'recaptcha'
        ? import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY
        : undefined;

  return {
    submitMode,
    captcha: {
      provider,
      siteKey,
    },
  };
};

export type { LeadFormConfig, CaptchaConfig };
