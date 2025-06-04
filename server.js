require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Connexion à MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/idle-clicker",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("Connecté à MongoDB"))
  .catch((err) => console.error("Erreur de connexion à MongoDB:", err));

// Schéma pour les sauvegardes
const saveSchema = new mongoose.Schema({
  userId: String,
  coins: Number,
  coinsPerClick: Number,
  coinsPerSecond: Number,
  upgrades: {
    clickPower: { level: Number, cost: Number },
    autoClicker: { level: Number, cost: Number },
  },
  lastSaveTime: Date,
});

const Save = mongoose.model("Save", saveSchema);

// Routes API
app.get("/api/save", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    let save = await Save.findOne({ userId });

    if (!save) {
      save = new Save({
        userId,
        coins: 0,
        coinsPerClick: 1,
        coinsPerSecond: 0,
        upgrades: {
          clickPower: { level: 1, cost: 10 },
          autoClicker: { level: 0, cost: 50 },
        },
        lastSaveTime: new Date(),
      });
      await save.save();
    }

    res.json(save);
  } catch (error) {
    console.error("Erreur lors de la récupération de la sauvegarde:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/save", async (req, res) => {
  try {
    const userId = req.query.userId || "default";
    const saveData = req.body;

    let save = await Save.findOne({ userId });
    if (!save) {
      save = new Save({ userId });
    }

    Object.assign(save, saveData);
    save.lastSaveTime = new Date();
    await save.save();

    res.json(save);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour servir l'application
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
