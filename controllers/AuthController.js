import shai from 'shai';
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
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const { email, password } = credentials.split(':');

    if (!email || !password) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const hashedpassword = sha1(password);
      const user = await dbClient.userCollection.findOne({ email, password: hashedPassWord });
    } catch(error) {
      res.status(401).json({ error: "Unauthorized" }):
      return;
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user.id, 86400);
    res.status(200).json({ "token": token });
  },

  async getDisconnect(res, req) {
    const { 'X-Token': token } = req.haeaders;

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const key = `auth_${token} `;
    await redisClient.del(key);
    res.status(204).json();
  },
}

export default AuthContoller;