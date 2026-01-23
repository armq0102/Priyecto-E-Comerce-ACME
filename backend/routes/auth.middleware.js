const jwt = require('jsonwebtoken');

// Asegúrate de que este secreto sea el mismo que usas en auth.routes.js
// En un proyecto real, usa variables de entorno (process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

const verifyToken = (req, res, next) => {
  // 1. Leer el header Authorization
  const authHeader = req.headers['authorization'];
  console.log('🔍 Header recibido:', authHeader); // <--- LÍNEA DE DEBUG
  
  if (!authHeader) {
    return res.status(403).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  // 2. Extraer el token (Formato esperado: "Bearer <token>")
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Acceso denegado. Formato de token incorrecto.' });
  }

  // 3. Verificar el token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
    
    // Token válido: guardamos los datos decodificados en la request y continuamos
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;