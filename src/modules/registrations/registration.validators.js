import Joi from "joi";
import moment from "moment-timezone";

// Custom validator for date string in Asia/Jakarta timezone
const customDateParser = (value, helpers) => {
  // Parse using moment.tz supporting standard ISO-8601 or YYYY-MM-DD HH:mm:ss format
  // strict = true for matching formats strictly
  const parsed = moment.tz(value, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss"], true, "Asia/Jakarta");
  if (!parsed.isValid()) {
    return helpers.error("any.invalid");
  }
  return parsed.format("YYYY-MM-DD HH:mm:ss");
};

export const createRegistrationSchema = Joi.object({
  jadwal_pemeriksaan_at: Joi.string()
    .custom(customDateParser, "Custom Date Parser")
    .required()
    .messages({
      "any.invalid": '"jadwal_pemeriksaan_at" harus berupa format tanggal yang valid (ISO-8601 atau YYYY-MM-DD HH:mm:ss)',
    }),
  tanggal_antrian: Joi.string().required(),        // "YYYY-MM-DD"
});
