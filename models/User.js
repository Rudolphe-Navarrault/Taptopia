const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  settings: {
    language: {
      type: String,
      enum: ["fr", "en"],
      default: "fr",
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    notifications: {
      type: Boolean,
      default: true,
    },
    autoSave: {
      type: String,
      enum: ["0", "5", "10", "15", "30", "60", "300", "900", "1800", "3600"],
      default: "0",
    },
  },
  gameData: {
    coins: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    lastSaveTime: {
      type: Date,
      default: Date.now,
    },
    upgrades: {
      clickPower: {
        level: { type: Number, default: 0 },
        cost: { type: Number, default: 10 },
      },
      autoClicker: {
        level: { type: Number, default: 0 },
        cost: { type: Number, default: 50 },
      },
    },
  },
});

// Hash du mot de passe avant la sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
