import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/user.model";
import { Thesis } from "../models/thesis.model";

export async function getAllUsers(_req: Request, res: Response) {
  const users = await User.find().select("-password");
  return res.json(users);
}

export async function getMe(req: AuthRequest, res: Response) {
  return res.json(req.user);
}

export async function updateMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const allowedFields = [
      "img",
      "name",
      "lastname",
      "password",
      "email",
      "educationalEmails",
    ];
    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select("-password");

    return res.json(updated);
  } catch (err) {
    console.error("Error updateMe", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}

export async function getMyLikedTheses(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ message: "No autorizado" });

    const user = await User.findById(req.user._id).populate("likedTheses");
    return res.json(user?.likedTheses ?? []);
  } catch (err) {
    console.error("Error getMyLikedTheses", err);
    return res.status(500).json({ message: "Error del servidor" });
  }
}
