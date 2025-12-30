import Joi from "joi";

export const registerPasienSchema = Joi.object({
  username: Joi.string().max(50).required(),
  email: Joi.string().email().max(120).required(),
  password: Joi.string().min(6).required(),

  nik: Joi.string().length(16).required(),
  nama: Joi.string().max(100).required(),
  jenis_kelamin: Joi.string().valid("L", "P").required(),
  tgl_lahir: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ""),
  alamat: Joi.string().max(255).allow(null, ""),
  no_telepon: Joi.string().max(20).allow(null, "")
});

export const loginSchema = Joi.object({
  username: Joi.string().max(50).required(),
  password: Joi.string().min(6).required()
});
