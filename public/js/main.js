// Vérifier si le script est déjà chargé
if (window.gameScriptLoaded) {
  console.log("Le script est déjà chargé");
} else {
  window.gameScriptLoaded = true;

  // Système de traduction
  const translations = {
    fr: {
      welcome: "Bienvenue",
      coins: "Pièces",
      level: "Niveau",
      cost: "Coût",
      buy: "Acheter",
      settings: "Paramètres",
      language: "Langue",
      theme: "Thème",
      notifications: "Notifications",
      save: "Enregistrer",
      clickPower: "Puissance de clic",
      autoClicker: "Auto-cliqueur",
      coinsPerClick: "Pièces par clic",
      coinsPerSecond: "Pièces par seconde",
      success: "Succès",
      settingsSaved: "Paramètres sauvegardés",
      error: "Erreur",
      settingsError: "Erreur lors de la sauvegarde des paramètres",
      saveGame: "Sauvegarder",
      lastSave: "Dernière sauvegarde: ",
      saveSuccess: "Partie sauvegardée",
      saveError: "Erreur lors de la sauvegarde",
      never: "Jamais",
      justNow: "À l'instant",
      minuteAgo: "minute",
      minutesAgo: "minutes",
      hourAgo: "heure",
      hoursAgo: "heures",
      dayAgo: "jour",
      daysAgo: "jours",
      notEnoughCoins: "Pas assez de pièces pour acheter cette amélioration",
      autoSave: "Sauvegarde automatique",
      autoSaveDisabled: "Désactivée",
      autoSave5Sec: "Toutes les 5 secondes",
      autoSave10Sec: "Toutes les 10 secondes",
      autoSave15Sec: "Toutes les 15 secondes",
      autoSave30Sec: "Toutes les 30 secondes",
      autoSave1Min: "Toutes les minutes",
      autoSave5Min: "Toutes les 5 minutes",
      autoSave15Min: "Toutes les 15 minutes",
      autoSave30Min: "Toutes les 30 minutes",
      autoSave1Hour: "Toutes les heures",
    },
    en: {
      welcome: "Welcome",
      coins: "Coins",
      level: "Level",
      cost: "Cost",
      buy: "Buy",
      settings: "Settings",
      language: "Language",
      theme: "Theme",
      notifications: "Notifications",
      save: "Save",
      clickPower: "Click Power",
      autoClicker: "Auto Clicker",
      coinsPerClick: "Coins per click",
      coinsPerSecond: "Coins per second",
      success: "Success",
      settingsSaved: "Settings saved",
      error: "Error",
      settingsError: "Error saving settings",
      saveGame: "Save",
      lastSave: "Last save: ",
      saveSuccess: "Game saved",
      saveError: "Error saving game",
      never: "Never",
      justNow: "Just now",
      minuteAgo: "minute ago",
      minutesAgo: "minutes ago",
      hourAgo: "hour ago",
      hoursAgo: "hours ago",
      dayAgo: "day ago",
      daysAgo: "days ago",
      notEnoughCoins: "Not enough coins to buy this upgrade",
      autoSave: "Auto Save",
      autoSaveDisabled: "Disabled",
      autoSave5Sec: "Every 5 seconds",
      autoSave10Sec: "Every 10 seconds",
      autoSave15Sec: "Every 15 seconds",
      autoSave30Sec: "Every 30 seconds",
      autoSave1Min: "Every minute",
      autoSave5Min: "Every 5 minutes",
      autoSave15Min: "Every 15 minutes",
      autoSave30Min: "Every 30 minutes",
      autoSave1Hour: "Every hour",
    },
  };

  // Fonction pour mettre à jour tous les textes
  function updateTexts(language) {
    // Mettre à jour les éléments avec data-translate
    document.querySelectorAll("[data-translate]").forEach((element) => {
      const key = element.getAttribute("data-translate");
      if (translations[language][key]) {
        if (element.querySelector("span")) {
          const span = element.querySelector("span");
          const spanContent = span.textContent;
          element.innerHTML =
            translations[language][key] + ": <span>" + spanContent + "</span>";
        } else {
          element.textContent = translations[language][key];
        }
      }
    });

    // Mettre à jour le texte du bouton de sauvegarde
    const saveButton = document.getElementById("save-game");
    if (saveButton) {
      saveButtonText = translations[language].saveGame;
      saveButton.textContent = saveButtonText;
    }
  }

  // Fonction pour appliquer le thème
  function applyTheme(theme) {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }

  // Variables globales
  let currentLanguage = "fr";
  let autoClickerInterval = null;
  let autoClickerActive = false;
  let lastSaveTime = null;
  let saveInterval = null;
  let notificationsEnabled = true;
  let lastClickTime = Date.now();
  let nextClickTime = Date.now() + 1000;
  let saveButtonText = null;
  let autoSaveInterval = null;
  let autoSaveEnabled = false;
  let autoSaveTime = 0;
  let autoSaveInitialized = false;

  // État du jeu en mémoire
  let gameState = {
    coins: 0,
    coinsPerClick: 1,
    coinsPerSecond: 0,
    upgrades: {
      clickPower: { level: 1, cost: 10 },
      autoClicker: { level: 0, cost: 50 },
    },
  };

  // Fonction pour mettre à jour l'affichage
  function updateGameStats(data) {
    // Mise à jour des pièces et statistiques sans toucher au texte existant
    const coinsElement = document.getElementById("coins");
    const coinsPerClickElement = document.getElementById("coins-per-click");
    const coinsPerSecondElement = document.getElementById("coins-per-second");

    // Mettre à jour uniquement si le contenu a changé
    if (
      coinsElement &&
      Math.floor(data.coins) !== parseInt(coinsElement.textContent)
    ) {
      coinsElement.textContent = Math.floor(data.coins);
    }
    if (
      coinsPerClickElement &&
      data.coinsPerClick !== parseInt(coinsPerClickElement.textContent)
    ) {
      coinsPerClickElement.textContent = data.coinsPerClick;
    }
    if (
      coinsPerSecondElement &&
      data.coinsPerSecond !== parseInt(coinsPerSecondElement.textContent)
    ) {
      coinsPerSecondElement.textContent = data.coinsPerSecond;
    }

    // Mise à jour des niveaux et coûts
    if (data.upgrades) {
      // Mise à jour de la puissance de clic
      if (data.upgrades.clickPower) {
        const clickPowerLevel = document.getElementById("click-power-level");
        const clickPowerCost = document.getElementById("click-power-cost");
        if (
          clickPowerLevel &&
          clickPowerLevel.textContent !==
            data.upgrades.clickPower.level.toString()
        ) {
          clickPowerLevel.textContent = data.upgrades.clickPower.level;
        }
        if (
          clickPowerCost &&
          clickPowerCost.textContent !==
            data.upgrades.clickPower.cost.toString()
        ) {
          clickPowerCost.textContent = data.upgrades.clickPower.cost;
        }
      }

      // Mise à jour de l'auto-cliqueur
      if (data.upgrades.autoClicker) {
        const autoClickerLevel = document.getElementById("auto-clicker-level");
        const autoClickerCost = document.getElementById("auto-clicker-cost");
        if (
          autoClickerLevel &&
          autoClickerLevel.textContent !==
            data.upgrades.autoClicker.level.toString()
        ) {
          autoClickerLevel.textContent = data.upgrades.autoClicker.level;
        }
        if (
          autoClickerCost &&
          autoClickerCost.textContent !==
            data.upgrades.autoClicker.cost.toString()
        ) {
          autoClickerCost.textContent = data.upgrades.autoClicker.cost;
        }
      }
    }

    // Restaurer le texte du bouton de sauvegarde s'il a été modifié
    const saveButton = document.getElementById("save-game");
    if (
      saveButton &&
      saveButtonText &&
      saveButton.textContent !== saveButtonText
    ) {
      saveButton.textContent = saveButtonText;
    }
  }

  // Fonction pour mettre à jour l'état du jeu
  function updateGameState(newState) {
    gameState = { ...gameState, ...newState };
    updateGameStats(gameState);
  }

  // Fonction pour gérer les notifications
  function showNotification(message, type = "info") {
    if (!notificationsEnabled) return;

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${translations[currentLanguage][type]}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">&times;</button>
    `;

    document
      .querySelector(".notifications-container")
      .appendChild(notification);

    setTimeout(() => {
      notification.classList.add("removing");
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    notification
      .querySelector(".notification-close")
      .addEventListener("click", () => {
        notification.classList.add("removing");
        setTimeout(() => notification.remove(), 300);
      });
  }

  // Fonction pour gérer la sauvegarde automatique
  async function saveGame() {
    try {
      const now = new Date();
      const saveData = {
        coins: gameState.coins,
        coinsPerClick: gameState.coinsPerClick,
        coinsPerSecond: gameState.coinsPerSecond,
        upgrades: gameState.upgrades,
        lastSaveTime: now.toISOString(),
      };

      const response = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        const data = await response.json();

        if (data) {
          gameState = {
            ...gameState,
            coins: data.coins || gameState.coins,
            coinsPerClick: data.coinsPerClick || gameState.coinsPerClick,
            coinsPerSecond: data.coinsPerSecond || gameState.coinsPerSecond,
            upgrades: data.upgrades || gameState.upgrades,
          };

          localStorage.setItem("gameState", JSON.stringify(gameState));
          updateGameStats(gameState);
        }

        lastSaveTime = now;
        const lastSaveElement = document.getElementById("last-save");
        if (lastSaveElement) {
          lastSaveElement.textContent =
            translations[currentLanguage].lastSave + formatDate(lastSaveTime);
        }

        // Réinitialiser le timer de sauvegarde automatique
        const autoSaveSelect = document.getElementById("auto-save-select");
        if (autoSaveSelect) {
          const interval = autoSaveSelect.value;
          localStorage.setItem("autoSaveInterval", interval);
          localStorage.setItem("lastAutoSaveTime", now.toString());
          startAutoSave(true);
        }

        showNotification(translations[currentLanguage].saveSuccess, "success");
      } else {
        const errorData = await response.json();
        console.error("Erreur de sauvegarde:", errorData);
        showNotification(translations[currentLanguage].saveError, "error");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      showNotification(translations[currentLanguage].saveError, "error");
    }
  }

  function setupAutoSave() {
    let autoSaveInterval = null;
    let timerInterval = null;
    let lastSaveTime = localStorage.getItem("lastAutoSaveTime");
    let currentInterval = localStorage.getItem("autoSaveInterval") || "0";
    let isAutoSaving = false;

    function formatTimeRemaining(seconds) {
      if (isNaN(seconds) || seconds < 0) {
        return "";
      }

      if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} heure${hours > 1 ? "s" : ""} restante${
          hours > 1 ? "s" : ""
        }`;
      } else if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes > 1 ? "s" : ""} restante${
          minutes > 1 ? "s" : ""
        }`;
      } else {
        return `${Math.floor(seconds)} seconde${
          seconds > 1 ? "s" : ""
        } restante${seconds > 1 ? "s" : ""}`;
      }
    }

    function updateTimer() {
      const autoSaveSelect = document.getElementById("auto-save-select");
      if (!autoSaveSelect) return;

      const interval = parseInt(autoSaveSelect.value);
      if (interval <= 0) {
        document.getElementById("auto-save-timer").textContent = "";
        return;
      }

      // Calculer le temps restant
      const now = Date.now();
      const lastSave = parseInt(lastSaveTime || now);
      const elapsedTime = Math.floor((now - lastSave) / 1000);
      const remainingTime = Math.max(0, interval - (elapsedTime % interval));

      // Afficher le temps restant
      document.getElementById("auto-save-timer").textContent =
        formatTimeRemaining(remainingTime);

      // Si le temps est écoulé et qu'on n'est pas déjà en train de sauvegarder
      if (elapsedTime >= interval && !isAutoSaving) {
        isAutoSaving = true;
        const saveData = {
          coins: gameState.coins,
          coinsPerClick: gameState.coinsPerClick,
          coinsPerSecond: gameState.coinsPerSecond,
          upgrades: gameState.upgrades,
          lastSaveTime: new Date().toISOString(),
        };

        fetch("/api/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(saveData),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data) {
              gameState = {
                ...gameState,
                coins: data.coins || gameState.coins,
                coinsPerClick: data.coinsPerClick || gameState.coinsPerClick,
                coinsPerSecond: data.coinsPerSecond || gameState.coinsPerSecond,
                upgrades: data.upgrades || gameState.upgrades,
              };
              localStorage.setItem("gameState", JSON.stringify(gameState));
              updateGameStats(gameState);
            }
            // Réinitialiser le timer après une sauvegarde automatique
            lastSaveTime = now.toString();
            localStorage.setItem("lastAutoSaveTime", lastSaveTime);
            showNotification(
              translations[currentLanguage].saveSuccess,
              "success"
            );
            isAutoSaving = false;
          })
          .catch((error) => {
            console.error("Erreur lors de la sauvegarde:", error);
            showNotification(translations[currentLanguage].saveError, "error");
            isAutoSaving = false;
          });
      }
    }

    // Déplacer startAutoSave en dehors de setupAutoSave
    window.startAutoSave = function (isIntervalChange = false) {
      const autoSaveSelect = document.getElementById("auto-save-select");
      if (!autoSaveSelect) return;

      // Nettoyer les intervalles existants
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
      }
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const interval = parseInt(autoSaveSelect.value);
      if (interval <= 0) {
        document.getElementById("auto-save-timer").textContent = "";
        return;
      }

      // Réinitialiser le timer seulement si c'est un changement d'intervalle ou une sauvegarde manuelle
      if (isIntervalChange) {
        lastSaveTime = Date.now().toString();
        localStorage.setItem("lastAutoSaveTime", lastSaveTime);
      }

      // Mettre à jour le timer toutes les secondes
      timerInterval = setInterval(updateTimer, 1000);

      // Mettre à jour immédiatement
      updateTimer();
    };

    // Mettre à jour le timer quand l'intervalle change
    document
      .getElementById("auto-save-select")
      .addEventListener("change", () => {
        const interval = document.getElementById("auto-save-select").value;
        localStorage.setItem("autoSaveInterval", interval);
        window.startAutoSave(true); // true indique que c'est un changement d'intervalle
      });

    // Initialiser le timer
    window.startAutoSave(false);
  }

  // Fonction pour sauvegarder les paramètres
  async function saveSettings() {
    try {
      const language = document.getElementById("language-select").value;
      const theme = document.getElementById("theme-select").value;
      const notifications = document.getElementById(
        "notifications-toggle"
      ).checked;
      const autoSave = document.getElementById("auto-save-select").value;

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          theme,
          notifications,
          autoSave,
        }),
      });

      if (response.ok) {
        currentLanguage = language;
        notificationsEnabled = notifications;
        applyTheme(theme);
        updateTexts(language);

        // Mettre à jour la sauvegarde automatique seulement après la sauvegarde des paramètres
        autoSaveEnabled = autoSave !== "0";
        autoSaveTime = parseInt(autoSave);

        // Réinitialiser le timer sans sauvegarder
        const autoSaveSelect = document.getElementById("auto-save-select");
        if (autoSaveSelect) {
          localStorage.setItem("autoSaveInterval", autoSave);
          const lastSaveTime = Date.now().toString();
          localStorage.setItem("lastAutoSaveTime", lastSaveTime);
        }

        if (notificationsEnabled) {
          showNotification(translations[language].settingsSaved, "success");
        }
      } else {
        if (notificationsEnabled) {
          showNotification(
            translations[currentLanguage].settingsError,
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres:", error);
      if (notificationsEnabled) {
        showNotification(translations[currentLanguage].settingsError, "error");
      }
    }
  }

  // Fonction pour formater la date
  function formatDate(date) {
    if (!date || isNaN(date.getTime())) {
      return translations[currentLanguage].never;
    }

    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return translations[currentLanguage].justNow;
    } else if (minutes < 60) {
      return `${minutes} ${
        minutes === 1
          ? translations[currentLanguage].minuteAgo
          : translations[currentLanguage].minutesAgo
      }`;
    } else if (hours < 24) {
      return `${hours} ${
        hours === 1
          ? translations[currentLanguage].hourAgo
          : translations[currentLanguage].hoursAgo
      }`;
    } else if (days < 7) {
      return `${days} ${
        days === 1
          ? translations[currentLanguage].dayAgo
          : translations[currentLanguage].daysAgo
      }`;
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  // Fonction pour sauvegarder l'état de l'auto-cliqueur
  function saveAutoClickerState() {
    const state = {
      active: autoClickerActive,
      coinsPerSecond: gameState.coinsPerSecond,
      lastClickTime: lastClickTime,
      nextClickTime: nextClickTime,
      coins: gameState.coins,
    };
    localStorage.setItem("autoClickerState", JSON.stringify(state));
  }

  // Fonction pour synchroniser avec le serveur
  async function syncWithServer() {
    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gameState),
      });
      if (response.ok) {
        const data = await response.json();
        updateGameState(data);
      }
    } catch (error) {
      console.error("Erreur lors de la synchronisation:", error);
    }
  }

  // Fonction pour faire un clic
  function handleClick() {
    // Calculer les nouvelles pièces en local
    const newCoins = gameState.coins + gameState.coinsPerClick;
    updateGameState({
      coins: newCoins,
      coinsPerClick: gameState.coinsPerClick,
      coinsPerSecond: gameState.coinsPerSecond,
      upgrades: gameState.upgrades,
    });
  }

  // Fonction pour acheter une amélioration
  function handleUpgrade(upgradeType) {
    const upgrade = gameState.upgrades[upgradeType];

    // Vérifier si on a assez de pièces
    if (gameState.coins < upgrade.cost) {
      showNotification(translations[currentLanguage].notEnoughCoins, "error");
      return;
    }

    // Calculer les nouvelles valeurs en local
    const newCoins = gameState.coins - upgrade.cost;
    const newLevel = upgrade.level + 1;
    const newCost = Math.floor(upgrade.cost * 1.5);

    const newUpgrades = {
      ...gameState.upgrades,
      [upgradeType]: {
        level: newLevel,
        cost: newCost,
      },
    };

    // Mettre à jour l'état local
    updateGameState({
      coins: newCoins,
      coinsPerClick:
        upgradeType === "clickPower" ? newLevel : gameState.coinsPerClick,
      coinsPerSecond:
        upgradeType === "autoClicker" ? newLevel : gameState.coinsPerSecond,
      upgrades: newUpgrades,
    });

    if (upgradeType === "autoClicker" && newLevel > 0) {
      startAutoClicker(newLevel);
    }
  }

  // Fonction pour faire un clic automatique
  function doAutoClick() {
    const now = Date.now();
    if (now >= nextClickTime) {
      const newCoins = gameState.coins + gameState.coinsPerSecond;
      updateGameState({
        coins: newCoins,
        coinsPerClick: gameState.coinsPerClick,
        coinsPerSecond: gameState.coinsPerSecond,
        upgrades: gameState.upgrades,
      });
      lastClickTime = now;
      nextClickTime = now + 1000;
    }
  }

  // Fonction pour démarrer l'auto-cliqueur
  async function startAutoClicker(coinsPerSecond) {
    if (autoClickerInterval) {
      clearInterval(autoClickerInterval);
    }

    if (coinsPerSecond > 0) {
      autoClickerActive = true;
      const now = Date.now();

      // Récupérer l'état sauvegardé
      const savedState = localStorage.getItem("autoClickerState");
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.active && state.coinsPerSecond === coinsPerSecond) {
          // Utiliser le timing sauvegardé
          lastClickTime = state.lastClickTime;
          nextClickTime = state.nextClickTime;
        } else {
          // Nouveau timing
          lastClickTime = now;
          nextClickTime = now + 1000;
        }
      } else {
        // Nouveau timing
        lastClickTime = now;
        nextClickTime = now + 1000;
      }

      // Vérifier les clics toutes les 100ms
      autoClickerInterval = setInterval(doAutoClick, 100);
    } else {
      autoClickerActive = false;
      localStorage.removeItem("autoClickerState");
    }
  }

  // Fonction pour mettre à jour la date de dernière sauvegarde
  function updateLastSaveTime() {
    if (lastSaveTime) {
      const lastSaveElement = document.getElementById("last-save");
      if (lastSaveElement) {
        lastSaveElement.textContent =
          translations[currentLanguage].lastSave + formatDate(lastSaveTime);
      }
    }
  }

  // Fonction pour prévisualiser les changements de paramètres
  function previewSettings() {
    const language = document.getElementById("language-select").value;
    const theme = document.getElementById("theme-select").value;
    const notifications = document.getElementById(
      "notifications-toggle"
    ).checked;
    const autoSave = document.getElementById("auto-save-select").value;

    // Appliquer les changements sans sauvegarder
    applyTheme(theme);
    updateTexts(language);
    updateAutoSaveDisplay();
  }

  // Fonction pour mettre à jour l'affichage de la valeur de l'auto-save
  function updateAutoSaveDisplay() {
    const autoSaveSelect = document.getElementById("auto-save-select");
    const autoSaveValue = document.getElementById("auto-save-value");

    if (autoSaveSelect && autoSaveValue) {
      const selectedOption =
        autoSaveSelect.options[autoSaveSelect.selectedIndex];
      const translationKey = selectedOption.getAttribute("data-translate");
      autoSaveValue.textContent = translationKey
        ? translations[currentLanguage][translationKey]
        : selectedOption.textContent;
    }
  }

  // Initialisation au chargement de la page
  document.addEventListener("DOMContentLoaded", async () => {
    // Ne vérifier l'authentification que sur les pages qui en ont besoin
    const currentPath = window.location.pathname;
    const publicPaths = ["/", "/login", "/register"];

    if (!publicPaths.includes(currentPath)) {
      // Vérifier si l'utilisateur est connecté
      try {
        const response = await fetch("/api/auth/check");
        if (response.ok) {
          const data = await response.json();
          if (data.userId) {
            localStorage.setItem("userId", data.userId);
          }
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification de l'authentification:",
          error
        );
      }
    }

    // Charger les paramètres
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();

        currentLanguage = settings.language || "fr";
        notificationsEnabled = settings.notifications !== false;

        // Appliquer le thème immédiatement
        const theme = settings.theme || "light";
        document.body.className = theme;
        localStorage.setItem("theme", theme);

        // Mettre à jour les éléments de l'interface
        const languageSelect = document.getElementById("language-select");
        const themeSelect = document.getElementById("theme-select");
        const notificationsToggle = document.getElementById(
          "notifications-toggle"
        );
        const autoSaveSelect = document.getElementById("auto-save-select");
        const saveSettingsButton = document.getElementById("save-settings");

        if (languageSelect) {
          languageSelect.value = currentLanguage;
          languageSelect.addEventListener("change", previewSettings);
        }
        if (themeSelect) {
          themeSelect.value = theme;
          themeSelect.addEventListener("change", previewSettings);
        }
        if (notificationsToggle) {
          notificationsToggle.checked = notificationsEnabled;
        }
        if (autoSaveSelect) {
          const autoSaveValue = (settings.autoSave || "0").toString();
          autoSaveSelect.value = autoSaveValue;
          updateAutoSaveDisplay();
          autoSaveSelect.addEventListener("change", previewSettings);
          autoSaveEnabled = autoSaveValue !== "0";
          autoSaveTime = parseInt(autoSaveValue);
        }

        updateTexts(currentLanguage);

        if (saveSettingsButton) {
          saveSettingsButton.addEventListener("click", saveSettings);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error);
    }

    // Charger l'état initial depuis la base de données
    try {
      const response = await fetch("/api/save");
      if (response.ok) {
        const data = await response.json();

        // S'assurer que toutes les données nécessaires sont présentes
        gameState = {
          coins: data.coins || 0,
          coinsPerClick: data.coinsPerClick || 1,
          coinsPerSecond: data.coinsPerSecond || 0,
          upgrades: data.upgrades || {
            clickPower: { level: 1, cost: 10 },
            autoClicker: { level: 0, cost: 50 },
          },
        };

        // Mettre à jour l'affichage immédiatement
        updateGameStats(gameState);

        // Sauvegarder l'état initial dans localStorage
        localStorage.setItem("gameState", JSON.stringify(gameState));

        // Mettre à jour la date de dernière sauvegarde
        if (data.lastSaveTime) {
          lastSaveTime = new Date(data.lastSaveTime);
          const lastSaveElement = document.getElementById("last-save");
          if (lastSaveElement) {
            lastSaveElement.textContent =
              translations[currentLanguage].lastSave + formatDate(lastSaveTime);
          }
        }

        // Relancer l'auto-cliqueur si le niveau est supérieur à 0
        if (gameState.upgrades.autoClicker.level > 0) {
          startAutoClicker(gameState.upgrades.autoClicker.level);
        }

        // Configurer la sauvegarde automatique après avoir chargé les données
        if (!autoSaveInitialized) {
          setupAutoSave();
          autoSaveInitialized = true;
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la sauvegarde:", error);
    }

    // Gestionnaire pour le clic
    const clickButton = document.getElementById("click-button");
    if (clickButton) {
      clickButton.addEventListener("click", handleClick);
    }

    // Gestionnaire pour les améliorations
    document.querySelectorAll(".upgrade-button").forEach((button) => {
      button.addEventListener("click", () => {
        const upgradeType = button.dataset.upgrade;
        handleUpgrade(upgradeType);
      });
    });

    // Initialiser le bouton de sauvegarde
    const saveButton = document.getElementById("save-game");
    if (saveButton) {
      saveButtonText = translations[currentLanguage].saveGame;
      saveButton.textContent = saveButtonText;
      saveButton.addEventListener("click", saveGame);
    }

    // Mettre à jour la date de dernière sauvegarde toutes les secondes
    setInterval(updateLastSaveTime, 1000);
  });
}
