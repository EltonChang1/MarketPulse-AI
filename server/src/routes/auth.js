import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { createUser, getUserById, signInUser, updateUserProfile } from "../services/userStore.js";

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{2,24}$/;

// Sign Up
router.post("/signup", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || username === undefined || username === null || String(username).trim() === "") {
      return res.status(400).json({ message: "Email, password, and username are required" });
    }

    const trimmedUser = String(username).trim();
    if (!USERNAME_RE.test(trimmedUser)) {
      return res.status(400).json({
        message: "Username must be 2–24 characters and use only letters, numbers, or underscore",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const { user, token } = await createUser({
      email,
      password,
      username: trimmedUser,
      firstName: "",
      lastName: "",
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user,
    });
  } catch (error) {
    if (error?.code === "DUPLICATE_EMAIL") {
      return res.status(400).json({ message: "Email already in use" });
    }
    if (error?.code === "DUPLICATE_USERNAME") {
      return res.status(400).json({ message: "Username already taken" });
    }
    if (error?.code === 11000 && error?.keyPattern) {
      if (error.keyPattern.email) {
        return res.status(400).json({ message: "Email already in use" });
      }
      if (error.keyPattern.usernameLower) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

// Sign In
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const auth = await signInUser({ email, password });
    if (!auth) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      success: true,
      message: "Signed in successfully",
      token: auth.token,
      user: auth.user,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Signin failed", error: error.message });
  }
});

// Get Current User
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
});

// Update User Profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const user = await updateUserProfile(req.userId, { firstName, lastName });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

export default router;
