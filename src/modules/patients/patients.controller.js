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

export async function advancedSearch(req, res, next) {
  try {
    // Extract all filter parameters from req.body
    const filters = {
      name: req.body.name,
      nik: req.body.nik,
      phone: req.body.phone,
      dobStart: req.body.dobStart,
      dobEnd: req.body.dobEnd,
      regStart: req.body.regStart,
      regEnd: req.body.regEnd,
      page: req.body.page,
      pageSize: req.body.pageSize,
      sortBy: req.body.sortBy,
      sortOrder: req.body.sortOrder
    };
    
    // Call PatientsService.advancedSearch with filters
    const result = await PatientsService.advancedSearch(filters);
    
    // Return JSON response with search results
    return res.json(result);
  } catch (e) {
    // Pass errors to next() for error middleware handling
    next(e);
  }
}
