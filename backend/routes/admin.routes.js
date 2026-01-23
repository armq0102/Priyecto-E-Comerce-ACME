const { Router } = require('express');
const verifyToken = require('./auth.middleware.js');
const verifyAdmin = require('./admin.middleware.js');
const { getOrders, saveOrders, getProducts, saveProducts, getUsers } = require('../db.js');

const router = Router();

// 1. OBTENER TODAS LAS ÓRDENES (Solo Admin)
// GET /api/admin/orders
router.get('/orders', verifyToken, verifyAdmin, (req, res) => {
    try {
        const orders = getOrders();
        // Ordenar por fecha descendente (más recientes primero)
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // En un futuro aquí podríamos filtrar campos sensibles del usuario si fuera necesario
        res.json(orders);
    } catch (error) {
        console.error('Error admin orders:', error);
        res.status(500).json({ message: 'Error al obtener el listado de órdenes' });
    }
});

// 2. CAMBIAR ESTADO DE UN PEDIDO
// PATCH /api/admin/orders/:id
router.patch('/orders/:id', verifyToken, verifyAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'El estado es obligatorio' });
        }

        // Validación estricta (Whitelist)
        const VALID_STATUSES = ['Pendiente', 'Enviado', 'Entregado', 'Cancelado'];
        
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ 
                message: `Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}` 
            });
        }

        const orders = getOrders();
        const orderIndex = orders.findIndex(o => o.id === id);
        const order = orders[orderIndex]; // Referencia para facilitar lectura

        if (orderIndex === -1) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        // --- REGLAS DE NEGOCIO (WORKFLOW) ---

        // 1. Bloquear cambios en estados finales
        if (order.status === 'Cancelado') {
            return res.status(400).json({ message: 'No se puede modificar un pedido que ya fue cancelado.' });
        }
        // Opcional: Bloquear cambios si ya fue entregado (depende de tu política)
        // if (order.status === 'Entregado') { ... }

        // 2. DEVOLUCIÓN DE STOCK AL CANCELAR
        if (status === 'Cancelado' && order.status !== 'Cancelado') {
            const products = getProducts();
            // Recorrer items y devolver stock
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (product) {
                    product.stock += item.qty;
                }
            });
            saveProducts(products); // Persistir devolución
        }

        // 3. ACTUALIZAR HISTORIAL (Auditoría)
        if (!order.statusHistory) order.statusHistory = [];
        
        order.statusHistory.push({
            from: order.status,
            to: status,
            date: new Date().toISOString(),
            updatedBy: req.user.email || 'Admin' // Registramos quién hizo el cambio
        });

        // 4. Actualizar estado final
        order.status = status;
        order.updatedAt = new Date().toISOString();
        
        saveOrders(orders);

        res.json({ message: 'Estado actualizado correctamente', order: order });

    } catch (error) {
        console.error('Error actualizando orden:', error);
        res.status(500).json({ message: 'Error interno al actualizar la orden' });
    }
});

// --- CRUD DE PRODUCTOS ---

// 1. CREAR PRODUCTO
// POST /api/admin/products
router.post('/products', verifyToken, verifyAdmin, (req, res) => {
    try {
        const { name, price, stock, imageUrl, status } = req.body;

        // Validaciones
        if (!name || !price || stock === undefined || !imageUrl) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }
        if (price <= 0) return res.status(400).json({ message: 'El precio debe ser mayor a 0' });
        if (stock < 0) return res.status(400).json({ message: 'El stock no puede ser negativo' });

        // Validación de estado (Whitelist)
        const allowedStatus = ['active', 'hidden', 'out_of_stock'];
        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const products = getProducts();
        
        // Validar duplicados (Evita productos clonados)
        const exists = products.some(p => p.title.toLowerCase() === name.trim().toLowerCase());
        if (exists) {
            return res.status(409).json({ message: 'El producto ya existe' });
        }

        const newProduct = {
            id: Date.now().toString(),
            title: name.trim(), // Mapeo para compatibilidad con frontend legacy
            price: Number(price),
            stock: Number(stock),
            img: imageUrl, // Mapeo para compatibilidad
            status: (Number(stock) === 0) ? 'out_of_stock' : (status || 'active'),
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        saveProducts(products);

        res.status(201).json({ message: 'Producto creado correctamente', product: newProduct });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ message: 'Error interno al crear producto' });
    }
});

// 2. EDITAR PRODUCTO
// PUT /api/admin/products/:id
router.put('/products/:id', verifyToken, verifyAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock, imageUrl, status } = req.body;

        const products = getProducts();
        const index = products.findIndex(p => p.id === id);

        if (index === -1) return res.status(404).json({ message: 'Producto no encontrado' });

        // Validación de estado en edición
        const allowedStatus = ['active', 'hidden', 'out_of_stock'];
        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        // Actualizar campos
        const p = products[index];
        p.title = name || p.title;
        p.price = price !== undefined ? Number(price) : p.price;
        p.stock = stock !== undefined ? Number(stock) : p.stock;
        p.img = imageUrl || p.img;
        
        // Lógica de estado automática
        if (p.stock === 0) {
            p.status = 'out_of_stock';
        } else if (status) {
            p.status = status;
        }

        saveProducts(products);
        res.json({ message: 'Producto actualizado', product: p });
    } catch (error) {
        console.error('Error editando producto:', error);
        res.status(500).json({ message: 'Error interno al editar producto' });
    }
});

// 3. CAMBIAR ESTADO
// PATCH /api/admin/products/:id/status
router.patch('/products/:id/status', verifyToken, verifyAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const products = getProducts();
        const product = products.find(p => p.id === id);

        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

        product.status = status;
        saveProducts(products);
        res.json({ message: 'Estado actualizado', product });
    } catch (error) {
        res.status(500).json({ message: 'Error al cambiar estado' });
    }
});

// 3. OBTENER INVENTARIO (Solo Admin)
// GET /api/admin/products
router.get('/products', verifyToken, verifyAdmin, (req, res) => {
    try {
        const products = getProducts();
        res.json(products);
    } catch (error) {
        console.error('Error admin products:', error);
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
});

// 4. ACTUALIZAR STOCK (Solo Admin)
// PATCH /api/admin/products/:id
router.patch('/products/:id', verifyToken, verifyAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { stock } = req.body;

        // Validación estricta: stock debe ser un entero no negativo
        if (stock === undefined || !Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: 'El stock debe ser un número entero mayor o igual a 0' });
        }

        const products = getProducts();
        const productIndex = products.findIndex(p => p.id === id);

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Actualizar stock
        products[productIndex].stock = stock;
        products[productIndex].updatedAt = new Date().toISOString();
        saveProducts(products);

        res.json({ message: 'Stock actualizado correctamente', product: products[productIndex] });

    } catch (error) {
        console.error('Error actualizando stock:', error);
        res.status(500).json({ message: 'Error interno al actualizar producto' });
    }
});

// 5. OBTENER LISTA DE USUARIOS (Solo Admin)
// GET /api/admin/users
router.get('/users', verifyToken, verifyAdmin, (req, res) => {
    try {
        const users = getUsers();

        // NUNCA exponer passwords, ni siquiera hasheados, en una API.
        const sanitizedUsers = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Error admin get users:', error);
        res.status(500).json({ message: 'Error al obtener el listado de usuarios' });
    }
});

module.exports = router;