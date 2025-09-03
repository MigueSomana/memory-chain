import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateUser } from "../middlewares/validation.middleware";

const router = Router();

// Registro con validación
router.post("/register", 
  validateUser,
  register
);

// Login (no necesita validación completa, solo básica)
router.post("/login", 
  (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email?.trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Email is required']
      });
    }
    
    if (!password?.trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Password is required']
      });
    }
    
    // Normalizar email
    req.body.email = email.toLowerCase().trim();
    next();
  },
  login
);

// Perfil del usuario autenticado
router.get("/me", authMiddleware, me);

export default router;