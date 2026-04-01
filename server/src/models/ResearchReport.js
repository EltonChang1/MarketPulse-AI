import mongoose from "mongoose";

const researchReportSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ["watchlist_weekly", "portfolio_snapshot"],
      required: true,
    },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "ready", "failed"],
      default: "pending",
    },
    errorMessage: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

researchReportSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.ResearchReport ?? mongoose.model("ResearchReport", researchReportSchema);
