import dbClient from '../utils/db';
import redisClient from '../utils';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FileController = {
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

    const acceptedTypes = [ folder, files, image ];
    if (!type || !acceptedTypes.includes(type)) {
      res.status(400).json({ error: "Missing name" });
      return;
    }

    if (type != "folder" && !data) {
      res.status(400).json({ error: "Missing data" });
      return;
    }

    if (parentId) {
      const parentFile = await dbClient.FilesCollection.findOne({
        _id: dbClient.getObjectID(parentId),
        type: 'folder';
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
    const userId = redisClient.get(userKey);
    if (!userKey) {
      res.status(400).json({ error: 'Unauthorized' });
      return;
    }

    const fileData = {
      userId: userid,
      name: name,
      type: 'folder',
      parentId: parentId || '0',
      isPublic: isPublic || false;
    }
