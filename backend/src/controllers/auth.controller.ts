import { Request, Response, NextFunction } from 'express';
import { User, IUserDocument } from '../models/user.model';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, lastname, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const passwordHash = await hashPassword(password);

    const user: IUserDocument = new User({
      name,
      lastname,
      email,
      password: passwordHash,
      educationalEmails: [],
      institutions: [],
      role: 'user',
      isActive: true,
    });

    await user.save();

    const token = generateToken(user._id.toString());

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken(user._id.toString());

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};
