import { pool } from '../../db/client';

export async function createSnippet(): Promise<void> {
  // TODO: insert snippet row with language and content
  void pool;
}

export async function listSnippets(): Promise<void> {
  // TODO: select snippets by projectId
}

export async function getSnippetById(): Promise<void> {
  // TODO: select single snippet by id
}

export async function updateSnippet(): Promise<void> {
  // TODO: update snippet content/title/language
}

export async function deleteSnippet(): Promise<void> {
  // TODO: delete snippet row
}
