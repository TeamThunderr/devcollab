import { pool } from '../../db/client';

export async function createWikiPage(): Promise<void> {
  // TODO: insert wiki_page row
  void pool;
}

export async function listWikiPages(): Promise<void> {
  // TODO: select wiki pages by projectId
}

export async function getWikiPage(): Promise<void> {
  // TODO: select wiki page by slug
}

export async function updateWikiPage(): Promise<void> {
  // TODO: update content and insert version snapshot
}

export async function deleteWikiPage(): Promise<void> {
  // TODO: delete wiki page and its versions
}

export async function getWikiPageHistory(): Promise<void> {
  // TODO: select version rows for a page
}
