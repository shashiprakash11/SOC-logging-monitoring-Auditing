import { NextFunction, Response } from "express";
import { AuthedRequest } from "./auth";

export const enforceTenant = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const headerTenant = req.headers["x-tenant-id"] as string | undefined;
  const tenantId = headerTenant ?? req.user.tenantId;
  if (tenantId !== req.user.tenantId) {
    res.status(403).json({ error: "Tenant mismatch" });
    return;
  }
  req.headers["x-tenant-id"] = tenantId;
  next();
};
