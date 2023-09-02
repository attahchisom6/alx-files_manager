import redis from 'redis'
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.hasConnected = true;
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.error(error);
      this.hasConnected = false;
    })
    .on('connect', () => {
      this.client.hasConnected = true;
    });
  }

  isAlive() {
    return this.hasConnected;
  }

  async set(key, value, expirationDuration) {
    //setex for setting with expiration duration
    const asyncSet = promisify(this.client.setex).bind(this.client);
    await asyncSet(key, expirationDuration, value);
  }

  async get(key) {
    const asyncGet = promisify(this.client.get).bind(this.client);
    const result = await asyncGet(key);
    return result;
  }

  async del(key) {
    const asyncDel = promisify(this.client.del).bind(this.client);
    await asyncDel(key);
    console.log('Successfully deleted value with key:', key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
