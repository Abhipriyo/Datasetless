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
//  - VITE_CONTACT_EMAIL: where enquiries go. By default the form delivers them to this
//    address through FormSubmit (no account needed; confirm the one-time activation email).
//  - VITE_FORM_ENDPOINT: optional, to use Formspree or another form service instead.
// Your phone number is deliberately NOT stored anywhere in the site. Visitors can leave
// theirs in the form if they prefer a call back.
//  - VITE_CONTACT_URL (above): a Cal.com / Calendly link for "Book a call".
const CONTACT_EMAIL = env.VITE_CONTACT_EMAIL || 'abhipriyo.scholasticsolutions@gmail.com';
export const CONTACT = {
  email: CONTACT_EMAIL,
  formEndpoint: env.VITE_FORM_ENDPOINT || (CONTACT_EMAIL ? `https://formsubmit.co/ajax/${CONTACT_EMAIL}` : ''),
};

// Public address of this deployment, used in "Powered by" links from embeds.
export const SITE_URL = env.VITE_SITE_URL || '';
