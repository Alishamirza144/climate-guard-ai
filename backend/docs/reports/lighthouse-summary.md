# Lighthouse summary

This project already contains a Lighthouse report in frontend/lighthouse-report.json. The report indicates the app is running with a strong baseline on key performance metrics and should be used as the baseline artifact for production review.

## Current baseline
- FCP: ~1.6s
- LCP: ~2.0s
- Speed Index: ~2.7s
- Primary categories: performance-oriented and PWA-ready with a service worker and manifest in place.

## Production note
A full browser-grade Lighthouse run should be executed in a CI or staging environment with a production build before final release sign-off.
