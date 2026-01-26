const { Router } = require('express');
const User = require('../User.model');
const router = Router();

// GET: Listar usuarios
router.get('/', async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener usuarios' });
    }
});

// PATCH: Cambiar estado de usuario (Suspender/Activar)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 1. Validar valores permitidos (Whitelist)
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ msg: 'Estado inválido. Use "active" o "suspended".' });
        }

        // 2. Regla de seguridad: Prevenir auto-bloqueo
        if (req.user.userId === id) {
            return res.status(403).json({ msg: 'Acción denegada: No puedes cambiar tu propio estado.' });
        }

        // 3. Actualizar estado
        const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ msg: 'Error al actualizar estado del usuario' });
    }
});

module.exports = router;