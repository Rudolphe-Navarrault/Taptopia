import fr from "./fr.js";
import en from "./en.js";

// Stocker les traductions dans un objet global
window.translations = {
  fr,
  en,
};

// Fonction pour obtenir une traduction
window.getTranslation = function (key, language = "fr") {
  const translation = window.translations[language]?.[key];
  return translation || key;
};

// Fonction pour mettre à jour tous les textes de l'interface
window.updateTexts = function (language) {
  document.querySelectorAll("[data-translate]").forEach((element) => {
    const key = element.getAttribute("data-translate");
    const translation = window.getTranslation(key, language);

    // Si l'élément contient un span, mettre à jour le texte du span
    const span = element.querySelector("span");
    if (span) {
      span.textContent = translation;
    } else {
      element.textContent = translation;
    }
  });
};
