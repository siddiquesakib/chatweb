import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      required: true,
      validate: [
        (arr: unknown[]) => arr.length >= 2,
        "Conversation must have at least 2 participants",
      ],
    },
    lastMessage: {
      text: { type: String, default: null },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      senderName: { type: String, default: null },
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    keyBundles: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          encryptedKey: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

conversationSchema.pre("save" as never, async function () {
  const doc = this as unknown as { participants: (string | object)[] };
  if (doc.participants.length >= 2) {
    doc.participants.sort((a, b) => String(a).localeCompare(String(b)));
  }
});

conversationSchema.index({ "participants.0": 1, "participants.1": 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

export default Conversation;
