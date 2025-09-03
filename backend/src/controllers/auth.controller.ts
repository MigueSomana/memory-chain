import { Request, Response } from "express";
import { User } from "../models/User";
import { generateToken } from "../utils/jwt";

// Importar tipos personalizados
import '../types/express';

export const register = async (req: Request, res: Response) => {
  const { name, lastname, email, password } = req.body;

  try {
    // Verificar si el email ya existe
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ 
        message: "Email already in use",
        details: ["An account with this email already exists"] 
      });
    }

    // Crear nuevo usuario
    const newUser = new User({ 
      name: name.trim(), 
      lastname: lastname?.trim(), 
      email: email.toLowerCase(), 
      password 
    });
    await newUser.save();

    // Generar token
    const token = generateToken(newUser);

    // Respuesta sin password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(201).json({ 
      token, 
      user: userResponse,
      message: "Registration successful"
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ 
      message: "Registration error", 
      error: err.message 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Buscar usuario por email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ 
        message: "Invalid credentials",
        details: ["Email or password is incorrect"]
      });
    }

    // Verificar si la cuenta está activa
    if (!user.isActive) {
      return res.status(401).json({ 
        message: "Account is inactive",
        details: ["Your account has been deactivated. Contact support."]
      });
    }

    // Verificar password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        message: "Invalid credentials",
        details: ["Email or password is incorrect"]
      });
    }

    // Generar token
    const token = generateToken(user);

    // Respuesta sin password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({ 
      token, 
      user: userResponse,
      message: "Login successful"
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      message: "Login error", 
      error: err.message 
    });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        message: "User not authenticated" 
      });
    }

    // Poblar instituciones para respuesta completa
    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('institutions', 'name emailDomain country type');

    return res.status(200).json({ 
      user: populatedUser,
      message: "User profile retrieved successfully"
    });
  } catch (err: any) {
    console.error('Get profile error:', err);
    return res.status(500).json({ 
      message: "Error retrieving profile", 
      error: err.message 
    });
  }
};