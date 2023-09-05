import dbClient from '../utils/db';
import redisClient from '../utils';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

async getUserId(res, req) {
  const { 'X-Token': token } = req.headers;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const userId = await redisClient.get(userKey);
    if (!userId) {
      return res.status(401).json({ erro
r: "Unauthorized" });
    }
    return userId;
  } catch (error) {
    console.error('Redis Server error:', error);
    res.status(500).json({ error: "internal Server Error" });
  }
}

const FilesController = {
  async postUpload(req, res) {
    const { 'X-Token': token } = req.headers;
    const { name, type, parentId, isPublic, data } = req.body;

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

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

    const userKey = `auth_${token}`;
    try {
      const userId = await redisClient.get(userKey);
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

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
    }

    const userKey = `auth_${token}`;
    try {
      const userId = await redisClient.get(userKey);
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
      }
    } catch(error) {
      console.error('Error with the redis server', error);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const requiredFile = dbClient.filesCollection.findOne({
      _id: fileId,
      userId: userId,
    });

    if (!requiredFile) {
      res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(requiredFile);
  },

  async getIndex(pageNumber) {
    const { parentId, page } = req.body;

    const userid = await getUserId(req, res);
    if (parentId === 0) {
      return [];
    }
    
    const pageNum = dbClient.filesCollection().aggregate((page) => {
      page = (page - 1) * 20;
    });

    dbClient.filesCollection().findAll({
      parentId: parentId,
      page: page,
    });
  }
}

export default FilesController;
