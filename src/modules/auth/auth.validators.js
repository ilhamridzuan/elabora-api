import Joi from "joi";

// Password pattern: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export const registerPasienSchema = Joi.object({
  username: Joi.string().max(50).required(),
  email: Joi.string().email().max(120).required(),
  password: Joi.string()
    .min(8)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan karakter khusus (@$!%*?&#)',
      'string.min': 'Password harus minimal 8 karakter'
    }),

  nik: Joi.string().length(16).required(),
  nama: Joi.string().max(100).required(),
  jenis_kelamin: Joi.string().valid("L", "P").required(),
  tgl_lahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ""),
  alamat: Joi.string().max(255).allow(null, ""),
  no_telepon: Joi.string().max(20).allow(null, "")
});

export const registerDokterSchema = Joi.object({
  username: Joi.string().max(50).required(),
  email: Joi.string().email().max(120).required(),
  password: Joi.string()
    .min(8)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan karakter khusus (@$!%*?&#)',
      'string.min': 'Password harus minimal 8 karakter'
    }),

  nip: Joi.string().max(50).required(),
  nama: Joi.string().max(100).required()
});

export const registerPetugasSchema = Joi.object({
  username: Joi.string().max(50).required(),
  email: Joi.string().email().max(120).required(),
  password: Joi.string()
    .min(8)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password harus minimal 8 karakter dan mengandung huruf besar, huruf kecil, angka, dan karakter khusus (@$!%*?&#)',
      'string.min': 'Password harus minimal 8 karakter'
    }),

  nip: Joi.string().max(50).required(),
  nama: Joi.string().max(100).required()
});

export const loginSchema = Joi.object({
  username: Joi.string().max(50).required(),
  password: Joi.string().min(6).required()
});
