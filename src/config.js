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

// How companies reach you from the "Work with me" page.
//  - VITE_FORM_ENDPOINT: a Formspree (or similar) form URL. Messages arrive in your inbox.
//  - VITE_CONTACT_EMAIL: used for a pre-filled email when no form endpoint is set.
//  - VITE_CONTACT_URL (above): a Cal.com / Calendly link for "Book a call".
export const CONTACT = {
  email: env.VITE_CONTACT_EMAIL || '',
  formEndpoint: env.VITE_FORM_ENDPOINT || '',
};

// Public address of this deployment, used in "Powered by" links from embeds.
export const SITE_URL = env.VITE_SITE_URL || '';
