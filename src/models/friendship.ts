import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user1 is required"],
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user2 is required"],
    },
  },
  { timestamps: true },
);

friendshipSchema.pre("save" as never, async function () {
  const doc = this as unknown as { user1: string; user2: string };
  if (doc.user1.toString() === doc.user2.toString()) {
    throw new Error("Cannot be friends with yourself");
  }
  if (doc.user1.toString() > doc.user2.toString()) {
    [doc.user1, doc.user2] = [doc.user2, doc.user1];
  }
});

friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });
friendshipSchema.index({ user1: 1 });
friendshipSchema.index({ user2: 1 });

const Friendship =
  mongoose.models.Friendship || mongoose.model("Friendship", friendshipSchema);

export default Friendship;
