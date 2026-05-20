import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
      validate: {
        validator(this: { receiver: any }, v: any) {
          if (!this.receiver || !v) return true;
          return v.toString() !== this.receiver.toString();
        },
        message: "Cannot send request to yourself",
      },
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected"],
        message: "Status must be pending, accepted, or rejected",
      },
      default: "pending",
    },
  },
  { timestamps: true },
);

friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ sender: 1, status: 1 });

const FriendRequest =
  mongoose.models.FriendRequest || mongoose.model("FriendRequest", friendRequestSchema);

export default FriendRequest;
