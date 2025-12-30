import Joi from "joi";

export const createRegistrationSchema = Joi.object({
  jadwal_pemeriksaan_at: Joi.string().required(),  // "2025-12-21 10:00:00" / ISO
  tanggal_antrian: Joi.string().required(),        // "YYYY-MM-DD"
});
