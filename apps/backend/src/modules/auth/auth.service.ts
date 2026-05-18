import { pool } from '../../db/client';

export async function registerUser(): Promise<void> {
  // TODO: insert new user, hash password with bcrypt
  void pool;
}

export async function loginUser(): Promise<void> {
  // TODO: find user by email, compare bcrypt hash
}

export async function logoutUser(): Promise<void> {
  // TODO: invalidate refresh token in DB
}

export async function refreshUserToken(): Promise<void> {
  // TODO: validate refresh token and issue new pair
}

export async function getUserById(): Promise<void> {
  // TODO: fetch user row by id
}
