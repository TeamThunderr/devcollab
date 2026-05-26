import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../db/client';

export class WaitlistController {
  async joinWaitlist(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user || !request.user.userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const userId = request.user.userId;

    try {
      // Upsert the user into the waitlist (ON CONFLICT DO NOTHING to preserve original created_at)
      await db.query(
        `INSERT INTO waitlist (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Get the user's created_at timestamp
      const userResult = await db.query(
        `SELECT created_at FROM waitlist WHERE user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return reply.status(500).send({ error: 'Failed to find waitlist record.' });
      }

      const userCreatedAt = userResult.rows[0].created_at;

      // Count how many users joined before this user
      const countResult = await db.query(
        `SELECT COUNT(*) FROM waitlist WHERE created_at < $1`,
        [userCreatedAt]
      );

      const positionAhead = parseInt(countResult.rows[0].count, 10);
      
      // We will add 1400 just for the aesthetic of a long queue if we want,
      // but let's keep it strictly accurate + maybe a base number so it doesn't say "0".
      // Let's just use the actual count + 1428 to make it look like the previous UI, 
      // but it will decrement/increment based on real db values for other users.
      // Wait, to make it accurate to the database, we just return the raw position ahead.
      
      return reply.send({ position: positionAhead });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}

export const waitlistController = new WaitlistController();
