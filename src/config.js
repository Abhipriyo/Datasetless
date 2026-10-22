// Branding and links. Override any of these at build time with Vite env vars
// (e.g. in Vercel/Netlify project settings) — see README.
const env = import.meta.env || {};

export const BRAND = {
  product: 'Datasetless',
  tagline: 'Ask a question. Get a dashboard. No dataset required.',
  author: env.VITE_AUTHOR_NAME || 'Abhipriyo',
  // Your portfolio / LinkedIn. Shown in "Made by" links when set.
  authorUrl: env.VITE_AUTHOR_URL || '',
  // Where "Work with me" buttons go: a Cal.com link, a Tally form or a mailto:.
  // The client CTA is hidden until this is set.
  contactUrl: env.VITE_CONTACT_URL || '',
  githubUrl: env.VITE_GITHUB_URL || '',
};

export const LIMITS = {
  maxFileMB: 200,
  maxShareChars: 6000, // pasted tables larger than this are not embedded in share links
};

// Plans and checkout. Set the checkout links to Stripe Payment Links, Lemon Squeezy
// or Paddle checkout URLs. Until set, the buttons go to VITE_CONTACT_URL.
export const PRICING = {
  pro: { price: env.VITE_PRICE_PRO || '$199', period: '/month per app', yearly: env.VITE_PRICE_PRO_YEARLY || '$1,990/year (2 months free)', checkout: env.VITE_CHECKOUT_PRO_URL || '' },
  business: { price: env.VITE_PRICE_BUSINESS || '$799', period: '/month', yearly: 'Annual contracts and invoicing available', checkout: env.VITE_CHECKOUT_BUSINESS_URL || '' },
};

// Public address of this deployment, used in "Powered by" links from embeds.
export const SITE_URL = env.VITE_SITE_URL || '';
