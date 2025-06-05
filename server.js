const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const User = require("./models/User");
require("dotenv").config();

const app = express();

// Connexion MongoDB classique
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://rudolphenavarrault:rJvENWPjE4fSPhJi@cluster0.vnw8k31.mongodb.net/idle_clicker?retryWrites=true&w=majority&appName=Cluster0";

mongoose.set("strictQuery", false);

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 60000,
    connectTimeoutMS: 10000,
  })
  .then(() => console.log("Connexion MongoDB établie"))
  .catch((err) => console.error("Erreur de connexion MongoDB:", err));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions avec MongoDB
const sessionStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  ttl: 24 * 60 * 60, // 1 jour
  touchAfter: 24 * 3600,
  autoRemove: "native",
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "votre_secret_tres_securise",
    resave: true,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 heures
      secure: process.env.NODE_ENV === "production", // true en production
      sameSite: "lax",
      httpOnly: true,
    },
    proxy: true,
  })
);

// Ajouter un middleware pour gérer le proxy
app.set("trust proxy", 1);

// Moteur de template
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// Fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Gestion des erreurs JSON
app.use((err, req, res, next) => {
  console.error("Erreur JSON:", err);
  if (req.path.startsWith("/api/")) {
    res.status(500).json({ error: err.message });
  } else {
    next(err);
  }
});

// Middleware pour passer les variables globales aux vues
app.use((req, res, next) => {
  // Définir les pages qui ne doivent pas charger main.js
  const pagesWithoutMainJs = ["/login", "/register"];
  res.locals.skipMainJs = pagesWithoutMainJs.includes(req.path);
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

// Middleware pour vérifier si l'utilisateur est déjà connecté
const isAlreadyAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

// Middleware pour protéger les routes qui nécessitent une authentification
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
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

// Routes publiques avec redirection si déjà connecté
app.get("/", isAlreadyAuthenticated, (req, res) => {
  res.render("index");
});

app.get("/login", isAlreadyAuthenticated, (req, res) => {
  res.render("login");
});

app.get("/register", isAlreadyAuthenticated, (req, res) => {
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

// Routes protégées
app.get("/dashboard", requireAuth, async (req, res) => {
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

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Tentative de connexion pour:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("Utilisateur non trouvé");
      return res.status(400).json({ error: "Email ou mot de passe incorrect" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Mot de passe incorrect");
      return res.status(400).json({ error: "Email ou mot de passe incorrect" });
    }

    // Stocker l'ID de l'utilisateur dans la session
    req.session.userId = user._id;
    console.log("Session créée avec l'ID:", user._id);

    // Sauvegarder la session
    req.session.save((err) => {
      if (err) {
        console.error("Erreur lors de la sauvegarde de la session:", err);
        return res.status(500).json({ error: "Erreur lors de la connexion" });
      }

      console.log("Session sauvegardée avec succès");
      // Renvoyer une réponse JSON avec l'URL de redirection
      res.json({
        success: true,
        redirectUrl: "/dashboard",
      });
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res
      .status(500)
      .json({ error: "Une erreur est survenue lors de la connexion" });
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

// Route pour la page des paramètres
app.get("/settings", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }
    res.render("settings", { user });
  } catch (error) {
    console.error("Erreur lors du chargement des paramètres:", error);
    res.redirect("/dashboard");
  }
});

// Route pour récupérer les paramètres
app.get("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    res.json(
      user.settings || {
        language: "fr",
        theme: "light",
        notifications: true,
        autoSave: "0",
      }
    );
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des paramètres" });
  }
});

// Route pour récupérer la liste des utilisateurs
app.get("/api/users", isAuthenticated, async (req, res) => {
  try {
    const users = await User.find(
      {},
      {
        username: 1,
        gameData: 1,
        _id: 1,
      }
    ).sort({ "gameData.coins": -1 });
    res.json(users);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

// Route pour sauvegarder les paramètres
app.post("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const { language, theme, notifications, autoSave } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    user.settings = {
      language: language || "fr",
      theme: theme || "light",
      notifications: notifications !== undefined ? notifications : true,
      autoSave: autoSave || "0",
    };

    await user.save();
    console.log("Paramètres sauvegardés:", user.settings);
    res.json(user.settings);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des paramètres:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour des paramètres" });
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
      success: true,
      data: {
        coins: user.gameData.coins,
        coinsPerClick: user.gameData.upgrades.clickPower.level,
        coinsPerSecond: user.gameData.upgrades.autoClicker.level,
        upgrades: user.gameData.upgrades,
        lastSaveTime: user.gameData.lastSaveTime,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    res.status(500).json({
      error: "Erreur lors de la sauvegarde",
      message: error.message,
    });
  }
});

// Page 404
app.use((req, res) => {
  res.status(404).render("error", {
    message: "Page non trouvée",
  });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur globale:", err);
  if (req.path.startsWith("/api/")) {
    res.status(500).json({
      error: "Erreur interne du serveur",
      message: err.message,
    });
  } else {
    res.status(500).render("error", {
      message: "Une erreur est survenue",
    });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
