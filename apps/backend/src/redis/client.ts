import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("connect", () => {
  console.log("Redis client connected");
});

redis.on("ready", () => {
  console.log("Redis client ready");
});

redis.on("error", (err) => {
  console.error("Redis client error:", err);
});

redis.on("close", () => {
  console.warn("Redis client connection closed");
});
