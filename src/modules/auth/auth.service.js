import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../config/db.js";
import { AuthRepository } from "./auth.repository.js";

export const AuthService = {
  async registerPasien(payload) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const password_hash = await bcrypt.hash(payload.password, 10);

      const akunId = await AuthRepository.insertAkun(conn, {
        username: payload.username,
        email: payload.email,
        password_hash,
      });

      await AuthRepository.insertPasien(conn, {
        akun_id: akunId,
        nik: payload.nik,
        nama: payload.nama,
        jenis_kelamin: payload.jenis_kelamin,
        tgl_lahir: payload.tgl_lahir || null,
        alamat: payload.alamat || null,
        no_telepon: payload.no_telepon || null,
      });

      await conn.commit();

      const token = jwt.sign(
        { akun_id: akunId, role: "PASIEN" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return { akun_id: akunId, role: "PASIEN", token };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async registerDokter(payload) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const password_hash = await bcrypt.hash(payload.password, 10);

      const akunId = await AuthRepository.insertAkunDokter(conn, {
        username: payload.username,
        email: payload.email,
        password_hash,
      });

      await AuthRepository.insertDokter(conn, {
        akun_id: akunId,
        nip: payload.nip,
        nama: payload.nama,
      });

      await conn.commit();

      const token = jwt.sign(
        { akun_id: akunId, role: "DOKTER" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return { akun_id: akunId, role: "DOKTER", token };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async registerPetugas(payload) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const password_hash = await bcrypt.hash(payload.password, 10);

      const akunId = await AuthRepository.insertAkunPetugas(conn, {
        username: payload.username,
        email: payload.email,
        password_hash,
      });

      await AuthRepository.insertPetugas(conn, {
        akun_id: akunId,
        nip: payload.nip,
        nama: payload.nama,
      });

      await conn.commit();

      const token = jwt.sign(
        { akun_id: akunId, role: "PETUGAS" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return { akun_id: akunId, role: "PETUGAS", token };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async login(username, password) {
    const conn = await db.getConnection();
    const akun = await AuthRepository.findByUsername(conn, username);

    if (!akun) {
      throw { status: 401, message: "Invalid credentials" };
    }

    const match = await bcrypt.compare(password, akun.password_hash);
    if (!match) {
      throw { status: 401, message: "Invalid credentials" };
    }

    const token = jwt.sign(
      { akun_id: akun.id, role: akun.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { token, role: akun.role };
  },

  async getMe(akunId, role) {
    const conn = await db.getConnection();
    const akun = await AuthRepository.findAkunById(conn, akunId);
    const profil = await AuthRepository.findProfileByRole(conn, akunId, role);

    return { akun, profil };
  },
};
