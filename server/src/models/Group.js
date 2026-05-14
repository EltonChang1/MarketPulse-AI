import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ["owner", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 500 },
    ownerId: { type: String, required: true, index: true },
    members: { type: [memberSchema], default: [] },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

groupSchema.index({ "members.userId": 1 });

export default mongoose.models.Group ?? mongoose.model("Group", groupSchema);
