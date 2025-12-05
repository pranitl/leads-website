# Image Requirements for Austin Reno Hub

This document lists all placeholder images that need to be replaced with real photography before launch.

---

## Placeholder Naming Convention

All placeholder files are prefixed with `REPLACE-` to make them easy to find. When you have the real photo ready, replace the `.svg` file with a `.jpg` or `.webp` and update the file references in the code.

---

## Required Images

### Homepage Hero Section

| Placeholder File | Replace With | Specifications | Used In |
|------------------|--------------|----------------|---------|
| `REPLACE-stone-patio-firepit.svg` | Photo of a completed stone patio with fire pit | 600x400px minimum, warm golden-hour lighting, Austin-style design | Homepage hero (left image) |
| `REPLACE-custom-closet-interior.svg` | Photo of a custom closet organization system | 600x480px minimum, clean white/wood tones, well-organized | Homepage hero (middle image) |

### Service Category Pages

| Placeholder File | Replace With | Specifications | Used In |
|------------------|--------------|----------------|---------|
| `REPLACE-xeriscaping-landscape.svg` | Xeriscaping/native Texas plants landscape | 640x360px minimum, drought-tolerant plants, natural stone | Landscaping service pages |
| `REPLACE-hardscape-retaining-wall.svg` | Stone retaining wall or paver patio | 640x360px minimum, professional installation, clean lines | Hardscaping service pages |
| `REPLACE-custom-closet-interior.svg` | Walk-in closet with custom shelving | 640x360px minimum, organized, modern design | Closet/Interior service pages |

---

## Photography Guidelines

### Style Requirements

1. **Warm, Natural Lighting** - Prefer golden hour or overcast daylight. Avoid harsh shadows or overly edited HDR looks.

2. **Austin/Texas Aesthetic** - Images should feel local:
   - Limestone and natural stone elements
   - Native Texas plants (agave, yucca, lantana, salvia)
   - Hill Country style architecture accents

3. **Real Projects, Not Stock** - Whenever possible, source from actual completed projects in the Austin area. Authenticity builds trust.

4. **Clean Compositions** - No clutter, tools, or work debris. Show the finished, polished result.

5. **Horizontal Orientation** - All placeholder spots expect landscape (horizontal) images.

### File Format Recommendations

| Format | Use Case |
|--------|----------|
| `.webp` | Preferred for web - best compression with quality |
| `.jpg` | Fallback if `.webp` not available, quality 80-85% |
| `.png` | Only for images requiring transparency |

### Size Requirements

- **Minimum resolution**: 1200px wide (will be displayed at various sizes)
- **Aspect ratios**: Approximately 3:2 or 16:9
- **File size**: Keep under 200KB per image after compression

---

## Image Sources (Recommendations)

### Best Options (Free/Low Cost)

1. **Partner Portfolio Photos** - Ask onboarded contractors for permission to use their project photos
2. **Unsplash** - Free high-quality photos, search for "Austin landscaping", "stone patio", "custom closet"
3. **Pexels** - Another free option with good Texas/southwestern imagery

### Premium Options

1. **Shutterstock** - Larger selection, paid licenses
2. **Adobe Stock** - Professional quality, subscription required
3. **Local Photographer** - Hire to shoot actual Austin-area projects

---

## Update Checklist

When replacing a placeholder:

1. [ ] Compress image using [Squoosh](https://squoosh.app/) or [TinyPNG](https://tinypng.com/)
2. [ ] Match the file name (e.g., `REPLACE-stone-patio-firepit.jpg`)
3. [ ] Update file extension in code if different from `.svg`
4. [ ] Test on both desktop and mobile
5. [ ] Delete the old `.svg` placeholder

---

## Code Locations to Update

When you replace images with real photos, update these files:

```
src/pages/index.astro                     # Hero images
src/components/ServiceGrid.astro          # Service card images  
src/pages/services/[service].astro        # Service detail images
src/pages/services/[service]/[subservice].astro  # Subservice images
```

### Example Code Change

```diff
- src="/images/placeholders/REPLACE-stone-patio-firepit.svg"
+ src="/images/projects/stone-patio-firepit.webp"
```

---

## Future Image Needs (Post-Launch)

Once you have real customers, collect:

- **Before/After Photos** - Powerful social proof
- **Customer Project Galleries** - With permission
- **Contractor Headshots** - For partner profiles
- **Team Photos** - For About page
- **Location-Specific Images** - For each city page

---

*Last updated: December 2024*
