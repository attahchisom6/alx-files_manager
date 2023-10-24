import Queue from 'bull';
import dbClient from './utils/db';
import promisify from 'util'
import fs from 'fs';
import imageThumBnail from 'image-thumbnail';
import { objectID as objID } from 'mongo';
const fileQueue = new Queue('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

fileQueue.process((jobi, done) => {
  const { userId, fileId } = job.data;
  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }

  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }

  try {
    const requiredFile = await(await dbClient.filesCollection()).findOne({
      _id: objID(fileId),
      userId: userId,
    });
  } catch (error) {
    console.error('File not found');
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  const thumbnailedFiles = sizes.map(async (size) => {
    const localFilePath = requiredFile.localPath_${size}; 
    const thumbnail = generateThumbnails(size, requiredFile.localpath)
    .then((thumbnail) => {
      await writeAsync(requiredFile.localPath, thumbnail);
    })
    .catch((error) => {
      console.error('could not write a thumbnail');
    })
  });
});

const writeAsync = promisify(fs.write);

const generateThumbnails = async (width, localPath) => {
  const thumbnail = await imageThumbnail(localpath, { width, });
  return thumbnail;
});
