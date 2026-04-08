import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    username: {
      type: String,
      trim: true,
      default: "",
    },
    usernameLower: {
      type: String,
      trim: true,
      default: "",
    },
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
      type: String,
      default: "",
    },
    watchlist: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function setUsernameLower(next) {
  if (this.isModified("username")) {
    const u = String(this.username || "").trim();
    this.usernameLower = u ? u.toLowerCase() : "";
  }
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.getToken = function () {
  const jwtSecret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  return jwt.sign({ userId: this._id, email: this.email }, jwtSecret, {
    expiresIn: "7d",
  });
};

userSchema.index(
  { usernameLower: 1 },
  {
    unique: true,
    partialFilterExpression: { usernameLower: { $type: "string", $gt: "" } },
  }
);

export default mongoose.model("User", userSchema);
