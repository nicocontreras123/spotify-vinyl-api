import { registerUser, loginUser, getUserById } from '../services/authService.js';

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { email, password }
 */
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere email y contraseña'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'Por favor ingresa un email válido'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Register user
    const result = await registerUser(email, password);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Error in register:', error);

    if (error.message === 'El email ya está registrado') {
      return res.status(409).json({
        error: 'Email duplicado',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Error en el registro',
      message: 'Ocurrió un error al crear tu cuenta. Intenta nuevamente.'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere email y contraseña'
      });
    }

    // Login user
    const result = await loginUser(email, password);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    console.error('Error in login:', error);

    if (error.message === 'Email o contraseña incorrectos') {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Error en el inicio de sesión',
      message: 'Ocurrió un error. Intenta nuevamente.'
    });
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await getUserById(userId);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        spotifyUserId: user.spotify_user_id,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error getting current user:', error);

    res.status(500).json({
      error: 'Error al obtener usuario',
      message: 'No se pudo obtener la información del usuario'
    });
  }
};
