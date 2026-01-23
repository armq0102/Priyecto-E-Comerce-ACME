const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Archivo físico donde se guardarán los datos
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Función para inicializar la DB con el usuario admin por defecto
const initDB = () => {
    if (!fs.existsSync(USERS_FILE)) {
        const initialUsers = [
            {
                id: 'admin-1',
                name: 'Administrador',
                email: 'admin@acme.com',
                password: bcrypt.hashSync('Admin123!', 10),
                role: 'admin'
            }
        ];
        fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
        console.log('DB Usuarios creada');
    }

    if (!fs.existsSync(ORDERS_FILE)) {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
        console.log('DB Pedidos creada');
    }

    if (!fs.existsSync(PRODUCTS_FILE)) {
        // Seed inicial de productos con Stock para que el backend coincida con el frontend
        const initialProducts = [
            { id: 'p1', title: 'Camisa clásica', price: 29.99, stock: 20 },
            { id: 'p2', title: 'Pantalón urbano', price: 49.99, stock: 15 },
            { id: 'p3', title: 'Chaqueta ligera', price: 79.99, stock: 10 },
            { id: 'p4', title: 'Vestido veraniego', price: 39.99, stock: 25 },
            { id: 'p5', title: 'Blusa estampada', price: 24.99, stock: 30 },
            { id: 'p6', title: 'Falda midi', price: 34.99, stock: 12 },
            { id: 'p7', title: 'Gorra clásica', price: 14.99, stock: 50 },
            { id: 'p8', title: 'Bolso de mano', price: 49.99, stock: 8 },
            { id: 'p9', title: 'Cinturón de cuero', price: 24.99, stock: 18 }
        ];
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(initialProducts, null, 2));
        console.log('DB Productos creada con datos iniciales');
    }
};

// Obtener todos los usuarios (SELECT * FROM users)
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) initDB();
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
};

// Guardar cambios (INSERT / UPDATE)
const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// --- FUNCIONES PARA PEDIDOS ---
const getOrders = () => {
    if (!fs.existsSync(ORDERS_FILE)) initDB();
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
};

const saveOrders = (orders) => {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

// --- FUNCIONES PARA PRODUCTOS (Catálogo Maestro) ---
const getProducts = () => {
    if (!fs.existsSync(PRODUCTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
};

const saveProducts = (products) => {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
};

// Inicializar la base de datos automáticamente al arrancar el servidor
initDB();

module.exports = { getUsers, saveUsers, getOrders, saveOrders, getProducts, saveProducts };