import { ExamsService } from "./exams.service.js";

export async function listByPatient(req, res, next) {
  try {
    const pasienId = Number(req.params.pasienId);
    const rows = await ExamsService.listByPatient(pasienId);
    return res.json({ data: rows });
  } catch (e) {
    next(e);
  }
}

export async function getDetail(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = await ExamsService.detail(id);
    return res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function createExam(req, res, next) {
  try {

    const akunId = req.user.akun_id;
    const payload = req.body || {};
    const created = await ExamsService.create({ payload, akunId: akunId });
    return res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

export async function patchExam(req, res, next) {
  try {
    const id = Number(req.params.id);
    const patch = req.body || {};

    // whitelist fields
    const allowed = ["dokter_id", "status_validasi", "status_hasil", "catatan", "tgl_pemeriksaan"];
    const clean = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) clean[k] = patch[k];
    }

    const updated = await ExamsService.update(id, clean, req.user.akun_id);
    return res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function uploadExamFile(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!req.file) return res.status(422).json({ message: "File required" });
    const files = await ExamsService.attachFile({ pemeriksaanId: id, file: req.file, akunId: req.user.akun_id });
    return res.json({ files });
  } catch (e) {
    next(e);
  }
}

export async function replaceExamFile(req, res, next) {
  try {
    const examId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    if (!req.file) return res.status(422).json({ message: "File required" });
    const updated = await ExamsService.replaceFile(examId, fileId, req.file, req.user);
    return res.status(200).json({ file: updated });
  } catch (e) {
    if (e.statusCode === 404) return res.status(404).json({ message: e.message });
    if (e.statusCode === 422) return res.status(422).json({ message: e.message });
    if (e.statusCode === 502) return res.status(502).json({ message: e.message });
    next(e);
  }
}

export async function deleteExam(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await ExamsService.deleteExam({ pemeriksaanId: id, akunId: req.user.akun_id });
    return res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}


export async function  listAll(req, res, next) {
  try {
    const { q, status_hasil, page, limit } = req.query;

    const result = await ExamsService.listAll({
      q,
      status_hasil,
      page,
      limit,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function downloadFile(req, res, next) {
  try {
    const examId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    const result = await ExamsService.downloadFile({
      pemeriksaanId: examId,
      fileId,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (e) {
    if (e.statusCode === 404) return res.status(404).json({ message: e.message });
    if (e.statusCode === 403) return res.status(403).json({ message: e.message });
    if (e.statusCode === 502) return res.status(502).json({ message: e.message });
    next(e);
  }
}
