import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    date: { type: String, required: true }, // YYYY-MM-DD (matches frontend)
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    transactions: { type: [transactionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Portfolio ?? mongoose.model("Portfolio", portfolioSchema);
