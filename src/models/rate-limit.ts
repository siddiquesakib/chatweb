import mongoose from "mongoose";

const rateLimitSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

rateLimitSchema.index({ timestamp: 1 }, { expireAfterSeconds: 10 });

const RateLimit =
  mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema);

export default RateLimit;
