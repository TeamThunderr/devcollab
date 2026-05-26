import Redis from "ioredis";

let redisClient: Redis | null = null;
let redisAvailable = false;
let redisWarningLogged = false;

/**
 * Initialize Redis client with graceful degradation for development mode.
 * If Redis is unavailable, the backend continues to work without realtime features.
 */
function initializeRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  
  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true, // Don't connect immediately
      maxRetriesPerRequest: 1, // Minimal retries to avoid spam
      enableReadyCheck: false, // Don't wait for ready check
      enableOfflineQueue: false, // Don't queue commands when offline
      retryStrategy: (times) => {
        // Only retry once in development
        if (times > 1) {
          return null; // Stop retrying after 1 attempt
        }
        return Math.min(times * 50, 200);
      },
    });

    // Suppress repeated error logs by only logging once
    client.on("error", (err) => {
      if (!redisWarningLogged) {
        console.warn(
          "⚠️  Redis unavailable — running in degraded mode (realtime features disabled)"
        );
        redisWarningLogged = true;
      }
      // Silently ignore subsequent errors to avoid spam
    });

    client.on("connect", () => {
      console.log("✅ Redis connected successfully");
      redisAvailable = true;
      redisWarningLogged = false; // Reset warning flag on reconnect
    });

    client.on("ready", () => {
      console.log("✅ Redis client ready");
    });

    client.on("close", () => {
      console.warn("⚠️  Redis connection closed");
      redisAvailable = false;
    });

    return client;
  } catch (error) {
    console.warn(
      "⚠️  Redis initialization failed — continuing without Redis"
    );
    return null;
  }
}

// Initialize client
redisClient = initializeRedisClient();

/**
 * Get the Redis client instance
 * Returns null if Redis is unavailable
 */
export function getRedis(): Redis | null {
  return redisClient;
}

/**
 * Check if Redis is currently available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient?.status === "ready";
}

/**
 * Safely execute a Redis command with fallback
 * If Redis is unavailable, the promise resolves without error
 */
export async function safeRedisCommand<T>(
  command: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!redisClient || redisClient.status === "close") {
    return fallback;
  }
  try {
    return await command();
  } catch (error) {
    // Silently fail for Redis commands when unavailable
    return fallback;
  }
}

export { redisClient as redis };
