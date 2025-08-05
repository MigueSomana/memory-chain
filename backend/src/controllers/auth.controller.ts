import { Request, Response } from "express";
import { User } from "../models/User";
import { generateToken } from "../utils/jwt";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already used" });

    const newUser = new User({ name, email, password });
    await newUser.save();

    const token = generateToken(newUser);
    return res.status(201).json({ token, user: newUser });
  } catch (err) {
    return res.status(500).json({ message: "Registration error", error: err });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    return res.status(200).json({ token, user });
  } catch (err) {
    return res.status(500).json({ message: "Login error", error: err });
  }
};

export const me = async (req: Request, res: Response) => {
  return res.status(200).json({ user: req.user });
};
