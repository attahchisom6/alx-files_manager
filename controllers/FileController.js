import dbClient from '../utils/db';
import redisClient from '../utils';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

async getUserId(req) {
  const { 'X-Token': token } = req.headers;
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

async redisError(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } catch(error) {
    console.error('Redis server, encountered a problem', error);
    res.status(500).json({ error: "Internal Server Error" });
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
      const parentFile = await dbClient.filesCollection.findOne({
        _id: dbClient.getObjectID(parentId),
        type: 'folder',
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

    try {
      const userId = await getUserId(req);
      if (!userId) {
        return res.status(400).json({ error: 'Unauthorized' });
      }
    } catch(error) {
      console.error('Could not read from the redis database:', error);
      return res.status(500).json({ error: 'Internal Server Error'});
    };

    const fileData = {
      userId: userId,
      name: name,
      type: type,
      parentId: parentId || '0',
      isPublic: isPublic || false,
      localPath: '',
    }

    if (type === 'folder') {
      const folderName = name;
      const folderPath = path.join(FOLDER_PATH, folderName);

      try {
        fs.mkdirSync(folderPath);
        fileData.localPath = folderPath;
      } catch(error) {
        console.log('Could not create a folder:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      await dbClient.fileCollection().insertOne(fileData);
      res.status(201).json(fileData);
    } else if (type === 'image' || type === 'file') {
      const fileUuid = uuidv4();
      const fileExtension = type === 'image' ? 'png' || 'jpg' : 'txt';
      const filePath = path.join(FOLDER_PATH, `${fileUuid}.${fileExtension}`);

      const decodedData = Buffer.from(data, 'base64');

      try {
        fs.writeFileSync(filePath, decodedData);
      } catch (error) {
        console.log('Could Not Write to File:', error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      fileData.localpath = filePath;
      await dbClient.filesCollection().insertOne(fileData);
      res.status(201).json(fileData);
    }
  },

  async getShow(req, res) {
    const fileId = req.params.id;
    const { 'X-Token': token } = req.headers;

    try {
      const userId = await getUserId(req);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
      }
    } catch(error) {
      console.error('Error with the redis server', error);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const requiredFile = dbClient.filesCollection().findOne({
      _id: dbClient.getObjectID(fileId),
      userId: userId,
    });

    if (!requiredFile) {
      res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(requiredFile);
  },

  async getIndex(pageNumber) {
    const { parentId, page } = req.query;

    try {
      const userId = await getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    } catch(error) {
      console.error('Could not read from redis database;', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (parentId === 0) {
      return [];
    }
    
    const pageNum = parseInt(page || '0', 10);
    const skip = pageNum * 20;

    const files = dbClient.filesCollection().aggregate([
      { $match: { userId: userId, parentId: parentId } },
      { $skip: skip },
      { $limit: 20 },
    ]).toArray();

    res.status(200).json(files);
  },

  async putPublish(res, req) {
    const fileId = req.params.id;

    try {
      const userId = await getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    } catch(error) {
      console.error('Redis server encountered an an error:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }

    const requiredFile = dbClient.filesCollection().findOne({
      _id: dbClient.getObjectID(fileId),
      userId: userId,
    });

    if ( requuredFile) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    requiredFile.isPublic = true;
    res.status(200).json(requiredFile);
  },

  async putUnpublish(req, res) {
    const fileId = req.params.id;

    const userId = await getUserId(req);
    await redisError(req, res);

    const requiredFile = await dbClient.filesCollection().findOne({
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
}

export default FilesController;
