import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';
import { ObjectID } from 'mongodb';

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: "Missing email" });
      return;
    }

    if (!password) {
      res.status(400).json({ error: "Missing password" });
      return;
    }

    try {
      // lets check if the user already exists
      const Users = await dbClient.usersCollection();
      const user = await Users.findOne({ email });
      if (user) {
        res.status(400).json({ error: "Already exist" });
        return;
      }

      // Now we will insert a new user in MongoDb
      const hashed_password = sha1(password);
      const newUser = await Users.insertOne({
        email,
        password: hashed_password,
      });

      const sendData = {
        id: newUser.insertedId,
        email,
      };

      res.status(201).json(sendData);
    } catch (error) {
      console.error('error in postNew: ', error);
      res.status(500).json({ error: "Internal Server Error"});
    }
  },

  async getMe(req, res) {
    // const token = req.header('x-token');
    const { 'x-token': token } = req.headers;

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const key = `auth_${token}`;

    try {
      const userId = await redisClient.get(key);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await (await dbClient.usersCollection()).findOne({
        _id: ObjectID(userId),
      });
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      return res.status(200).json({ email: user.email, id: user._id });
    } catch(error) {
      res.status(500).json({ error: "Internal Server Error!" });
    }
  }
}

export default UsersController;
