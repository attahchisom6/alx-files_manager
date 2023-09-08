import redisClient from'../utils/redis';
import dbClient from '../utils/db.js';

const AppController = {
  async getStatus(req, res) {
    try {
      const redisStatus = await redisClient.isAlive();
      const dbStatus = await dbClient.isAlive();

      res.status(200).json({ "redis": redisStatus, "db": dbStatus });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  async getStats(req, res) {
    try {
      const numUsers = await dbClient.nbUsers();
      const numFiles = await dbClient.nbFiles();

      res.status(200).json({ "users": numUsers, "files": numFiles });
    } catch(error) {
      res.status(500).json({ error: "internal Server Error" });
    }
  },
}

export default AppController;
