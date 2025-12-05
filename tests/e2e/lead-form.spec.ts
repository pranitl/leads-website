import { test, expect } from '@playwright/test';

test.describe('Lead Form Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Turnstile script to avoid external dependency and ensure stability
    await page.route('**/turnstile/v0/api.js?render=explicit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.turnstile = {
            render: (container, options) => {
              // Immediately invoke callback with a fake token
              if (options.callback) options.callback('mock-turnstile-token');
              return 'mock-widget-id';
            },
            reset: () => {},
            remove: () => {},
            getResponse: () => 'mock-turnstile-token',
          };
        `,
      });
    });

    // Mock Lead Submission API
    await page.route('/api/leads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Lead submitted successfully' }),
      });
    });
  });

  test('should submit the form successfully', async ({ page }) => {
    await page.goto('/');

    // Step 1: Qualification
    await page.getByLabel('Service needed').selectOption({ label: 'Hardscaping & Outdoor Living' });
    await page.getByLabel('ZIP code').fill('90210');
    await page.getByRole('button', { name: 'Find Pros Near Me' }).click();

    // Verify we moved to Step 2
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await expect(page.getByText('Great! We\'ve found 3 pros')).toBeVisible();

    // Step 2: Details
    await page.getByLabel('Full name').fill('Jane Doe');
    await page.getByLabel('Email', { exact: true }).fill('jane@example.com');
    await page.getByLabel('Phone').fill('555-555-5555');
    await page.getByLabel('Full address').fill('123 Maple St, Beverly Hills, CA');
    
    // Select Subservice if visible (Kitchen Remodeling usually has subservices)
    // Depending on the mock data or actual service data, this might vary.
    // Based on LeadFormPanel logic:
    /*
      if (selectedService?.subservices?.length) { ... }
    */
    // We assume 'Kitchen Remodeling' exists and might have subservices.
    // If not, this step might fail. Let's check if the select is visible before interacting.
    if (await page.getByLabel('Specific project type').isVisible()) {
      await page.getByLabel('Specific project type').selectOption({ index: 1 }); // Select first available option
    }

    // Timeline and Budget
    await page.getByText('As soon as possible').click();
    await page.getByText('$5,000+').click();

    // Consent
    // The checkbox might be visible, let's check. 
    // "class="mt-1 h-4 w-4 rounded border-brown-forest/30 text-oxide focus:ring-oxide""
    // It doesn't say hidden. So .check() should work for consent.
    await page.getByLabel('I agree to receive calls').check();

    // Submit
    await page.getByRole('button', { name: 'Get My Free Quotes!' }).click();

    // Verify Success State
    await expect(page.getByText('Thanks! Your request is in motion.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start another project' })).toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/');

    // Try to submit Step 1 empty
    await page.getByRole('button', { name: 'Find Pros Near Me' }).click();
    // Browser native validation might trigger if 'required' attribute is present.
    // Playwright can bypass it or we check if we are still on step 1.
    
    // LeadFormPanel uses native validation (required attribute) AND custom validation.
    // If we want to see custom error messages (which are rendered conditionally), we need to trigger them.
    // However, 'required' attribute prevents form submission event in many browsers.
    // Let's fill partial data to trigger custom validation logic if possible.
    
    await page.getByLabel('Service needed').selectOption({ label: 'Hardscaping & Outdoor Living' });
    // Leave Zip empty
    // Attempt to submit
    // Since 'required' is on input, the browser will show a tooltip. Playwright doesn't easily assertions on native tooltips.
    // We can check that we did NOT advance to Step 2.
    await expect(page.getByText('Step 1 of 2')).toBeVisible();

    // Fill Step 1 correctly to get to Step 2
    await page.getByLabel('ZIP code').fill('90210');
    await page.getByRole('button', { name: 'Find Pros Near Me' }).click();
    
    // Now on Step 2
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    // Try to submit Step 2 empty
    // Disable client-side validation to test React/Preact validation if needed, or just rely on required attributes.
    // Let's just try to submit and verify we don't see success.
    await page.getByRole('button', { name: 'Get My Free Quotes!' }).click();
    
    await expect(page.getByText('Thanks! Your request is in motion.')).not.toBeVisible();
    
    // Fill invalid email
    await page.getByLabel('Email', { exact: true }).fill('invalid-email');
    await page.getByLabel('Full name').fill('John'); // Fill other required
    await page.getByLabel('Phone').fill('5555555555');
    await page.getByLabel('Full address').fill('Address');
    await page.getByText('As soon as possible').click();
    await page.getByText('$5,000+').click();
    await page.getByLabel('I agree to receive calls').check();

    if (await page.getByLabel('Specific project type').isVisible()) {
      await page.getByLabel('Specific project type').selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: 'Get My Free Quotes!' }).click();
    
    // Should see email error
    await expect(page.getByText('Enter a valid email')).toBeVisible();
  });
});
