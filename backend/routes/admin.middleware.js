// Middleware para verificar rol de administrador
// Se asume que req.user ya fue poblado por verifyToken
const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso solo para administradores' });
    }
    next();
};

module.exports = verifyAdmin;