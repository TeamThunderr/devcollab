import { pool } from '../../db/client';

export async function getAISuggestion(): Promise<void> {
  // TODO: call Claude API, stream suggestion tokens
  void pool;
}

export async function reviewCode(): Promise<void> {
  // TODO: call Claude API for code review, stream response
}

export async function explainCode(): Promise<void> {
  // TODO: call Claude API for explanation, stream response
}

export async function generateCode(): Promise<void> {
  // TODO: call Claude API to generate code from prompt, stream response
}
