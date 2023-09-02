import { isAlive as isRedisAlive } from '../utils/redis'
import { isAlive as isDbAlive, nbUsers, nbFiles } from '../utils/db';

const AppController = {
  async getStatus(req, res) {
    try {
      const redisStatus = await isRedisAlive();
      const dbStatus = await isDbAlive();

      res.status(200).json({ "redis": redisStatus, "db": dbStatus });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  async getStats(req, res) {
    try {
      const numUsers = await nbUsers();
      const numFiles = await nbFiles();

      res.status(200).json({ "users": numUsers, "files": numFiles });
    } catch(error) {
      res.status(500).json({ error: "internal Server Error" });
    }
  },
}

module.exports = AppController;
