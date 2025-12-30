import { createRegistrationSchema } from "./registration.validators.js";
import { RegistrationService } from "./registration.service.js";

async function create(req, res, next) {
  try {
    const { error, value } = createRegistrationSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    if (!req.file) {
      return res.status(400).json({ message: "Surat rujukan wajib diupload" });
    }

    const result = await RegistrationService.create({
      akun_id: req.user.akun_id,
      jadwal_pemeriksaan_at: value.jadwal_pemeriksaan_at,
      tanggal_antrian: value.tanggal_antrian,
      surat_rujukan_path: `src/uploads/surat-rujukan/${req.file.filename}`,
    });

    if (result?.ok === false) {
      return res.status(result.status || 400).json({ message: result.message });
    }

    return res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function listMine(req, res, next) {
  try {
    const result = await RegistrationService.listMine({
      akun_id: req.user.akun_id,
      tanggal: req.query.tanggal || null,
    });
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

async function queueToday(req, res, next) {
  try {
    const result = await RegistrationService.queueToday({ akun_id: req.user.akun_id });
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

export const RegistrationController = {
  create,
  listMine,
  queueToday,
};
