[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**Ein ruhiger, nachvollziehbarer Aussprachetrainer zum Hören und Sprechen von L und N.**

[Live-PWA öffnen](https://l-and-n.lazying.art) · [Forschungsnotizen](../docs/research/pronunciation-assessment.md) · [Quellenübersicht](../docs/source-lesson.md)

L-and-N macht aus einem schwierigen Lautkontrast eine kurze Übungsschleife: Zielbuchstaben oder Schriftzeichen sehen, ein aufgenommenes Vorbild hören, das Signal beobachten, die eigene Stimme aufnehmen und eine erklärte Bewertung lesen. Derselbe Kurs läuft als installierbare PWA, Android-App, iPhone/iPad-App und kompakte watchOS-Übung.

![Übungsansicht](../docs/images/pwa-practice.png)

## Funktionen

- 20 englische Wörter in zehn Minimalpaaren sowie eigene Übungen für Mandarin und Kantonesisch.
- Markiert Buchstabe oder Schriftzeichen und erklärt Zungenposition und Luftstrom in klarer Sprache.
- Englische GPT-SoVITS- und native chinesische Modellaufnahmen sind enthalten; zum Anhören ist kein laufender TTS-Dienst nötig.
- Live-Wellenform und Anfangsspektrum zeigen Stille, Übersteuerung und Timing, nicht eine erfundene „Richtigkeit“.
- Ein interaktives 3D-Mundmodell zeigt seitlichen Luftstrom bei L und nasalen Luftstrom bei N. Es zeigt die Zielbewegung und rekonstruiert nicht die echte Zunge aus dem Mikrofonsignal.
- Versuche und vorsichtige persönliche Kalibrierung bleiben auf dem Gerät; chinesische Tonverläufe werden getrennt vom Konsonanten bewertet.

## Eine überprüfbare Bewertung

Die lokale Analyse sucht den stimmhaften Beginn, prüft die Aufnahmequalität und kombiniert mehrere Hinweise: tieffrequente nasale Energie, eine A1–P0-ähnliche Näherung, ungefähre F1/F2-Abstände, spektrale Neigung, Kontinuität, Erkennung des vorgegebenen Wortes und Minimalpaar-Kontrast. Sprachabhängige Referenzprofile werden nur nach mehreren guten Aufnahmen vorsichtig personalisiert. Schwache oder widersprüchliche Daten senken die Sicherheit und lösen eine Bitte zur Wiederholung aus.

Das Ergebnis ist Übungshilfe, keine Diagnose, kein Akzenturteil und keine zertifizierte Messung. Eine Wellenform zeigt Timing und Übersteuerung, beweist aber keinen Konsonanten. Aus Audio lässt sich die Zungenposition nicht eindeutig zurückrechnen. Der [Forschungsbericht](../docs/research/pronunciation-assessment.md) erklärt Methode und Grenzen mit Quellen zu L/N, GOP/CTC, Tönen, visuellem Feedback und artikulatorischer Inversion.

## Datenschutz und Sprachdienste

Akustische Merkmale, Punktzahl, Fortschritt und Kalibrierung werden lokal verarbeitet. Unter iOS versorgt ein einziger nativer Audio-Engine-Stream gleichzeitig Wellenform, lokale Akustikanalyse und systemeigene Spracherkennung; die App konkurriert daher nicht mit sich selbst um das Mikrofon. Die gehostete PWA versucht normalerweise zuerst die kompatible Browser-Spracherkennung; der Browser oder die Plattform kann diese Erkennung über einen eigenen Dienst verarbeiten. Im Web auf iPhone und iPad zeichnet die App stattdessen nur einen Stream auf, damit Wellenform und Recorder nicht um das Mikrofon konkurrieren, und transkribiert denselben kurzen Clip nach dem Stoppen. Wenn die Browser-Erkennung nicht verfügbar ist, fehlschlägt oder keinen Text liefert, kann ein Versuch kurz über ein Same-Origin-Gateway mit Ratenbegrenzung an den privaten Whisper-Dienst gehen. Das Gateway erlaubt nur den exakten Transkriptionspfad dieses Ursprungs, begrenzt Größe und Parallelität, protokolliert oder speichert kein Audio und antwortet mit `Cache-Control: no-store`. Ohne Transkription bleibt die Wellenform sichtbar, aber es wird keine Punktzahl angezeigt oder gespeichert.

Der Browser erhält keine LazyEdge-Zugangsdaten und verbindet sich nicht direkt mit dem privaten Modell. Alle Hörbeispiele sind statische, beim Release erzeugte und auf Verständlichkeit geprüfte Dateien.

## Plattformen und geprüfte Builds

| Plattform | Umsetzung | Prüfung |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Responsive Chromium-Ansicht, Offline-Cache, Aufnahme und Bewertung |
| Android | Capacitor 8 | API-36.1-Emulator: Build, Installation, Aufnahme, 3D und Audio |
| iOS | Capacitor 8 + nativer AVAudioEngine-Recorder | iPhone-17-Pro-Simulator: Build, Installation und Start; Recorder-Integration und eingebettete Watch kompiliert (Mikrofontest auf echtem Gerät steht aus) |
| watchOS | SwiftUI | Apple-Watch-Series-11-Simulator (42 mm): Build, Installation und Start |

## Bauen und testen

Benötigt werden Node.js 22+, npm, Android Studio/JDK 21 für Android sowie Xcode und XcodeGen für Apple-Ziele.

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor erzeugt die nativen Web-Bundles aus `dist/`. Die Watch-App ist bewusst ein kleines, unabhängiges SwiftUI-Ziel. Geheimnisse und Laufzeitdaten werden ausgeschlossen; [der Gateway-Quelltext](../ops/landn_gateway.py) liest sein eng begrenztes Token aus einer geschützten Datei.

## Kurs und Evidenz

Der erste englische Satz folgt der Artikulationsfolge und den Minimalpaaren aus Pronunciation Snippets' [„The Difference Between L & N“](https://youtu.be/78RQW1Kq_3A). Das Repository enthält eine zeitgestempelte Paraphrase, nicht das Video, Audio oder vollständige Untertitel. Mandarin und Kantonesisch sind eigene Erweiterungen. Die kantonesische Kontrastübung ist ausdrücklich optional: verbreitete Hongkonger /n/→[l]-Variation wird nicht als fehlerhaft oder „faul“ bezeichnet.

Noch gibt es keinen großen, fachlich bewerteten, geräteübergreifenden Datensatz für alle drei Sprachvarianten. Für eine belastbare Genauigkeitsaussage müssten Precision/Recall auf zurückgehaltenen Daten, Kalibrierungsfehler, Regionen und Geräte sowie die Ablehnungsrate veröffentlicht werden. Beiträge zu einwilligungsbasierten Datenprotokollen, CTC/GOP auf Phonemebene und Barrierefreiheit sind willkommen.

## Projektstruktur

- `src/` — Kurs, Audioanalyse, erklärbare Bewertung, Signalanzeige und 3D-Modell.
- `public/audio/models/` — gebündelte und auf Verständlichkeit geprüfte Hörbeispiele.
- `android/`, `ios/`, `watch/` — native Hüllen und SwiftUI-Watch-App.
- `ops/` — minimales Whisper-Gateway ohne Fremdabhängigkeiten und Tests.
- `docs/` — Forschung, Quellen und Simulatornachweise.

## Unterstützen

Wenn das freie Projekt nützt, helfen ein Stern, ein Issue, eine Übersetzung oder ein klar begrenzter Pull Request. Finanzielle Beiträge finanzieren Hosting und Barrierefreiheit.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Mit Stripe unterstützen](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Auf GitHub sponsern](https://github.com/sponsors/lachlanchen)

## Zitat und Lizenz

Zitierdaten stehen in [`CITATION.cff`](../CITATION.cff). Kurzform als BibTeX:

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

Veröffentlicht unter der [MIT License](../LICENSE). Die erzeugten Stimmbeispiele dienen nur der App-Demonstration und dürfen nicht zur Nachahmung einer realen Person verwendet werden.
