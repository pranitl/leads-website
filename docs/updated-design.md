# Austin Reno Hub: Design Revamp Specification

> **Goal:** Transform the current "premium tech" aesthetic into a "rustic, homey, local" feel that builds trust for home services (hardscaping, closets, planting) while maintaining conversion-optimized layout patterns.

---

## Part 1: Current State Audit

### What's Already Working (Keep These)

| Element | Current Implementation | Why It Works |
|---------|----------------------|--------------|
| **Form Above Fold** | Lead form in right column of hero section | Proven conversion pattern - users see CTA immediately |
| **2-Step Form Flow** | Step 1: Service + ZIP → Step 2: Contact details | Reduces cognitive load, increases completion rates |
| **Trust Signals** | "150+ pros", "4.9/5 rating" badges in hero | Social proof builds confidence |
| **Mobile Sticky CTA** | Fixed bottom button on mobile (`StickyCTA.astro`) | Captures mobile users who scroll past form |
| **50/50 Hero Split** | Text left, form right on desktop | Eye tracks left-to-right, form is natural endpoint |

### What's NOT Working (Change These)

#### 1. Color Palette: "Premium Tech" vs "Local Craftsman"

**Current Colors (from `tailwind.config.mjs`):**
```js
brand: {
  50: '#F0F7F6',   // Very light teal
  600: '#1C5D56',  // Deep teal (primary brand)
  700: '#14463F',  // Dark teal
  900: '#071B18',  // Near-black teal (hero bg)
},
accent: {
  gold: '#F5A524',  // CTA button color
},
neutral: {
  50: '#F8FAFC',   // Page background (cool white)
  900: '#0F172A',  // Text (blue-black)
}
```

**Problem:** The dark forest green (`#071B18`) combined with teal accents feels like a fintech app, not a friendly local service business. The cool white backgrounds feel clinical.

---

#### 2. Typography: Clean but Generic

**Current Fonts (from `global.css`):**
```css
@import url('...family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700...');
```

- **Plus Jakarta Sans** for headings - Modern, geometric, no personality
- **Inter** for body - Highly legible but sterile

**Problem:** These are "safe" SaaS fonts. They don't evoke craftsmanship, heritage, or local authenticity.

---

#### 3. Visual Imagery: Abstract Charts Instead of Real Work

**Current Hero Images (from `index.astro`):**
```html
<img src="/images/placeholders/home-hero-1.svg" alt="Project planning sketch" />
<img src="/images/placeholders/home-hero-2.svg" alt="Outdoor living concept" />
```

**Problem:** These SVG placeholders show abstract line charts and geometric shapes. A homeowner looking for a patio installer doesn't connect with data visualization graphics.

---

#### 4. Card/Form Styling: Glassmorphism is Too Digital

**Current Form Card (from `LeadFormPanel.tsx`):**
```tsx
<div class="card w-full max-w-md space-y-6 text-neutral-900">
```

**Current `.card` class (from `global.css`):**
```css
.card {
  @apply rounded-xl border border-neutral-200 bg-white/90 p-6 shadow-card backdrop-blur;
}
```

**Problem:** The `backdrop-blur`, semi-transparent white, and soft shadows create a floating "glass card" effect. This is trendy in tech but feels disconnected from physical services like construction.

---

#### 5. Hero Background: Dark Gradient Feels Cold

**Current Hero (from `index.astro`):**
```html
<LeadCaptureSection
  sectionClass="overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white"
>
  <div slot="background" class="... bg-[url('/assets/background.svg')] ... opacity-20" />
```

**Problem:** The dark teal gradient with a faint SVG pattern overlay creates a "tech conference" vibe, not "trusted local contractor."

---

## Part 2: Proposed Design System

### Color Palette: "Vintage Hardware Store"

```
┌─────────────────────────────────────────────────────────────────┐
│  RUSTIC COLOR PALETTE                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRIMARY BACKGROUNDS                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Truck    │  │ Warm     │  │ Pure     │                      │
│  │ Cream    │  │ White    │  │ White    │                      │
│  │ #F2E8D5  │  │ #FFFBF5  │  │ #FFFFFF  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│  Page bg       Card bg       Form inputs                        │
│                                                                 │
│  BRAND COLORS                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Forest   │  │ Sage     │  │ Moss     │                      │
│  │ Brown    │  │ Green    │  │ Green    │                      │
│  │ #5C4033  │  │ #4A5D4A  │  │ #7A8B6E  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│  Borders/accents Hero sections  Secondary                       │
│                                                                 │
│  ACTION COLORS                                                  │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ Oxide    │  │ Rust     │                                    │
│  │ Red      │  │ Hover    │                                    │
│  │ #BC4B38  │  │ #A3402F  │                                    │
│  └──────────┘  └──────────┘                                    │
│  CTA buttons   Button hover                                     │
│                                                                 │
│  TEXT COLORS                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Dark     │  │ Body     │  │ Muted    │                      │
│  │ Brown    │  │ Brown    │  │ Brown    │                      │
│  │ #3D2B1F  │  │ #5D4E37  │  │ #8B7355  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│  Headlines     Body text     Secondary text                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Typography System

| Role | Current Font | New Font | Weight | Rationale |
|------|-------------|----------|--------|-----------|
| Display Headlines | Plus Jakarta Sans | **Oswald** | 600-700 | Condensed, bold, vintage poster feel |
| Section Headlines | Plus Jakarta Sans | **Oswald** | 500-600 | Consistent with display |
| Body Text | Inter | **Lato** | 400 | Warmer humanist sans-serif |
| UI Labels | Inter | **Lato** | 700 | Clear form labels |

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Lato:wght@400;700&display=swap');
```

---

## Part 3: Component-by-Component Changes

### 3.1 Lead Form Panel ("Job Ticket" Style)

**File:** `src/components/LeadFormPanel.tsx`

**Current Look:** Floating white card with soft shadow, rounded corners, glass blur effect.

**New Look:** Physical clipboard/estimate sheet feel with hard borders and offset shadow.

**Visual Specification:**
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │  GET YOUR FREE PROJECT ESTIMATE     │ │  ← Header bar (Forest Brown bg)
│ │  📋 Step 1 of 2                     │ │
│ ├─────────────────────────────────────┤ │
│ │                                     │ │
│ │  Service needed                     │ │
│ │  ┌─────────────────────────────┐   │ │
│ │  │ Select a service          ▼ │   │ │
│ │  └─────────────────────────────┘   │ │
│ │                                     │ │
│ │  ZIP code                           │ │
│ │  ┌─────────────────────────────┐   │ │
│ │  │ 78704                       │   │ │
│ │  └─────────────────────────────┘   │ │
│ │                                     │ │
│ │  ┌─────────────────────────────┐   │ │
│ │  │  🔧 FIND PROS NEAR ME       │   │ │  ← Oxide Red button
│ │  └─────────────────────────────┘   │ │
│ │                                     │ │
│ └───┬─────────────────────────────┬───┘ │
│     │                             │     │
└─────┴─────────────────────────────┴─────┘
      ▼ Hard shadow (4px offset)
```

**CSS Changes:**
```css
.card-rustic {
  background: #FFFFFF;
  border: 3px solid #5C4033;
  border-radius: 8px;
  box-shadow: 4px 4px 0px #5C4033;
  padding: 0;
  overflow: hidden;
}

.card-rustic-header {
  background: #5C4033;
  color: #F2E8D5;
  padding: 1rem 1.5rem;
  font-family: 'Oswald', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-rustic-body {
  padding: 1.5rem;
}
```

---

### 3.2 Hero Section

**File:** `src/pages/index.astro`, `src/components/LeadCaptureSection.astro`

**Current:**
- Dark teal gradient (`from-brand-900 via-brand-700 to-brand-600`)
- White text on dark
- Abstract SVG background pattern

**New:**
- Light cream background (`#F2E8D5`)
- Dark brown text on light
- Subtle paper/linen texture (optional)
- Trust badge/seal near headline

**Headline Copy Change:**
```
CURRENT: "Your concierge for niche landscaping and bespoke interior installs"
NEW:     "Trusted Local Pros for Hardscapes, Closets & Xeriscaping"
```

**Subheadline:**
```
NEW: "Serving Austin, Cedar Park, Leander & Dripping Springs since 2020"
```

**Layout Change:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  [LOGO] Austin Reno Hub          Services  Locations  About  [GET QUOTE]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐   │
│  │                              │  │ ╔══════════════════════════╗ │   │
│  │  [TRUST BADGE]               │  │ ║ GET YOUR FREE ESTIMATE   ║ │   │
│  │  ⭐ Texas Native Plants      │  │ ╠══════════════════════════╣ │   │
│  │     Specialist               │  │ ║                          ║ │   │
│  │                              │  │ ║  Service needed          ║ │   │
│  │  TRUSTED LOCAL PROS FOR      │  │ ║  [Select a service ▼]    ║ │   │
│  │  HARDSCAPES, CLOSETS &       │  │ ║                          ║ │   │
│  │  XERISCAPING                 │  │ ║  ZIP code                ║ │   │
│  │                              │  │ ║  [78704        ]         ║ │   │
│  │  Serving Austin, Cedar Park, │  │ ║                          ║ │   │
│  │  Leander & Dripping Springs  │  │ ║  [🔧 FIND PROS NEAR ME]  ║ │   │
│  │                              │  │ ╚══════════════════════════╝ │   │
│  │  ┌────────┐ ┌────────┐      │  │        ↓ (hard shadow)       │   │
│  │  │ 150+   │ │ 4.9/5  │      │  └──────────────────────────────┘   │
│  │  │ Pros   │ │ Rating │      │                                      │
│  │  └────────┘ └────────┘      │                                      │
│  │                              │                                      │
│  └──────────────────────────────┘                                      │
│                                                                        │
│  Background: Truck Cream #F2E8D5 with subtle paper texture            │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 CTA Buttons

**File:** `src/styles/global.css`

**Current:**
```css
.btn-cta {
  @apply btn bg-accent-gold text-neutral-900 shadow-card hover:bg-accent-gold/90;
}
```

**New:**
```css
.btn-cta {
  @apply inline-flex items-center justify-center gap-2 
         rounded-lg bg-[#BC4B38] px-6 py-3.5 
         text-sm font-bold uppercase tracking-wide text-[#F2E8D5]
         shadow-[3px_3px_0px_#5C4033] 
         transition-all duration-150
         hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#5C4033]
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BC4B38] focus-visible:ring-offset-2;
}
```

**Button with Icon (for primary CTA):**
```html
<button class="btn-cta">
  <svg class="h-4 w-4"><!-- wrench or arrow icon --></svg>
  GET MY FREE QUOTE
</button>
```

---

### 3.4 Trust Signals Section

**File:** `src/components/TrustSignals.astro`

**Current:** Floating glass cards on white background.

**New:** Kraft paper texture background, hard border cards.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Background: Subtle kraft paper texture (#E8DCC8)                   │
│                                                                     │
│  WHY HOMEOWNERS CHOOSE US                                           │
│  Premium artisans, vetted process, concierge follow-through         │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │     150+        │  │     <24h        │  │     4.9/5       │     │
│  │  ───────────    │  │  ───────────    │  │  ───────────    │     │
│  │  Qualified      │  │  Avg. match     │  │  Satisfaction   │     │
│  │  specialists    │  │  time           │  │  score          │     │
│  │                 │  │                 │  │                 │     │
│  │  Landscape      │  │  Concierge      │  │  Post-project   │     │
│  │  designers...   │  │  outreach...    │  │  feedback...    │     │
│  └────┬────────────┘  └────┬────────────┘  └────┬────────────┘     │
│       ↓ hard shadow        ↓                    ↓                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3.5 Process Steps Section

**File:** `src/components/ProcessSteps.astro`

**Current:** Dark `brand-900` background with gold number badges.

**New:** Warm sage green background (`#4A5D4A`) with cream number badges.

```css
/* Current */
.rounded-3xl.bg-brand-900.text-white

/* New */
.rounded-3xl.bg-[#4A5D4A].text-[#F2E8D5]
```

Number badges change from gold to cream with brown border:
```css
/* Current */
.bg-accent-gold.text-brand-800

/* New */
.bg-[#F2E8D5].text-[#5C4033].border-2.border-[#5C4033]
```

---

### 3.6 Service Cards

**File:** `src/components/ServiceGrid.astro`

**Current:** White cards with soft shadows, teal icon circles.

**New:** Warm white cards with hard shadows, brown icon circles.

```css
/* Card container */
.service-card {
  background: #FFFBF5;
  border: 2px solid #5C4033;
  border-radius: 12px;
  box-shadow: 3px 3px 0px #D4C4A8;
  transition: transform 0.2s, box-shadow 0.2s;
}

.service-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px #D4C4A8;
}

/* Icon circle */
.service-icon {
  background: #5C4033;
  color: #F2E8D5;
}
```

---

### 3.7 Header & Footer

**File:** `src/layouts/Layout.astro`

**Header Changes:**
- Background: `#FFFBF5` (warm white) instead of pure white
- Logo circle: `#5C4033` background with `#F2E8D5` text
- Nav links: `#5D4E37` text, hover `#BC4B38`
- CTA button: Oxide Red as specified

**Footer Changes:**
- Background: `#F2E8D5` (truck cream)
- Text: Dark brown `#3D2B1F`
- Link hover: `#BC4B38`

---

## Part 4: Image Asset Requirements

### Required New Images

| Asset | Purpose | Specification |
|-------|---------|---------------|
| `hero-closet.jpg` | Hero collage | Custom closet interior, 600x400px, warm lighting |
| `hero-patio.jpg` | Hero collage | Stone patio with fire pit, 600x400px, golden hour |
| `hero-xeriscaping.jpg` | Hero collage | Native Texas plants landscape, 600x400px |
| `trust-badge.svg` | Trust seal | "Texas Native Plants Specialist" or "Local & Insured" badge |
| `paper-texture.png` | Background | Subtle kraft paper texture, tileable, 200x200px |

### Polaroid Frame Treatment

Apply to project photos in hero:
```css
.polaroid-frame {
  background: #FFFFFF;
  border: 3px solid #5C4033;
  padding: 8px 8px 24px 8px;
  box-shadow: 3px 3px 0px #5C4033;
  transform: rotate(-2deg); /* Slight tilt for organic feel */
}

.polaroid-frame:nth-child(2) {
  transform: rotate(1deg);
}

.polaroid-frame:nth-child(3) {
  transform: rotate(-1deg);
}
```

---

## Part 5: Implementation Checklist

### Phase 1: Foundation (Tailwind Config + Global CSS)
- [x] Update `tailwind.config.mjs` with new color palette
- [x] Update `tailwind.config.mjs` with new font families
- [x] Update `src/styles/global.css` with new Google Fonts import
- [x] Update `.btn-cta` class with Oxide Red styling
- [x] Add `.card-rustic` class for form styling
- [x] Add `.polaroid-frame` class for images

### Phase 2: Core Components
- [x] Update `LeadFormPanel.tsx` with job-ticket styling
- [x] Update `LeadCaptureSection.astro` hero background
- [x] Update `TrustSignals.astro` card styling
- [x] Update `ProcessSteps.astro` colors
- [x] Update `ServiceGrid.astro` card styling

### Phase 3: Layout & Pages
- [x] Update `Layout.astro` header/footer colors
- [x] Update `index.astro` hero content and headline
- [x] Update `StickyCTA.astro` button styling
- [x] Update `services/index.astro` with rustic styling
- [x] Update `services/[service].astro` with rustic styling
- [x] Update `services/[service]/[subservice].astro` with rustic styling
- [x] Update `locations/index.astro` with rustic styling
- [x] Update `locations/[state]/[city].astro` with rustic styling
- [x] Update `FAQList.astro` with accordion rustic styling
- [x] Update `InsightsPreview.astro` with rustic styling
- [x] Update `about.astro` with rustic styling
- [x] Update `contact.astro` with rustic styling
- [x] Update `blog/index.astro` with rustic styling
- [x] Update `blog/[slug].astro` with rustic styling
- [x] Update `privacy.astro` and `terms.astro` with rustic colors

### Phase 4: Assets
- [ ] Source/create project photos for hero (using existing placeholders)
- [x] Create trust badge SVG
- [ ] Create paper texture background (optional - deferred)
- [ ] Remove abstract placeholder SVGs (deferred - need real photos)

### Phase 5: QA & Polish
- [x] Test mobile responsiveness
- [x] Verify form accessibility (contrast ratios)
- [x] Check all hover/focus states
- [x] Validate consistent spacing
- [x] Build verification passed

---

## Part 6: Code Snippets

### `tailwind.config.mjs` Updates

```js
export default {
  // ... existing config
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Oswald"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Lato"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Rustic palette
        cream: {
          DEFAULT: '#F2E8D5',
          light: '#FFFBF5',
        },
        brown: {
          forest: '#5C4033',
          dark: '#3D2B1F',
          body: '#5D4E37',
          muted: '#8B7355',
        },
        sage: {
          DEFAULT: '#4A5D4A',
          light: '#7A8B6E',
        },
        oxide: {
          DEFAULT: '#BC4B38',
          hover: '#A3402F',
        },
        // Keep existing brand colors for gradual migration
        brand: { /* ... existing */ },
      },
      boxShadow: {
        card: '0 20px 45px -25px rgba(15, 23, 42, 0.35)',
        hard: '4px 4px 0px #5C4033',
        'hard-sm': '3px 3px 0px #5C4033',
        'hard-hover': '2px 2px 0px #5C4033',
      },
    },
  },
  // ... plugins
};
```

### `src/styles/global.css` Updates

```css
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Lato:wght@400;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-cream text-brown-dark font-body antialiased;
  }
}

@layer components {
  .btn-cta {
    @apply inline-flex items-center justify-center gap-2 
           rounded-lg bg-oxide px-6 py-3.5 
           text-sm font-bold uppercase tracking-wide text-cream
           shadow-hard-sm transition-all duration-150
           hover:translate-y-[1px] hover:shadow-hard-hover hover:bg-oxide-hover
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxide focus-visible:ring-offset-2;
  }

  .card-rustic {
    @apply rounded-lg border-[3px] border-brown-forest bg-white shadow-hard overflow-hidden;
  }

  .card-rustic-header {
    @apply bg-brown-forest px-6 py-4 font-heading text-sm font-semibold 
           uppercase tracking-widest text-cream;
  }

  .card-rustic-body {
    @apply p-6;
  }

  .polaroid-frame {
    @apply bg-white border-[3px] border-brown-forest p-2 pb-6 shadow-hard-sm;
  }
}
```

---

## Summary

This design revamp pivots from a "premium fintech" aesthetic to a "trusted local craftsman" feel by:

1. **Warming the palette** - Cream backgrounds, brown accents, oxide red CTAs
2. **Adding character to typography** - Oswald headlines for vintage poster feel
3. **Making elements tangible** - Hard shadows, solid borders, "job ticket" forms
4. **Showing real work** - Project photos instead of abstract charts
5. **Building local trust** - Texas-focused badges, regional city mentions

The layout and conversion patterns remain unchanged - only the visual skin is updated to match the "Austin Reno Hub" brand positioning as a friendly, established local service matchmaker.
