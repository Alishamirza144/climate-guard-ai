# ClimateGuard AI — Non-Negotiable Rules & Brand Guide

> Team Spartans • K K Wagh Institute of Engineering Education & Research, Nashik  
> **PREDICT. PREPARE. PROTECT.**

---

## NON-NEGOTIABLE RULES

1. **NO FAKE DATA.** Every number shown to the user must come from a live API call, a trained model, or a clearly labelled simulation. Simulated or demo data must carry a visible **"SIMULATED"** badge. Never invent accuracy figures: show only metrics computed by our own evaluation scripts.

2. **Be scientifically correct:** use SI units, state units everywhere, use standard formulas (cited in code comments), unit-test every formula.

3. **Every external call:** async, timeout (10 s), retry with exponential back-off (max 3), in-memory TTL cache, graceful fallback and a user-visible "data unavailable / last updated" state. The app must **never** crash or show NaN/undefined.

4. **Clean architecture:** routers → engines → services. Engines are pure functions with unit tests.

5. **Strict typing, linting** (ruff + eslint), formatting, meaningful commit messages after every step.

6. **Accessibility** (WCAG AA contrast, keyboard navigation, aria labels) and **dark theme** as default.

7. **At the end of each task:** run the tests, start the app, verify in the browser, and give a short walkthrough artifact with screenshots plus a list of what is done / not done. Do **not** claim something works unless it was run.

8. **Before coding each task:** produce a short Implementation Plan, then proceed without waiting unless a genuine blocker is hit — in which case ask **one precise question**.

---

## BRAND

### Colour Palette

| Token | Hex | Usage |
|---|---|---|
| Primary (deep green) | `#0B5239` | Brand primary, nav, buttons |
| Lime | `#AFD17F` | Accents, icons, Low-risk |
| Orange | `#FDB52B` | Moderate risk, warnings |
| Olive | `#BAB329` | Secondary accent |
| Teal | `#008074` | Links, info states |
| Navy | `#0F1B2D` | Dark surfaces, backgrounds |
| Critical Red | `#E5484D` | Critical risk, errors |

### Typography

- **Headings:** Montserrat / Syne-style bold display (Google Fonts)
- **Body:** Open Sans / Inter

### Logo

Globe with leaf icon + text **"CLIMATEGUARD.AI — PREDICT.PREPARE.PROTECT"**

### Risk Level → Colour Mapping

| Score | Level | Colour |
|---|---|---|
| 0 – 29 | Low | Lime `#AFD17F` |
| 30 – 59 | Moderate | Orange `#FDB52B` |
| 60 – 84 | High | Olive/Amber `#BAB329` |
| 85 – 100 | Critical | Critical Red `#E5484D` |

### Default Demo Locations

Pune (default) • Nashik (Godavari flood demo) • Mumbai • Kolkata • Chennai • Guwahati • Uttarakhand/Nainital (wildfire) • Nagpur (heat) • Ludhiana (crops)

---

## TECH STACK (reference — do not deviate without asking)

**Frontend:** Vite + React 18 + TypeScript (strict) + Tailwind CSS + React Router + Recharts + Leaflet (react-leaflet) + leaflet.heat + Framer Motion + lucide-react. Mobile-first and responsive.

**Backend:** Python 3.11 + FastAPI + httpx (async) + pydantic v2 + SQLite (SQLAlchemy) + APScheduler + scikit-learn / xgboost / joblib + pandas + numpy.

**Data Sources:** Open-Meteo, NASA POWER, NASA FIRMS, NASA GIBS, Overpass, Nominatim (all free). API keys from `backend/.env` — never hard-coded, never exposed to the browser.
