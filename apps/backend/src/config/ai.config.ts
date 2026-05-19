/**
 * apps/backend/src/config/ai.config.ts
 *
 * Centralized AI configuration for Module 7 (Gemini integration).
 * All AI-related behaviour is controlled from here — model selection,
 * retry logic, generation parameters, and mock mode.
 */

export const aiConfig = {
  apiKey: process.env.GEMINI_API_KEY ?? "",

  /** Primary model — highest capability */
  model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-preview-05-20",

  /** Fallback model — used when the primary hits rate limits (500 RPD free tier) */
  fallbackModel:
    process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.1-flash-lite-preview-06-17",

  /**
   * When true, all AI routes return pre-defined mock responses instead of
   * hitting the Gemini API. Set to false only for integration testing or demos.
   */
  mockMode: process.env.AI_MOCK_MODE === "true",

  // ── Rate limit awareness ───────────────────────────────────────────────────
  /** Number of automatic retries on 429 / 503 before giving up */
  maxRetries: 2,

  /** Milliseconds to wait between retries */
  retryDelayMs: 2000,

  // ── Generation parameters ─────────────────────────────────────────────────
  generationConfig: {
    /** Controls randomness — 0 = deterministic, 1 = max creative */
    temperature: 0.7,

    /** Hard cap on response length in tokens */
    maxOutputTokens: 2048,
  },
} as const;

export type AIConfig = typeof aiConfig;
