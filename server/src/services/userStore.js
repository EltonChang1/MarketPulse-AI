import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const hasMongoConfigured = Boolean(process.env.MONGODB_URI);

const memoryUsersById = new Map();
const memoryEmailToId = new Map();
let nextUserId = 1;

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    watchlist: Array.isArray(user.watchlist) ? user.watchlist : [],
  };
}

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function memoryCreateUser({ email, password, firstName = "", lastName = "" }) {
  const normalizedEmail = email.toLowerCase();
  if (memoryEmailToId.has(normalizedEmail)) {
    const error = new Error("Email already in use");
    error.code = "DUPLICATE_EMAIL";
    throw error;
  }

  const id = `mem_${nextUserId++}`;
  const passwordHash = await bcryptjs.hash(password, 10);
  const user = {
    id,
    email: normalizedEmail,
    passwordHash,
    firstName,
    lastName,
    watchlist: [],
  };

  memoryUsersById.set(id, user);
  memoryEmailToId.set(normalizedEmail, id);

  return user;
}

async function memoryFindByEmail(email) {
  const normalizedEmail = email.toLowerCase();
  const id = memoryEmailToId.get(normalizedEmail);
  if (!id) return null;
  return memoryUsersById.get(id) || null;
}

async function memoryFindById(id) {
  return memoryUsersById.get(String(id)) || null;
}

export async function createUser({ email, password, firstName = "", lastName = "" }) {
  if (hasMongoConfigured) {
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      watchlist: [],
    });
    await user.save();
    return {
      user: {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        watchlist: user.watchlist,
      },
      token: user.getToken(),
    };
  }

  const memUser = await memoryCreateUser({ email, password, firstName, lastName });
  const publicUser = toPublicUser(memUser);
  return { user: publicUser, token: signToken(publicUser) };
}

export async function signInUser({ email, password }) {
  if (hasMongoConfigured) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return null;
    const valid = await user.comparePassword(password);
    if (!valid) return null;

    return {
      user: {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        watchlist: user.watchlist,
      },
      token: user.getToken(),
    };
  }

  const memUser = await memoryFindByEmail(email);
  if (!memUser) return null;

  const valid = await bcryptjs.compare(password, memUser.passwordHash);
  if (!valid) return null;

  const publicUser = toPublicUser(memUser);
  return { user: publicUser, token: signToken(publicUser) };
}

export async function getUserById(userId) {
  if (hasMongoConfigured) {
    const user = await User.findById(userId).select("-password");
    if (!user) return null;
    return {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      watchlist: user.watchlist,
    };
  }

  const memUser = await memoryFindById(userId);
  return memUser ? toPublicUser(memUser) : null;
}

export async function updateUserProfile(userId, { firstName = "", lastName = "" }) {
  if (hasMongoConfigured) {
    const user = await User.findByIdAndUpdate(userId, { firstName, lastName }, { new: true }).select("-password");
    if (!user) return null;
    return {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      watchlist: user.watchlist,
    };
  }

  const memUser = await memoryFindById(userId);
  if (!memUser) return null;
  memUser.firstName = firstName;
  memUser.lastName = lastName;
  return toPublicUser(memUser);
}

export async function addUserWatchlistSymbol(userId, symbol) {
  const upper = String(symbol || "").toUpperCase();
  if (hasMongoConfigured) {
    const user = await User.findById(userId);
    if (!user) return null;
    if (!user.watchlist.includes(upper)) {
      user.watchlist.push(upper);
      await user.save();
    }
    return user.watchlist;
  }

  const memUser = await memoryFindById(userId);
  if (!memUser) return null;
  if (!memUser.watchlist.includes(upper)) memUser.watchlist.push(upper);
  return memUser.watchlist;
}

export async function removeUserWatchlistSymbol(userId, symbol) {
  const upper = String(symbol || "").toUpperCase();
  if (hasMongoConfigured) {
    const user = await User.findById(userId);
    if (!user) return null;
    user.watchlist = user.watchlist.filter((s) => s !== upper);
    await user.save();
    return user.watchlist;
  }

  const memUser = await memoryFindById(userId);
  if (!memUser) return null;
  memUser.watchlist = memUser.watchlist.filter((s) => s !== upper);
  return memUser.watchlist;
}
