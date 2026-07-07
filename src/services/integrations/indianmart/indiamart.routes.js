// routes/metaIntegration.routes.js
import express from 'express';
import { authenticate, authorizeRoles } from '../../../middlewares/auth.middleware.js';
import { getIndiamartClient, onBoardIndiamartClient, updateIndiamartClient } from '../../../controllers/integration.controller.js';

const router = express.Router();

// GET status for a company
router.get('/status',
    authenticate,
    authorizeRoles('company'),
    getIndiamartClient
);

// Create/onboard client endpoint
router.post('/onboard',
    authenticate,
    authorizeRoles('company'),
    onBoardIndiamartClient
);

// update client endpoint - like webhook secret, status etc
router.put('/update',
    authenticate,
    authorizeRoles('company'),
    updateIndiamartClient
);

export default router;
