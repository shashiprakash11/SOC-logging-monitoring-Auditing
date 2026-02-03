import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config";
import { UserRole } from "./types";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwtSecret, {
    expiresIn: "8h",
    issuer: config.jwtIssuer
  });

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret, {
    issuer: config.jwtIssuer
  });
  return decoded as JwtPayload;
};

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, 12);

export const verifyPassword = async (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);
