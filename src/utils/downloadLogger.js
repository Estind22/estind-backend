import DownloadLog from "../models/downloadLog.model.js";

export const createDownloadLog = async ({ req, module, format, filters = {}, meta = {} }) => {
  const requester = req.user;

  const log = await DownloadLog.create({
    company: requester?.company || null,
    user: requester?._id,
    module,
    format,
    filters,
    meta,
    status: "started",
    startedAt: new Date(),
  });

  return log;
};

export const markDownloadSuccess = async (logId, meta = {}) => {
  if (!logId) return;

  await DownloadLog.findByIdAndUpdate(logId, {
    status: "success",
    finishedAt: new Date(),
    $set: { meta: meta },
  });
};

export const markDownloadFailed = async (logId, err) => {
  if (!logId) return;

  await DownloadLog.findByIdAndUpdate(logId, {
    status: "failed",
    finishedAt: new Date(),
    errorMessage: err?.message || "Export failed",
  });
};
