const express = require('express');
const router = express.Router();
const eventController = require('../Controllers/eventController');

// Rota GET para consultar eventos com filtros e paginação
router.get('/events', eventController.getEvents);

module.exports = router;
