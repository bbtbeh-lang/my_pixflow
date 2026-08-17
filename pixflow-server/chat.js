// ─────────────────────────────────────────────────────────────────────────
// AI chat assistant — answers basic visitor questions about Pixflow
// (services, pricing, how ordering works) using Google Gemini's free tier
// (no credit card required — see docs/CHATBOT_SETUP.md).
//
// Fails soft, not hard: unlike db.js, a missing/broken API key here does
// NOT crash the server — the chat widget just tells the visitor to use
// the contact form instead. Chat is a convenience feature, never a
// dependency for the site to function.
// ─────────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function isChatConfigured() {
  return Boolean(GEMINI_API_KEY);
}

// Grounded facts so the assistant never invents pricing, packages, or
// policies. Keep in sync with pixflow/pricing.html and services.html.
const SYSTEM_PROMPT = `You are the website assistant for Pixflow, a web design agency serving small businesses in Canada. Reply in the same language the visitor writes in (English or Persian/Farsi — match them exactly). Keep answers short (2-4 sentences), friendly, and concrete.

FACTS YOU MUST STICK TO (never invent numbers, features, or policies beyond this):

Packages (one-time, starting price — final quote always requires a free consultation):
- Basic — $649 CAD starting. Up to 5 responsive pages, mobile-first design, basic on-page SEO, working contact form, 1 round of revisions.
- Professional (most popular) — $1,199 CAD starting. Everything in Basic, plus a self-managed admin panel, portfolio/services/testimonials manager, lead inbox with status tracking, CASL/PIPEDA-compliant forms, 2 rounds of revisions.
- Growth — $1,999 CAD starting. Everything in Professional, plus an online store with payments, a simple built-in CRM, an analytics dashboard, email/SMS automation, 3 rounds of revisions.

Not included in any package: domain registration, third-party subscriptions, and paid ad campaigns (billed separately). Extra pages beyond 5 are priced per page. Bilingual (English + Persian) sites are an add-on.

Services offered: Professional Website Design, Brand-Focused Web Presentation, Lead Generation Structure — all responsive, mobile-first, fast-loading, and SEO-ready.

FAQ:
- The first consultation is free — Pixflow reviews goals and recommends the right package before any payment.
- Clients can upgrade from Basic to Professional later; they only pay the difference.
- Most Canadian agencies charge $3,500–$10,000+ for a comparable small-business site; Pixflow is more affordable because it builds on a proven, reusable foundation instead of starting from scratch.

WHAT TO DO:
- If the visitor wants to start a project, get a quote, or place an order, tell them to fill out the Order form and give them the exact path: /order
- If they have a detailed or unusual question you can't answer confidently from the facts above, tell them to use the Contact form (/contact) so a real person can help, rather than guessing.
- Never quote a final price — only the starting prices above, and always mention the free consultation determines the final quote.
- Never claim to be human. If asked, say you're Pixflow's website assistant.
- Do not discuss unrelated topics, competitor products, or anything outside Pixflow's services.`;

export async function getChatReply(history, userMessage) {
  if (!GEMINI_API_KEY) {
    throw new Error('Chat is not configured (missing GEMINI_API_KEY)');
  }

  // history: array of { role: 'user' | 'model', text: string }, oldest first.
  // Cap it so a long-running conversation can't blow up the request size.
  const trimmedHistory = history.slice(-10);

  const contents = [
    ...trimmedHistory.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!reply) {
    throw new Error('Gemini API returned no reply text');
  }

  return reply.trim();
}
