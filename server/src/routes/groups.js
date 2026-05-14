import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createGroup,
  getGroupById,
  listGroupsForUser,
  joinGroupByInviteCode,
  leaveGroup,
  userIsMember,
} from "../services/groupStore.js";
import { computeGroupLeaderboard } from "../services/leaderboardService.js";

const router = express.Router();

// List my groups
router.get("/", authenticateToken, async (req, res) => {
  try {
    const groups = await listGroupsForUser(req.userId);
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch groups", error: error.message });
  }
});

// Create a group (creator becomes owner)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, description, visibility } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }
    const group = await createGroup({
      name: String(name).trim(),
      description: String(description || "").trim(),
      ownerId: req.userId,
      visibility: visibility === "public" ? "public" : "private",
    });
    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ message: "Failed to create group", error: error.message });
  }
});

// Get one group's details (members only for private groups)
router.get("/:groupId", authenticateToken, async (req, res) => {
  try {
    const group = await getGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.visibility !== "public" && !userIsMember(group, req.userId)) {
      return res.status(403).json({ message: "Not a member of this group" });
    }
    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch group", error: error.message });
  }
});

// Join via invite code
router.post("/join", authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: "inviteCode required" });
    const group = await joinGroupByInviteCode(String(inviteCode).toUpperCase(), req.userId);
    if (!group) return res.status(404).json({ message: "Invalid invite code" });
    res.json({ group });
  } catch (error) {
    res.status(500).json({ message: "Failed to join group", error: error.message });
  }
});

// Leave a group
router.post("/:groupId/leave", authenticateToken, async (req, res) => {
  try {
    const group = await leaveGroup(req.params.groupId, req.userId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json({ group });
  } catch (error) {
    if (error.code === "OWNER_LEAVE") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to leave group", error: error.message });
  }
});

// Compute leaderboard for a group
router.get("/:groupId/leaderboard", authenticateToken, async (req, res) => {
  try {
    const group = await getGroupById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.visibility !== "public" && !userIsMember(group, req.userId)) {
      return res.status(403).json({ message: "Not a member of this group" });
    }
    const result = await computeGroupLeaderboard(group);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to compute leaderboard", error: error.message });
  }
});

export default router;
