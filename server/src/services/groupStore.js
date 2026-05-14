import Group from "../models/Group.js";

const hasMongoConfigured = Boolean(process.env.MONGODB_URI);
const memoryGroups = new Map(); // groupId -> group
let nextGroupId = 1;

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function toPublic(g) {
  return {
    id: String(g._id || g.id),
    name: g.name,
    description: g.description || "",
    ownerId: g.ownerId,
    members: g.members || [],
    visibility: g.visibility,
    inviteCode: g.inviteCode,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function createGroup({ name, description = "", ownerId, visibility = "private" }) {
  const inviteCode = makeInviteCode();
  const member = { userId: ownerId, role: "owner", joinedAt: new Date() };

  if (hasMongoConfigured) {
    const doc = await Group.create({
      name,
      description,
      ownerId,
      visibility,
      inviteCode,
      members: [member],
    });
    return toPublic(doc.toObject());
  }

  const id = `mem_g_${nextGroupId++}`;
  const g = {
    _id: id,
    name,
    description,
    ownerId,
    visibility,
    inviteCode,
    members: [member],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryGroups.set(id, g);
  return toPublic(g);
}

export async function getGroupById(groupId) {
  if (hasMongoConfigured) {
    const doc = await Group.findById(groupId).lean();
    return doc ? toPublic(doc) : null;
  }
  const g = memoryGroups.get(groupId);
  return g ? toPublic(g) : null;
}

export async function listGroupsForUser(userId) {
  if (hasMongoConfigured) {
    const docs = await Group.find({ "members.userId": userId }).lean();
    return docs.map(toPublic);
  }
  return [...memoryGroups.values()]
    .filter((g) => g.members.some((m) => m.userId === userId))
    .map(toPublic);
}

export async function joinGroupByInviteCode(inviteCode, userId) {
  if (hasMongoConfigured) {
    const doc = await Group.findOne({ inviteCode });
    if (!doc) return null;
    if (doc.members.some((m) => m.userId === userId)) return toPublic(doc.toObject());
    doc.members.push({ userId, role: "member", joinedAt: new Date() });
    await doc.save();
    return toPublic(doc.toObject());
  }
  const g = [...memoryGroups.values()].find((x) => x.inviteCode === inviteCode);
  if (!g) return null;
  if (!g.members.some((m) => m.userId === userId)) {
    g.members.push({ userId, role: "member", joinedAt: new Date() });
  }
  return toPublic(g);
}

export async function leaveGroup(groupId, userId) {
  if (hasMongoConfigured) {
    const doc = await Group.findById(groupId);
    if (!doc) return null;
    if (doc.ownerId === userId) {
      const err = new Error("Owner cannot leave group; delete it instead");
      err.code = "OWNER_LEAVE";
      throw err;
    }
    doc.members = doc.members.filter((m) => m.userId !== userId);
    await doc.save();
    return toPublic(doc.toObject());
  }
  const g = memoryGroups.get(groupId);
  if (!g) return null;
  if (g.ownerId === userId) {
    const err = new Error("Owner cannot leave group; delete it instead");
    err.code = "OWNER_LEAVE";
    throw err;
  }
  g.members = g.members.filter((m) => m.userId !== userId);
  return toPublic(g);
}

export function userIsMember(group, userId) {
  return !!group?.members?.some((m) => m.userId === userId);
}
