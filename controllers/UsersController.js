import dbClient from '../utils/db';
import sha1 from 'sha1';

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: "Missing email" });
    }

    if (!password) {
      res.status(400).json({ error: "Missing password" });
    }

    // lets check if the user already exists
    const Users = dbClient.db.collection('users');
    const user = await Users.findOne({ email });
    if (user) {
      res.status(400).json({ error: "Already exist" });
    }

    // Now we will insert a new user in MongoDbb
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
  }
}

export default UsersController;
