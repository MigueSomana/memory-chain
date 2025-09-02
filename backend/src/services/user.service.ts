import { User, IUser } from '../models/User';

export const createUser = (data: Partial<IUser>) => new User(data).save();

export const getAllUsers = () => User.find().populate('institutions');

export const getUserById = (id: string) => User.findById(id).populate('institutions');

export const updateUser = (id: string, data: Partial<IUser>) =>
  User.findByIdAndUpdate(id, data, { new: true }).populate('institutions');

export const deleteUser = (id: string) => User.findByIdAndDelete(id);
