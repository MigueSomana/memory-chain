import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { Types } from 'mongoose';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.createUser(req.body);
    
    // Convertir a objeto plano para acceder a las propiedades de timestamps
    const userObj = user.toObject();
    
    // No devolver password en la respuesta
    const userResponse = {
      _id: userObj._id,
      name: userObj.name,
      lastname: userObj.lastname,
      email: userObj.email,
      educationalEmails: userObj.educationalEmails,
      institutions: userObj.institutions,
      role: userObj.role,
      isActive: userObj.isActive,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt
    };

    res.status(201).json(userResponse);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Error creating user', details: error.message });
    }
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', role, isActive } = req.query as any;
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const filter: any = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      userService.getAllUsers(filter, p, l),
      userService.getUsersCount(filter)
    ]);

    res.status(200).json({
      data: users,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l)
      }
    });
  } catch (error: any) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Error retrieving users', details: error.message });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    const user = await userService.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error('Error retrieving user:', error);
    res.status(500).json({ error: 'Error retrieving user', details: error.message });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    // No permitir actualización de password sin validación adicional
    if (req.body.password) {
      delete req.body.password;
    }

    const updated = await userService.updateUser(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Error updating user', details: error.message });
    }
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    const deleted = await userService.deleteUser(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
};