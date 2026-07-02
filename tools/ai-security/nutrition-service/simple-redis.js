const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

module.exports = {
    get: (key) => redis.get(key),
    set: (key, value, ttl) => redis.set(key, value, 'EX', ttl),
    del: (key) => redis.del(key),
    close: () => redis.quit()
};
