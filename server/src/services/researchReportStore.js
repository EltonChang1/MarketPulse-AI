import { randomUUID } from "crypto";
import mongoose from "mongoose";
import ResearchReport from "../models/ResearchReport.js";

const memory = [];

function dbReady() {
  return mongoose.connection.readyState === 1;
}

export async function createResearchReport(doc) {
  if (dbReady()) {
    const row = await ResearchReport.create(doc);
    return row.toObject();
  }
  const r = {
    _id: randomUUID(),
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memory.unshift(r);
  return r;
}

export async function updateResearchReport(userId, id, patch) {
  if (dbReady()) {
    const row = await ResearchReport.findOneAndUpdate(
      { _id: id, userId },
      { $set: patch },
      { new: true }
    ).lean();
    return row;
  }
  const idx = memory.findIndex((x) => String(x._id) === String(id) && x.userId === userId);
  if (idx === -1) return null;
  memory[idx] = { ...memory[idx], ...patch, updatedAt: new Date() };
  return memory[idx];
}

export async function listResearchReports(userId, { limit = 30, summaryOnly = false } = {}) {
  if (dbReady()) {
    const q = ResearchReport.find({ userId }).sort({ createdAt: -1 }).limit(limit);
    if (summaryOnly) q.select("-body");
    return q.lean();
  }
  const rows = memory.filter((x) => x.userId === userId).slice(0, limit);
  if (!summaryOnly) return rows;
  return rows.map(({ body: _b, ...rest }) => rest);
}

export async function getResearchReport(userId, id) {
  if (dbReady()) {
    return ResearchReport.findOne({ _id: id, userId }).lean();
  }
  return memory.find((x) => String(x._id) === String(id) && x.userId === userId) || null;
}
