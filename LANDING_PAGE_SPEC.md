# WriteCraft Landing Page — Design Spec

## Overview

A single-page, typography-driven landing page with one goal: get writers to download the macOS app.

**Direction:** Minimal & elegant (iA Writer style)
**Primary CTA:** Download for macOS
**Hero Message:** "AI guidance that preserves your voice"

---

## Page Structure

```
┌─────────────────────────────────────────────────────────┐
│                         NAV                             │
│  WriteCraft                              [Download]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                        HERO                             │
│                                                         │
│                     WriteCraft                          │
│                                                         │
│          AI guidance that preserves your voice          │
│                                                         │
│              [Download for macOS]                       │
│                   Free • 50 messages/month              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    VALUE SECTION                        │
│                                                         │
│   "WriteCraft is a writing mentor, not a ghostwriter.   │
│    It guides you through five stages—from raw idea      │
│    to polished draft—with a light touch that keeps      │
│    your voice intact."                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   WORKFLOW VISUAL                       │
│                                                         │
│     Concept → Outline → Draft → Edits → Polish          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                   FOOTER                                │
│                                                         │
│   Pro: Unlimited messages — $20/month                   │
│                                                         │
│   Privacy  •  Terms  •  @writecraft                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Design Tokens

| Token | Value |
|-------|-------|
| **Background** | `#ffffff` (light) / `#0a0a0a` (dark) |
| **Text primary** | `#0a0a0a` (light) / `#fafafa` (dark) |
| **Text secondary** | `#6b6b6b` (light) / `#a0a0a0` (dark) |
| **Accent** | `#007aff` (download button only) |
| **Font** | System stack: `-apple-system, BlinkMacSystemFont, 'SF Pro', sans-serif` |
| **Max width** | `720px` (content) |
| **Spacing unit** | `8px` base |

---

## Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Logo/App name (nav) | `18px` | `600` | `1.2` |
| Hero title | `48px` (desktop) / `36px` (mobile) | `700` | `1.1` |
| Hero tagline | `20px` (desktop) / `18px` (mobile) | `400` | `1.5` |
| Body copy | `18px` | `400` | `1.7` |
| Workflow stages | `14px` | `500` | `1` |
| Footer text | `14px` | `400` | `1.5` |

---

## Components

### Nav
- Logo (text) aligned left
- Download button aligned right
- Height: `64px`
- Optional: sticky on scroll
- Padding: `0 24px`

### Download Button
- Background: `#007aff`
- Text: white, `16px`, weight `500`
- Padding: `12px 24px`
- Border radius: `8px`
- Hover: darken 10%
- Transition: `background 0.15s ease`

### Hero Section
- Centered text
- Vertical padding: `120px` (desktop) / `80px` (mobile)
- Title → Tagline → Button → Sub-text (vertical stack)
- Gap between elements: `24px`

### Value Section
- Single paragraph, centered
- Max-width: `600px`
- Padding: `80px 24px`
- Text color: secondary

### Workflow Visual
- Horizontal layout on desktop
- 5 stages with `→` separators
- Subtle styling (secondary text color)
- Padding: `40px 24px`
- Center-aligned

### Footer
- Pricing callout (subtle)
- Links row: Privacy • Terms • Social
- Padding: `60px 24px`
- Border-top: `1px solid` (very subtle)

---

## Copy

### Hero
**Title:** WriteCraft
**Tagline:** AI guidance that preserves your voice
**Button:** Download for macOS
**Sub-text:** Free • 50 messages/month

### Value Paragraph
> WriteCraft is a writing mentor, not a ghostwriter. It guides you through five stages—from raw idea to polished draft—with a light touch that keeps your voice intact.

### Workflow Stages
Concept → Outline → Draft → Edits → Polish

### Footer
**Pricing:** Pro: Unlimited messages — $20/month
**Links:** Privacy • Terms • @writecraft (or Twitter handle)

---

## Technical Implementation

### Tech Stack
- **Framework:** Plain HTML + CSS (no build step)
- **Hosting:** Vercel, Netlify, or GitHub Pages
- **Analytics:** Plausible or Fathom (privacy-respecting)

### Project Structure
```
writecraft-landing/
├── index.html
├── styles.css
├── favicon.ico
├── apple-touch-icon.png
├── og-image.png          # Social preview (1200x630)
└── README.md
```

### Meta Tags Required
```html
<title>WriteCraft — AI guidance that preserves your voice</title>
<meta name="description" content="A writing mentor that guides you from raw idea to polished draft with a light touch.">
<meta property="og:title" content="WriteCraft">
<meta property="og:description" content="AI guidance that preserves your voice">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

### Dark Mode
Use CSS `prefers-color-scheme` media query:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0a;
    --text: #fafafa;
    --text-secondary: #a0a0a0;
  }
}
```

### Responsive Breakpoints
- Mobile: `< 640px`
- Desktop: `≥ 640px`

Mobile adjustments:
- Reduce hero title size
- Stack workflow stages vertically (optional)
- Reduce vertical padding

---

## Download Link Strategy

### Options

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Releases** | Free, versioned, easy | URL changes per release |
| **S3/Cloudflare R2** | Stable URL, fast CDN | Small cost, setup |
| **Redirect service** | Best of both | Extra config |

### Recommendation
Use GitHub Releases for hosting the `.dmg` file. Create a stable redirect URL (e.g., `writecraft.app/download`) that points to the latest release asset. This can be done with:
- Vercel/Netlify redirects
- A simple serverless function
- Manual update when releasing

---

## Implementation Checklist

### Phase 1: Setup & Repo
- [ ] Create new GitHub repo `writecraft-landing`
- [ ] Clone locally
- [ ] Set up HTML5 boilerplate with semantic structure
- [ ] Add meta tags (SEO, OG, Twitter cards)
- [ ] Add placeholder favicon

### Phase 2: HTML Structure
- [ ] Build nav (logo + download button)
- [ ] Build hero section
- [ ] Build value section
- [ ] Build workflow visual
- [ ] Build footer

### Phase 3: CSS Styling
- [ ] Define CSS custom properties
- [ ] Style base elements (reset, typography)
- [ ] Style nav
- [ ] Style hero
- [ ] Style value section
- [ ] Style workflow visual
- [ ] Style footer
- [ ] Add dark mode via `prefers-color-scheme`
- [ ] Add responsive styles for mobile

### Phase 4: Polish
- [ ] Add hover transitions on buttons/links
- [ ] Ensure accessibility (color contrast, focus states)
- [ ] Test in Safari, Chrome, Firefox
- [ ] Validate HTML

### Phase 5: Deploy to Vercel
- [ ] Push code to GitHub
- [ ] Connect repo to Vercel
- [ ] Deploy (automatic on push)
- [ ] Test live URL
- [ ] (Optional) Configure custom domain

### Phase 6: Download Setup
- [ ] Upload `.dmg` to GitHub Releases (or host elsewhere)
- [ ] Update download button href to point to release asset
- [ ] Test download flow end-to-end

---

## Deployment Guide (Vercel)

### Prerequisites
- GitHub account with the `writecraft-landing` repo
- Vercel account (free tier works fine)

### Step-by-Step Deployment

**1. Push to GitHub**
```bash
cd writecraft-landing
git init
git add .
git commit -m "Initial landing page"
git remote add origin https://github.com/YOUR_USERNAME/writecraft-landing.git
git push -u origin main
```

**2. Connect to Vercel**
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import the `writecraft-landing` repository
4. Framework Preset: Select "Other" (plain HTML)
5. Click "Deploy"

**3. Automatic Deployments**
- Every push to `main` triggers a new deployment
- Preview deployments are created for pull requests
- No build step needed for plain HTML/CSS

**4. Default URL**
Vercel provides a URL like:
```
https://writecraft-landing.vercel.app
```

### Custom Domain (Optional)

**Option A: Buy through Vercel**
1. Go to Project Settings → Domains
2. Click "Buy" and search for your domain
3. Vercel handles DNS automatically

**Option B: Use existing domain**
1. Go to Project Settings → Domains
2. Add your domain (e.g., `writecraft.app`)
3. Update DNS records at your registrar:
   - **A Record:** `76.76.21.21`
   - **CNAME:** `cname.vercel-dns.com` (for www subdomain)
4. Vercel provisions SSL automatically

### Environment Variables (if needed later)
- Go to Project Settings → Environment Variables
- Add any secrets (e.g., analytics keys)
- Redeploy for changes to take effect

---

## Download Hosting Strategy

### Recommended: GitHub Releases

**Setup:**
1. In your main WriteCraft repo, go to Releases
2. Create a new release (e.g., `v1.0.0`)
3. Upload the `.dmg` file as a release asset
4. Copy the direct download URL

**Download URL format:**
```
https://github.com/YOUR_USERNAME/writecraft/releases/latest/download/WriteCraft.dmg
```

The `latest` path automatically resolves to the most recent release.

**In your landing page:**
```html
<a href="https://github.com/YOUR_USERNAME/writecraft/releases/latest/download/WriteCraft.dmg" class="btn">
  Download for macOS
</a>
```

### Alternative: Vercel Redirect

If you want a cleaner URL like `writecraft.app/download`, add a `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/download",
      "destination": "https://github.com/YOUR_USERNAME/writecraft/releases/latest/download/WriteCraft.dmg",
      "permanent": false
    }
  ]
}
```

Then your button can link to `/download` instead.

---

## Project Structure (Final)

```
writecraft-landing/
├── index.html           # Main page
├── styles.css           # All styles
├── vercel.json          # (Optional) Redirects config
├── favicon.ico          # Browser tab icon
├── apple-touch-icon.png # iOS home screen icon
├── og-image.png         # Social sharing preview (1200x630)
└── README.md            # Project documentation
```

---

## Post-Launch Checklist

- [ ] Verify live URL loads correctly
- [ ] Test download button (actually downloads the .dmg)
- [ ] Check dark mode appearance
- [ ] Test on mobile device
- [ ] Verify OG image shows in social previews (use [opengraph.xyz](https://opengraph.xyz))
- [ ] (Optional) Add Plausible/Fathom analytics
- [ ] (Optional) Set up custom domain

---

## Future Enhancements (Optional)

- App screenshot/video in hero
- Testimonials section
- "How it works" expanded section
- Blog/changelog link
- Email capture for updates
- Windows/Linux download options
