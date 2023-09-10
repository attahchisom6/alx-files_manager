import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { ObjectID as objID } from 'mongodb';
import Queue from 'bull';

const fileQueue = new Queue('fileQueue');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

async function getUserId(req) {
  const { 'x-token': token } = req.headers;
  if (!token) {
    return;
  }
  const userKey = `auth_${token}`;

  try {
    const userId = await redisClient.get(userKey);
    if (!userId) {
      return;
    }
    return userId;
  } catch (error) {
    console.error('Redis Server error:', error);
    return;
  }
}

async function redisError(req, res, userId) {
  try {
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch(error) {
    console.error('Redis server, encountered a problem', error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

const FilesController = {
  async postUpload(req, res) {
    const { 'X-Token': token } = req.headers;
    const { name, type, parentId, isPublic, data } = req.body;

    if (!name) {
      res.status(400).json({ error: "Missing name" });
      return;
    }

    const acceptedTypes = [ 'folder', 'file', 'image' ];
    if (!type || !acceptedTypes.includes(type)) {
      res.status(400).json({ error: "Missing type" });
      return;
    }

    if (type !== "folder" && !data) {
      res.status(400).json({ error: "Missing data" });
      return;
    }

    if (parentId) {
      const parentFile = await(await dbClient.filesCollection()).findOne({
        _id: objID(parentId),
      });

      if (!parentFile) {
        res.status(400).json({ error: "Parent not found" });
        return;
      }

      if (parentFile.type !== 'folder') {
        res.status(400).json({ error: "Parent is not a folder" });
        return;
      }
    }

    const userId = await getUserId(req);
    await redisError(req, res, userId);

    const fileData = {
      userId: userId,
      name: name,
      type: type,
      parentId: parentId || 0,
      isPublic: isPublic || false,
    }

    if (type === 'folder') {
      // const folderName = name;
      // const folderPath = path.join(FOLDER_PATH, folderName);
      console.log('folderName:', FOLDER_PATH);

      try {
        if (!fs.existsSync(FOLDER_PATH)) {
          console.log(`${folderPath} does not  exists. creating...`);
          fs.mkdirSync(FOLDER_PATH);
          console.log('folder created');
        }
      } catch(error) {
        console.log('Could not create a folder:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const storedInDB = await(await dbClient.filesCollection()).insertOne(fileData);
      fileData.id = storedInDB.insertedId;
      delete fileData._id;
      res.status(201).json(fileData);
    } else if (type === 'image' || type === 'file') {
      const fileUuid = uuidv4();

      if (!fs.existsSync(FOLDER_PATH)) {
        console.log(`${FOLDER_PATH} does not exists. creating...`);
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
        console.log(`${FOLDER_PATH} created`);
      }

      const filePath = path.join(FOLDER_PATH, fileUuid);

      const decodedData = Buffer.from(data, 'base64').toString('ascii');
      console.log('This is the  decode data', decodedData);

      try {
        fs.writeFileSync(filePath, decodedData);
      } catch (error) {
        console.log('Could Not Write to File:', error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(201).json(fileData);
      fileData.parentId = objID(parentId);
      fileData.localPath = filePath;
      const storedInDB = await (await dbClient.filesCollection()).insertOne(fileData);
      fileData.id = storedInDB.insertedId;
      delete fileData._id;
    }
  },

  async getShow(req, res) {
    const fileId = req.params.id;
    const { 'X-Token': token } = req.headers;

    const userId = getUserId(req);
    await redisError(req, res, userId);

    const requiredFile = await (await dbClient.filesCollection()).findOne({
      _id: dbClient.getObjectID(fileId),
      userId: userId,
    });

    if (!requiredFile) {
      res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(requiredFile);
  },

  async getIndex(req, res) {
    const { parentId, page } = req.query;

    const userId = await getUserId(req); 
    await redisError(req, res, userId);

    try{
      const filesCollection = await dbClient.filesCollection();
      const pipeline = [];

      pipeline.push({
        $match: {
          userId,
          parentId: parentId ? objID(parentId) : 0,
        }
      });
    
      const pageNum = parseInt(page || '1', 10);
      const itemsPerPage = 20;
      const skip = (pageNum - 1) * itemsPerPage;

      pipeline.push(
        { $skip: skip },
        { $limit: itemsPerPage }
      );

      const files = await filesCollection.aggregate(pipeline).toArray();
      console.log(files);
      res.status(200).json(files);
    } catch(error) {
      console.log('could fetch files from the database', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  async putPublish(req, res) {
    const fileId = req.params.id;

    const userId = await getUserId(req);
    await redisError(req, res, userId);

    const requiredFile = await( await dbClient.filesCollection()).findOne({
      _id: dbClient.getObjectID(fileId),
      userId: userId,
    });

    if ( requiredFile) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    requiredFile.isPublic = true;
    res.status(200).json(requiredFile);
  },

  async putUnpublish(req, res) {
    const fileId = req.params.id;

    const userId = await getUserId(req);
    await redisError(req, res, userId);

    const requiredFile = await(await dbClient.filesCollection()).findOne({
      _id: dbClient.getObjectID(fileId),
      userId: userId,
    });

    if (!requiredFile) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    requiredFile.isPublic = false;
    res.status(200).json(requiredFile);
  },

  async getData(req, res) {
    const fileId = req.params.id;

    try {
      const requiredFile = await(await dbClient.filesCollection()).findOne({ _id: dbClient.getObjectID(fileId) });

      if (!requiredFile) {
        return res.status(404).json({ error: "Not found" });
        return;
      }

      const userId = await getUserId(req);
      if (!requiredFile.isPublic && (!userId || requiredFile.userId !== userId)) {
        return res.status(404).json({ error: "Not found" });
      }

      if (requiredFile.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" })
      }

      const filePath = requiredFile.localPath;
      if (!fs.existsFileSync(filePath)) {
        return res.status(404).json({ error: "Not found" });
      }

      if (mime.lookup(filePath) === 'file') {
        const fileData = fs.readFileSync(requiredFile, 'utf-8');
        res.status(200).json({ data: fileData });
      }
    } catch(error) {
      console.log('An u expected Error occurred in the mongo Server', error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
}

export default FilesController;
