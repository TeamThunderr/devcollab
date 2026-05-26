/**
 * apps/backend/src/modules/ai/ai.config.ts
 *
 * Mock responses for development — returned verbatim when AI_MOCK_MODE=true.
 * This prevents accidental API quota burn during local development.
 *
 * Each key matches an AI feature endpoint.
 * The real Gemini responses will mirror this structure so the frontend
 * does not need to change when mock mode is disabled.
 */

export const mockResponses = {} as const;

export type MockResponseKey = keyof typeof mockResponses;
