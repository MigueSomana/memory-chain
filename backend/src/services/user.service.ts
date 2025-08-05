import { User, IUser } from '../models/User';

export const createUser = async (data: Partial<IUser>) => {
  const user = new User(data);
  return user.save();
};

export const getAllUsers = async () => {
  return User.find().populate('institutionIds');
};

export const getUserById = async (id: string) => {
  return User.findById(id).populate('institutionIds');
};

export const updateUser = async (id: string, data: Partial<IUser>) => {
  return User.findByIdAndUpdate(id, data, { new: true }).populate('institutionIds');
};

export const deleteUser = async (id: string) => {
  return User.findByIdAndDelete(id);
};
