const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const User = require("./models/User");
require("dotenv").config();

const app = express();

// Configuration de la connexion MongoDB avec cache global
mongoose.set("strictQuery", false);
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://rudolphenavarrault:rJvENWPjE4fSPhJi@cluster0.vnw8k31.mongodb.net/idle_clicker?retryWrites=true&w=majority&appName=Cluster0";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    console.log("Réutilisation connexion MongoDB existante");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Création nouvelle connexion MongoDB...");
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      .then((mongoose) => {
        console.log("Connexion MongoDB établie");
        return mongoose;
      })
      .catch((err) => {
        console.error("Erreur connexion MongoDB:", err);
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Connexion MongoDB au démarrage (cold start)
connectToDatabase().catch((err) => {
  console.error("Erreur connexion initiale MongoDB:", err);
});

// Configuration des middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques en priorité
app.use(express.static(path.join(__dirname, "public")));

const sessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  ttl: 24 * 60 * 60, // 1 jour
  crypto: {
    secret: process.env.SESSION_SECRET || "votre_secret_tres_securise",
  },
});

sessionStore.on("error", (error) => {
  console.error("Erreur session store:", error);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "votre_secret_tres_securise",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 heures
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// Configuration du moteur de template
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// Middleware pour gérer les erreurs JSON
app.use((err, req, res, next) => {
  console.error("Erreur JSON:", err);
  if (req.path.startsWith("/api/")) {
    res.status(500).json({ error: err.message });
  } else {
    next(err);
  }
});

// Middleware pour passer userId à toutes les vues
app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  next();
});

// Middleware d'authentification
const isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non autorisé" });
  }
  next();
};

// --- Routes API et vues ---

app.get("/api/auth/check", (req, res) => {
  if (req.session.userId) {
    res.json({ userId: req.session.userId });
  } else {
    res.status(401).json({ message: "Non authentifié" });
  }
});

app.post("/api/test/add-data", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    user.gameData.coins = 1000;
    user.gameData.upgrades = {
      clickPower: { level: 5, cost: 100 },
      autoClicker: { level: 3, cost: 200 },
    };
    user.gameData.lastSaveTime = new Date();

    await user.save();

    res.json({
      message: "Données de test ajoutées avec succès",
      gameData: user.gameData,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout des données de test:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de l'ajout des données de test" });
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).render("register", {
        error: "Cet email ou nom d'utilisateur est déjà utilisé",
      });
    }

    const user = new User({ username, email, password });

    await user.save();

    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).render("register", {
      error: "Une erreur est survenue lors de l'inscription",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .render("login", { error: "Email ou mot de passe incorrect" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .render("login", { error: "Email ou mot de passe incorrect" });
    }

    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).render("login", {
      error: "Une erreur est survenue lors de la connexion",
    });
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion:", err);
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
    res.redirect("/");
  });
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }
    res.render("dashboard", { user });
  } catch (error) {
    console.error("Erreur lors de l'accès au dashboard:", error);
    res.status(500).render("error", {
      message: "Une erreur est survenue lors de l'accès au dashboard",
    });
  }
});

app.post("/api/click", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({
      coinsPerClick: user.gameData.upgrades.clickPower.level || 1,
      coinsPerSecond: user.gameData.upgrades.autoClicker.level || 0,
      upgrades: user.gameData.upgrades,
    });
  } catch (error) {
    console.error("Erreur lors du clic:", error);
    res.status(500).json({ message: "Erreur lors du clic" });
  }
});

app.post("/api/upgrade", isAuthenticated, async (req, res) => {
  try {
    const { upgradeType } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (!["clickPower", "autoClicker"].includes(upgradeType)) {
      return res.status(400).json({ message: "Type d'amélioration invalide" });
    }

    const upgrade = user.gameData.upgrades[upgradeType];
    const cost = upgrade.cost;

    if (user.gameData.coins < cost) {
      return res.status(400).json({ message: "Pas assez de pièces" });
    }

    res.json({
      cost: cost,
      currentLevel: upgrade.level,
      currentCoins: user.gameData.coins,
      upgrades: user.gameData.upgrades,
    });
  } catch (error) {
    console.error("Erreur lors de l'amélioration:", error);
    res.status(500).json({ message: "Erreur lors de l'achat" });
  }
});

app.get("/api/save", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json({
      coins: user.gameData.coins,
      coinsPerClick: user.gameData.upgrades.clickPower.level,
      coinsPerSecond: user.gameData.upgrades.autoClicker.level,
      upgrades: {
        clickPower: {
          level: user.gameData.upgrades.clickPower.level,
          cost: user.gameData.upgrades.clickPower.cost,
        },
        autoClicker: {
          level: user.gameData.upgrades.autoClicker.level,
          cost: user.gameData.upgrades.autoClicker.cost,
        },
      },
      lastSaveTime: user.gameData.lastSaveTime,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'état du jeu:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'état du jeu" });
  }
});

app.get("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json(user.settings);
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const { language, theme, notifications, autoSave } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    user.settings.language = language || user.settings.language;
    user.settings.theme = theme || user.settings.theme;
    user.settings.notifications = notifications ?? user.settings.notifications;
    user.settings.autoSave = autoSave ?? user.settings.autoSave;

    await user.save();

    res.json({ message: "Paramètres mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des paramètres:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

const handler = serverless(app);

module.exports = handler;
