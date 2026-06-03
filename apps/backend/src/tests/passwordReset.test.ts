import crypto from 'crypto';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') }); // It's in d:\projects\HACKATHON\devcollab\.env

import { query } from '../db/client';
import { authService } from '../modules/auth/auth.service';
import { AppError } from '../utils/errors';

async function runTests() {
  console.log('--- Starting Password Reset Tests ---');
  const testEmail = 'test_reset@devcollab.local';
  
  // 1. Setup: Clean up and create a test user
  await query('DELETE FROM users WHERE email = $1', [testEmail]);
  const result = await query(
    `INSERT INTO users (email, name, password_hash, is_verified) VALUES ($1, $2, $3, TRUE) RETURNING id`,
    [testEmail, 'Test User', 'old_hash']
  );
  const userId = result.rows[0].id;
  
  try {
    console.log('Test 1: Request forgot password');
    const res1 = await authService.forgotPassword({ email: testEmail });
    if (res1.message !== 'If an account exists with this email, a password reset link has been sent.') {
      throw new Error('Forgot password failed or wrong message');
    }
    
    // Verify token was created
    const tokens = await query('SELECT * FROM password_reset_tokens WHERE user_id = $1', [userId]);
    if (tokens.rowCount !== 1) throw new Error('Token not inserted');

    // To test the token, we need the raw token. However, authService.forgotPassword doesn't return it (by design).
    // Let's manually generate a token to test resetPassword with valid, invalid, expired logic.
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    
    // Generate valid token
    const validToken = crypto.randomBytes(32).toString('hex');
    const validTokenHash = crypto.createHash('sha256').update(validToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, validTokenHash, expiresAt]);
    
    // Test 2: Invalid Token
    console.log('Test 2: Reset with invalid token');
    let threwInvalid = false;
    try {
      await authService.resetPassword({ token: 'invalid_token', newPassword: 'Password123!' });
    } catch (e: any) {
      if (e.message.includes('Invalid or expired')) threwInvalid = true;
    }
    if (!threwInvalid) throw new Error('Failed to reject invalid token');

    // Test 3: Expired Token
    console.log('Test 3: Reset with expired token');
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredTokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    await query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, expiredTokenHash, pastDate]);
    
    let threwExpired = false;
    try {
      await authService.resetPassword({ token: expiredToken, newPassword: 'Password123!' });
    } catch (e: any) {
      if (e.message.includes('Invalid or expired')) threwExpired = true;
    }
    if (!threwExpired) throw new Error('Failed to reject expired token');

    // Test 4: Valid Token
    console.log('Test 4: Reset with valid token');
    await authService.resetPassword({ token: validToken, newPassword: 'Password123!' });
    const updatedUser = await query('SELECT password_hash, token_version FROM users WHERE id = $1', [userId]);
    const isMatch = await bcrypt.compare('Password123!', updatedUser.rows[0].password_hash);
    if (!isMatch) throw new Error('Password was not updated correctly');
    if (updatedUser.rows[0].token_version !== 2) throw new Error('Token version not incremented');

    // Test 5: Reused Token (Single Use)
    console.log('Test 5: Reuse valid token');
    let threwReused = false;
    try {
      await authService.resetPassword({ token: validToken, newPassword: 'NewPassword123!' });
    } catch (e: any) {
      if (e.message.includes('Invalid or expired')) threwReused = true;
    }
    if (!threwReused) throw new Error('Failed to reject reused token');
    
    console.log('✅ All tests passed successfully!');
  } finally {
    await query('DELETE FROM users WHERE email = $1', [testEmail]);
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
