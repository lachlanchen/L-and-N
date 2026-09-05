[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**Un coach de prononciation calme et transparent pour entendre et produire L et N.**

[Ouvrir la PWA](https://l-and-n.lazying.art) · [Notes de recherche](../docs/research/pronunciation-assessment.md) · [Plan de la leçon](../docs/source-lesson.md)

L-and-N transforme un contraste difficile en une boucle courte : voir la lettre ou le caractère dans le mot, écouter un modèle enregistré, observer le signal, s'enregistrer et lire un score expliqué. Le même cours fonctionne comme PWA installable, application Android, application iPhone/iPad et exercice watchOS compact.

![Écran d’entraînement](../docs/images/pwa-practice.png)

## Fonctionnalités

- Entraîne 20 mots anglais en dix paires minimales, avec des exercices originaux en mandarin et cantonais.
- Met en évidence la lettre ou le caractère cible et explique simplement la position de la langue et le flux d'air.
- Des modèles GPT-SoVITS anglais et des voix chinoises natives sont intégrés ; leur écoute ne dépend pas d'un service TTS en ligne.
- L'onde en direct et le spectre d'attaque montrent silence, saturation et timing, sans prétendre être une jauge de « justesse ».
- Une coupe buccale 3D interactive illustre l'air latéral de L et l'air nasal de N. C'est un modèle du geste cible, pas une reconstruction de la langue de l'apprenant depuis le micro.
- Les essais et la calibration personnelle prudente restent sur l'appareil ; le ton chinois est évalué séparément de la consonne.

## Un score vérifiable

L'analyse locale repère l'attaque voisée, contrôle la qualité puis combine plusieurs indices : énergie nasale grave, approximation de type A1–P0, espacement F1/F2 approximatif, pente spectrale, continuité, reconnaissance du mot demandé et contraste de la paire minimale. Les références dépendent de la langue et plusieurs bons enregistrements sont nécessaires avant toute adaptation personnelle. Des indices faibles ou contradictoires diminuent la confiance et invitent à recommencer.

Ce retour sert à s'entraîner : ce n'est ni un diagnostic, ni un jugement d'accent, ni une mesure certifiée. Une onde révèle timing et saturation mais ne prouve pas une consonne, et l'audio ne permet pas de retrouver une position unique de langue. Le [rapport de recherche](../docs/research/pronunciation-assessment.md) explique méthode et limites avec les travaux sur L/N, GOP/CTC, tons, retour visuel et inversion articulatoire.

## Vie privée et services vocaux

Les caractéristiques acoustiques, les scores, la progression et la calibration sont traités localement. Sur iOS, un seul flux du moteur audio natif alimente à la fois la forme d'onde, l'analyse acoustique locale et la reconnaissance vocale du système ; l'application ne se dispute donc pas le microphone avec elle-même. La PWA hébergée utilise d'abord la reconnaissance vocale compatible du navigateur ; le navigateur ou la plateforme peuvent traiter cette reconnaissance au moyen de leur propre service. Ce n'est qu'en l'absence de reconnaissance vocale compatible dans le navigateur qu'une tentative peut être envoyée brièvement, par une passerelle de même origine à débit limité, au service Whisper privé afin de vérifier le mot. La passerelle n'accepte que le chemin de transcription exact depuis cette origine, limite la taille et la concurrence, ne journalise ni ne stocke l'audio et répond `Cache-Control: no-store`. L'application reste utilisable sans transcription.

Le navigateur ne reçoit aucun secret LazyEdge et ne contacte pas directement le modèle privé. Tous les exemples sont des ressources statiques produites et vérifiées lors de la version.

## Plateformes et builds vérifiés

| Plateforme | Réalisation | Vérification |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chromium adaptatif, cache hors-ligne, enregistrement et score |
| Android | Capacitor 8 | Émulateur API 36.1 : build, installation, résultat, 3D et audio intégré |
| iOS | Capacitor 8 + enregistreur AVAudioEngine natif | Simulateur iPhone 17 Pro : build, installation et lancement ; intégration de l'enregistreur et Watch embarquée compilées (test micro sur appareil physique restant) |
| watchOS | SwiftUI | Simulateur Apple Watch Series 11 (42 mm) : build, installation et lancement |

## Construire et tester

Prérequis : Node.js 22+, npm, Android Studio/JDK 21 pour Android, Xcode et XcodeGen pour Apple.

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor produit les paquets web natifs depuis `dist/`. La montre est une petite cible SwiftUI indépendante. Secrets et état d'exécution sont exclus ; [la passerelle](../ops/landn_gateway.py) lit son jeton restreint dans un fichier protégé.

## Cours et preuves

Le premier ensemble anglais suit la progression articulatoire et les paires minimales de [« The Difference Between L & N »](https://youtu.be/78RQW1Kq_3A) par Pronunciation Snippets. Le dépôt contient une paraphrase horodatée, pas la vidéo, l'audio ou les sous-titres complets. Mandarin et cantonais sont des ajouts originaux. L'exercice cantonais est facultatif : la variation /n/→[l], courante à Hong Kong, n'est pas qualifiée de défaut ou de parole « paresseuse ».

Il n'existe pas encore de grand corpus évalué par des spécialistes et multi-appareils couvrant les trois variétés. Une annonce de précision en production exigerait précision/rappel sur données réservées, erreur de calibration, ventilation région/appareil et taux d'abstention. Les protocoles consentis, modèles CTC/GOP par phonème et audits d'accessibilité sont bienvenus.

## Structure du projet

- `src/` — cours, analyse, score explicable, signal et modèle 3D.
- `public/audio/models/` — exemples de studio intégrés et vérifiés.
- `android/`, `ios/`, `watch/` — enveloppes natives et app SwiftUI.
- `ops/` — passerelle Whisper minimale sans dépendance et tests.
- `docs/` — recherche, provenance et preuves des simulateurs.

## Soutien

Si ce projet libre vous aide, une étoile, un ticket, une traduction ou une PR bien cadrée sont précieux. Les dons financent l'hébergement et l'accessibilité.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Soutenir avec Stripe](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Soutenir sur GitHub](https://github.com/sponsors/lachlanchen)

## Citation et licence

Les métadonnées sont dans [`CITATION.cff`](../CITATION.cff). Forme BibTeX courte :

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

Publié sous [MIT License](../LICENSE). Les voix générées sont des ressources de démonstration et ne doivent pas servir à usurper l'identité d'une personne.
