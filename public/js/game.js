// Variables du jeu
let coins = 0;
let coinsPerClick = 1;
let coinsPerSecond = 0;
let autoClickerInterval = null;
let lastClickTime = 0;
const CLICK_COOLDOWN = 100; // 100ms entre chaque clic

// Éléments DOM
const coinsElement = document.getElementById("coins");
const coinsPerClickElement = document.getElementById("coins-per-click");
const coinsPerSecondElement = document.getElementById("coins-per-second");
const clickButton = document.getElementById("click-button");
const upgradeButtons = document.querySelectorAll(".upgrade-button");
const clickLevelElement = document.getElementById("click-level");
const autoLevelElement = document.getElementById("auto-level");

// Système de notifications
class NotificationSystem {
  constructor() {
    this.container = document.createElement("div");
    this.container.className = "notifications-container";
    document.body.appendChild(this.container);
  }

  show(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    this.container.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

const notifications = new NotificationSystem();

// Fonction pour mettre à jour uniquement les pièces
function updateCoins() {
  coinsElement.textContent = Math.floor(coins).toLocaleString();
}

// Fonction pour mettre à jour l'affichage complet
function updateDisplay() {
  updateCoins();
  coinsPerClickElement.textContent = coinsPerClick.toLocaleString();
  coinsPerSecondElement.textContent = coinsPerSecond.toLocaleString();

  // Mettre à jour les boutons d'amélioration
  upgradeButtons.forEach((button) => {
    const cost = parseInt(button.dataset.cost);
    button.disabled = coins < cost;
  });
}

// Fonction pour synchroniser avec le serveur
async function syncWithServer() {
  try {
    const response = await fetch("/api/save", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      coins = data.coins;
      coinsPerClick = data.coinsPerClick;
      coinsPerSecond = data.coinsPerSecond;
      updateDisplay();

      // Gérer l'auto-cliqueur
      if (coinsPerSecond > 0 && !autoClickerInterval) {
        startAutoClicker();
      } else if (coinsPerSecond === 0 && autoClickerInterval) {
        stopAutoClicker();
      }
    }
  } catch (error) {
    console.error("Erreur de synchronisation:", error);
  }
}

// Fonction pour démarrer l'auto-cliqueur
function startAutoClicker() {
  if (autoClickerInterval) return;

  autoClickerInterval = setInterval(async () => {
    try {
      const response = await fetch("/api/click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        coins = data.coins;
        updateCoins();
      }
    } catch (error) {
      console.error("Erreur auto-cliqueur:", error);
    }
  }, 1000);
}

// Fonction pour arrêter l'auto-cliqueur
function stopAutoClicker() {
  if (autoClickerInterval) {
    clearInterval(autoClickerInterval);
    autoClickerInterval = null;
  }
}

// Synchroniser au chargement de la page
syncWithServer();

// Gestionnaire de clic
clickButton.addEventListener("click", async () => {
  const now = Date.now();
  if (now - lastClickTime < CLICK_COOLDOWN) return;
  lastClickTime = now;

  try {
    const response = await fetch("/api/click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      coins = data.coins;
      coinsPerClick = data.coinsPerClick;
      coinsPerSecond = data.coinsPerSecond;
      updateDisplay();

      // Notification pour un clic réussi (seulement 5% de chance)
      if (Math.random() < 0.05) {
        notifications.show(`+${coinsPerClick} pièces !`, "success");
      }
    } else {
      const error = await response.json();
      notifications.show(error.message || "Erreur lors du clic", "error");
    }
  } catch (error) {
    console.error("Erreur lors du clic:", error);
    notifications.show("Erreur de connexion", "error");
  }
});

// Gestionnaire d'amélioration
upgradeButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.disabled) return;

    const upgradeType = button.dataset.upgrade;
    const cost = parseInt(button.dataset.cost);

    if (coins < cost) {
      notifications.show("Pas assez de pièces !", "error");
      return;
    }

    try {
      const response = await fetch("/api/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upgradeType: upgradeType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        coins = data.coins;
        coinsPerClick = data.coinsPerClick;
        coinsPerSecond = data.coinsPerSecond;

        // Mettre à jour les niveaux et les coûts
        if (upgradeType === "clickPower") {
          clickLevelElement.textContent = data.upgrades.clickPower.level;
          button.dataset.cost = data.upgrades.clickPower.cost;
          button.previousElementSibling.querySelector(".cost").textContent =
            data.upgrades.clickPower.cost.toLocaleString();
        } else {
          autoLevelElement.textContent = data.upgrades.autoClicker.level;
          button.dataset.cost = data.upgrades.autoClicker.cost;
          button.previousElementSibling.querySelector(".cost").textContent =
            data.upgrades.autoClicker.cost.toLocaleString();
        }

        updateDisplay();

        // Gérer l'auto-cliqueur après une amélioration
        if (upgradeType === "autoClicker") {
          if (coinsPerSecond > 0) {
            startAutoClicker();
          } else {
            stopAutoClicker();
          }
        }

        notifications.show(
          `${
            upgradeType === "clickPower" ? "Meilleur clic" : "Auto-cliqueur"
          } niveau ${data.upgrades[upgradeType].level}`,
          "success"
        );
      } else {
        const error = await response.json();
        notifications.show(error.message || "Erreur lors de l'achat", "error");
      }
    } catch (error) {
      console.error("Erreur lors de l'amélioration:", error);
      notifications.show("Erreur de connexion", "error");
    }
  });
});
