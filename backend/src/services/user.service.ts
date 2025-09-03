import { User, IUser } from '../models/User';

export const createUser = async (data: Partial<IUser>) => {
  const user = new User(data);
  return await user.save();
};

export const getAllUsers = async (filter: any = {}, page = 1, limit = 10) => {
  return await User.find(filter)
    .select('-password')
    .populate('institutions', 'name emailDomain country')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

export const getUsersCount = async (filter: any = {}) => {
  return await User.countDocuments(filter);
};

export const getUserById = async (id: string) => {
  return await User.findById(id)
    .select('-password')
    .populate('institutions', 'name emailDomain country type departments');
};

export const updateUser = async (id: string, data: Partial<IUser>) => {
  return await User.findByIdAndUpdate(id, data, { 
    new: true, 
    runValidators: true 
  })
  .select('-password')
  .populate('institutions', 'name emailDomain country');
};

export const deleteUser = async (id: string) => {
  return await User.findByIdAndDelete(id);
};

export const findUserByEmail = async (email: string) => {
  return await User.findOne({ email }).populate('institutions');
};