import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController'; 
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FileController';

const router = express.Router();

// endpoint handling the stats and status of the client
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// end point to create users
router.post('/users', UsersController.postNew);

// Authentication based endpoint to connect or  disconnect users
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

// Hamdle File operations
router.post('/files', FilesController.postUpload);

router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);

router.put('/files/:id/putPublish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

export default router;
