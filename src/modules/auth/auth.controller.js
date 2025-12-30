import { AuthService } from "./auth.service.js";

export const AuthController = {
  async register(req, res, next) {
    try {
      const result = await AuthService.registerPasien(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async registerDokter(req, res, next) {
    try {
      const result = await AuthService.registerDokter(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async registerPetugas(req, res, next) {
    try {
      const result = await AuthService.registerPetugas(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
  
  async login(req, res, next) {
    try {
      const result = await AuthService.login(
        req.body.username,
        req.body.password
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const result = await AuthService.getMe(
        req.user.akun_id,
        req.user.role
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
