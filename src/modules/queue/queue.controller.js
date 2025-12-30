import { QueueService } from "./queue.service.js";

export async function listToday(req, res, next) {
  try {
    const { date } = req.query; // YYYY-MM-DD optional
    const result = await QueueService.listToday(date);
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function callQueue(req, res, next) {
  try {
    const pendaftaranId = Number(req.params.id);
    const result = await QueueService.call({ pendaftaranId, actorAkunId: req.user.akun_id });
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function nextQueue(req, res, next) {
  try {
    const currentId = Number(req.params.id);
    const result = await QueueService.next({ currentId, actorAkunId: req.user.akun_id });
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function cancelQueue(req, res, next) {
  try {
    const pendaftaranId = Number(req.params.id);
    const { reason } = req.body || {};
    const result = await QueueService.cancel({ pendaftaranId, actorAkunId: req.user.akun_id, reason });
    return res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function queueStats(req, res, next) {
  try {
    const result = await QueueService.queueStats();
    return res.json(result);
  } catch (e) {
    next(e);
  }
}
