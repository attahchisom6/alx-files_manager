import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST  || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const mongoUrl = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    this.client.connect()
    .then(() => console.log('Sucessfully connected to the MongoDb Server'))
    .catch((error) => console.log('Session Terminated; could not connect to the Mongo server: ', error));
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const userCollection = this.client.db().collection('users');
    const count = await userCollection.countDocuments();
    return count;
  }

  async nbFiles() {
    const fileCollection = this.client.db().collection('files');
    const count = await fileCollection.countDocuments();
    return count;
  }

  async usersCollection(){
    return this.client.db().collection('users');
  }

  async filesCollection() {
    return this.client.db().collection('files');
  }
}

const dbClient = new DBClient();

export default dbClient;
