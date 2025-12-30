import { PatientsService } from "./patients.service.js";

export async function listPatients(req, res, next) {
  try {
    const { search, page, pageSize } = req.query;
    const result = await PatientsService.list({ search, page, pageSize });
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getPatientDetail(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await PatientsService.detail(id);
    return res.json(result);
  } catch (e) {
    next(e);
  }
}
