import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const AuthController = {
  async getConnect(req, res) {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const hashedPassword = sha1(password);
      const user = await (await dbClient.usersCollection()).findOne({ email, password: hashedPassword });
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400);
      res.status(200).json({ token });
    } catch(error) {
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
  },

  async getDisconnect(req, res) {
    const { 'x-token': token } = req.headers;

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const key = `auth_${token}`;
    await redisClient.del(key);
    res.status(204).json();
  },
}

export default AuthController;
