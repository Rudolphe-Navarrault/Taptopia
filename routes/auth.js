const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Route d'inscription
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Cet email ou nom d'utilisateur est déjà utilisé" });
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
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
});

// Route de connexion
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // Créer la session
    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
});

// Route de déconnexion
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion" });
    }
    res.redirect("/");
  });
});

module.exports = router;
