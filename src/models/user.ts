import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [1, "Name cannot be empty"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    image: {
      type: String,
      default: "",
    },
    username: {
      type: String,
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },
    provider: {
      type: String,
      required: true,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    keys: {
      type: [
        {
          publicKey: { type: String, required: true },
          keyVersion: { type: Number, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ lastActiveAt: -1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
