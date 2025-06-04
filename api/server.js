const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const User = require("../models/User");
require("dotenv").config();

const app = express();

// Configuration de la base de données.
mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://rudolphenavarrault:rJvENWPjE4fSPhJi@cluster0.vnw8k31.mongodb.net/idle_clicker?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Configuration des middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Configuration des sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "votre_secret_tres_securise",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI ||
        "mongodb+srv://rudolphenavarrault:rJvENWPjE4fSPhJi@cluster0.vnw8k31.mongodb.net/idle_clicker?retryWrites=true&w=majority&appName=Cluster0",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 heures
    },
  })
);

// Middleware pour gérer les erreurs JSON
app.use((err, req, res, next) => {
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

// Routes API
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

    // Ajouter des données de test
    user.gameData.coins = 1000;
    user.gameData.upgrades = {
      clickPower: {
        level: 5,
        cost: 100,
      },
      autoClicker: {
        level: 3,
        cost: 200,
      },
    };
    user.gameData.lastSaveTime = new Date();

    // Sauvegarder les changements
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

// Configuration du moteur de template
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// Routes de vues
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

// Route d'inscription
app.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).render("register", {
        error: "Cet email ou nom d'utilisateur est déjà utilisé",
      });
    }

    // Créer un nouvel utilisateur
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Créer la session
    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).render("register", {
      error: "Une erreur est survenue lors de l'inscription",
    });
  }
});

// Route de connexion
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("login", {
        error: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).render("login", {
        error: "Email ou mot de passe incorrect",
      });
    }

    // Créer la session
    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).render("login", {
      error: "Une erreur est survenue lors de la connexion",
    });
  }
});

// Route de déconnexion
app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion:", err);
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
    res.redirect("/");
  });
});

// Route du dashboard
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

// Route pour le clic
app.post("/api/click", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Renvoyer uniquement les données nécessaires pour le calcul côté client
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

// Route pour les améliorations
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

    // Renvoyer uniquement les données nécessaires pour le calcul côté client
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

// Route pour récupérer l'état du jeu
app.get("/api/save", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Renvoyer toutes les données du jeu
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

// Route pour récupérer les paramètres
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

// Route pour mettre à jour les paramètres
app.post("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const { language, theme, notifications, autoSave } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Mettre à jour les paramètres
    user.settings = {
      language: language || "fr",
      theme: theme || "light",
      notifications: notifications !== undefined ? notifications : true,
      autoSave: autoSave || "0",
    };

    await user.save();
    console.log("Paramètres sauvegardés:", user.settings); // Pour le débogage
    res.json(user.settings);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des paramètres:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Route pour la page des paramètres
app.get("/settings", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }
    res.render("settings", { user });
  } catch (error) {
    console.error("Erreur lors de l'accès aux paramètres:", error);
    res.status(500).render("error", {
      message: "Une erreur est survenue lors de l'accès aux paramètres",
    });
  }
});

// Route pour sauvegarder l'état du jeu
app.post("/api/save", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const { coins, upgrades, lastSaveTime } = req.body;

    // Vérifier que les données sont valides
    if (typeof coins !== "number" || !upgrades) {
      return res.status(400).json({ error: "Données invalides" });
    }

    // Mettre à jour les données du jeu
    user.gameData.coins = coins;
    user.gameData.upgrades = upgrades;
    if (lastSaveTime) {
      user.gameData.lastSaveTime = new Date(lastSaveTime);
    }

    // Sauvegarder les changements
    await user.save();

    res.json({
      coins: user.gameData.coins,
      coinsPerClick: user.gameData.upgrades.clickPower.level,
      coinsPerSecond: user.gameData.upgrades.autoClicker.level,
      upgrades: user.gameData.upgrades,
      lastSaveTime: user.gameData.lastSaveTime,
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    res.status(500).json({ error: "Erreur lors de la sauvegarde" });
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports.handler = serverless(app);
