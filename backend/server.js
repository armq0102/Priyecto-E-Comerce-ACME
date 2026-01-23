
// FASE 1: Configuración del Backend para ACME E-commerce
require('dotenv').config();


const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 👇 IMPORTANTE: Importar el router de auth
const authRoutes = require('./routes/auth.routes.js');
app.use('/api/auth', authRoutes);

const ordersRoutes = require('./routes/orders.routes.js');
app.use('/api/orders', ordersRoutes);

const adminRoutes = require('./routes/admin.routes.js');
app.use('/api/admin', adminRoutes);

const productsRoutes = require('./routes/products.routes.js');
app.use('/api/products', productsRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ message: '¡API de ACME E-commerce funcionando correctamente!' });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
