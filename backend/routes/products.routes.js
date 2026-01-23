const { Router } = require('express');
const { getProducts } = require('../db.js');

const router = Router();

// GET /api/products - Obtener catálogo público con stock
router.get('/', (req, res) => {
    try {
        const products = getProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener productos' });
    }
});

module.exports = router;