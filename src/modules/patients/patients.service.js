import { db } from "../../config/db.js";
import { PatientsRepository } from "./patients.repository.js";

export const PatientsService = {
  async list({ search, page = 1, pageSize = 20 }) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (p - 1) * ps;

    const conn = await db.getConnection();
    try {
      const [items, total] = await Promise.all([
        PatientsRepository.list(conn, { search, limit: ps, offset }),
        PatientsRepository.count(conn, { search }),
      ]);
      return { items, page: p, pageSize: ps, total };
    } finally {
      conn.release();
    }
  },

  async detail(patientId) {
    const conn = await db.getConnection();
    try {
      const patient = await PatientsRepository.findById(conn, patientId);
      if (!patient) {
        const err = new Error("Patient not found");
        err.statusCode = 404;
        throw err;
      }
      return patient;
    } finally {
      conn.release();
    }
  },

  validateDateRanges(filters) {
    // Validate date of birth range
    if (filters.dobStart && filters.dobEnd) {
      if (new Date(filters.dobEnd) < new Date(filters.dobStart)) {
        const err = new Error('Date of birth end date must be after start date');
        err.statusCode = 400;
        throw err;
      }
    }

    // Validate registration date range
    if (filters.regStart && filters.regEnd) {
      if (new Date(filters.regEnd) < new Date(filters.regStart)) {
        const err = new Error('Registration end date must be after start date');
        err.statusCode = 400;
        throw err;
      }
    }
  },

  async advancedSearch(filters) {
    // Normalize page parameter (default: 1, min: 1)
    const page = Math.max(1, Number(filters.page) || 1);
    
    // Normalize pageSize parameter (default: 20, min: 1, max: 100)
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    
    // Calculate offset from page and pageSize
    const offset = (page - 1) * pageSize;
    
    // Validate and normalize sortBy (default: nama, allowed: nama, nik, tgl_lahir, created_at)
    const allowedSortBy = ['nama', 'nik', 'tgl_lahir', 'created_at'];
    const sortBy = allowedSortBy.includes(filters.sortBy) ? filters.sortBy : 'nama';
    
    // Validate and normalize sortOrder (default: ASC, allowed: ASC, DESC)
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    
    // Call validateDateRanges to check date range logic
    this.validateDateRanges(filters);
    
    // Get database connection from pool
    const conn = await db.getConnection();
    try {
      // Call PatientsRepository.advancedList and advancedCount in parallel
      const [items, total] = await Promise.all([
        PatientsRepository.advancedList(conn, { 
          ...filters, 
          limit: pageSize, 
          offset,
          sortBy,
          sortOrder
        }),
        PatientsRepository.advancedCount(conn, filters)
      ]);
      
      // Return object with items, page, pageSize, total
      return { items, page, pageSize, total };
    } finally {
      // Release database connection
      conn.release();
    }
  },
};
