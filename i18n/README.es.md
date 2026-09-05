[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**Un entrenador de pronunciación tranquilo y transparente para oír y producir L y N.**

[Abrir la PWA](https://l-and-n.lazying.art) · [Notas de investigación](../docs/research/pronunciation-assessment.md) · [Mapa de la lección](../docs/source-lesson.md)

L-and-N convierte un contraste difícil en un ciclo breve: ver la letra o carácter dentro de la palabra, escuchar un modelo grabado, observar la señal, grabarse y leer una puntuación explicada. El mismo curso funciona como PWA instalable, aplicación Android, aplicación para iPhone/iPad y ejercicio compacto para watchOS.

![Pantalla de práctica](../docs/images/pwa-practice.png)

## Qué hace

- Entrena 20 palabras inglesas en diez pares mínimos, además de ejercicios originales de mandarín y cantonés.
- Destaca la letra o carácter objetivo y explica la posición de la lengua y el flujo de aire con lenguaje sencillo.
- Incluye GPT-SoVITS en inglés y voces nativas chinas; escucharlas no depende de un servicio TTS activo.
- Muestra la onda en vivo y el espectro del inicio para revelar silencio, saturación y tiempo, no como un medidor decorativo de «corrección».
- El modelo bucal 3D interactivo muestra aire lateral para L y aire nasal para N. Representa el gesto deseado; no pretende reconstruir la lengua real desde el micrófono.
- Conserva intentos y calibración personal prudente en el dispositivo; el tono chino se puntúa por separado del tipo de consonante.

## Una puntuación que se puede inspeccionar

El analizador local localiza el inicio sonoro, comprueba la calidad y combina energía nasal de baja frecuencia, una aproximación tipo A1–P0, espaciado F1/F2 aproximado, inclinación espectral, continuidad, reconocimiento de la palabra indicada y contraste del par mínimo. Los perfiles de referencia dependen del idioma y solo varias grabaciones buenas ajustan con cautela la base personal. Las pruebas débiles o contradictorias reducen la confianza y piden repetir.

Es orientación para practicar, no diagnóstico, juicio de acento ni medición certificada. La onda muestra tiempo y saturación, pero no demuestra una consonante; tampoco se puede deducir una posición única de lengua solo desde el audio. El [informe de investigación](../docs/research/pronunciation-assessment.md) presenta método, límites y fuentes sobre L/N, GOP/CTC, tonos, retroalimentación visual e inversión articulatoria.

## Privacidad y servicios de voz

Las características acústicas, puntuaciones, progreso y calibración se procesan localmente. La aplicación instalada usa el reconocimiento de voz nativo cuando el sistema operativo lo ofrece. La PWA alojada utiliza primero un reconocimiento de voz compatible del navegador; el navegador o la plataforma pueden procesar ese reconocimiento mediante su propio servicio. Solo cuando no existe un reconocimiento de voz compatible en el navegador, un intento puede enviarse temporalmente a través de una pasarela del mismo origen y con límite de solicitudes al servicio privado de Whisper para comprobar la palabra. La pasarela solo acepta la ruta exacta de transcripción desde este origen, limita el tamaño y la concurrencia, no registra ni guarda audio y responde `Cache-Control: no-store`. La aplicación sigue siendo útil sin transcripción.

El navegador no recibe credenciales de LazyEdge ni conecta directamente con el modelo privado. Todos los ejemplos son archivos estáticos generados y comprobados al publicar.

## Plataformas y compilaciones verificadas

| Plataforma | Implementación | Verificación |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chromium adaptable, caché sin conexión, grabación y puntuación |
| Android | Capacitor 8 | Emulador API 36.1: compilación, instalación, resultado, 3D y audio incluido |
| iOS | Capacitor 8 | Simulador iPhone 17 Pro en macOS: compilación, instalación y arranque |
| watchOS | SwiftUI | Simulador Apple Watch Series 11 (42 mm): compilación, instalación y arranque |

## Compilar y probar

Requiere Node.js 22+, npm, Android Studio/JDK 21 para Android y Xcode con XcodeGen para Apple.

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor genera los paquetes web nativos desde `dist/`. El reloj es un objetivo SwiftUI independiente y pequeño. Se excluyen secretos y estado de ejecución; [el gateway](../ops/landn_gateway.py) lee un token de alcance reducido desde un archivo protegido.

## Curso y evidencia

El primer conjunto inglés sigue la secuencia articulatoria y los pares mínimos de [«The Difference Between L & N»](https://youtu.be/78RQW1Kq_3A), de Pronunciation Snippets. El repositorio contiene una paráfrasis con tiempos, no redistribuye vídeo, audio ni subtítulos completos. Mandarín y cantonés son extensiones originales. La práctica cantonesa es opcional: la variación /n/→[l], extendida en Hong Kong, no se etiqueta como habla defectuosa o «perezosa».

Todavía no existe un gran corpus evaluado por expertos y entre dispositivos que valide las tres variedades. Una afirmación de precisión de producción necesitaría publicar precisión/recuperación en datos reservados, error de calibración, resultados por región y dispositivo y frecuencia de abstención. Se agradecen protocolos con consentimiento, modelos CTC/GOP por fonema y revisiones de accesibilidad.

## Estructura del proyecto

- `src/`: curso, análisis acústico, puntuación explicable, señal y modelo 3D.
- `public/audio/models/`: modelos de estudio incluidos y comprobados.
- `android/`, `ios/`, `watch/`: envolturas nativas y aplicación SwiftUI.
- `ops/`: gateway Whisper mínimo, sin dependencias, y sus pruebas.
- `docs/`: investigación, procedencia y pruebas de simuladores.

## Apoyo

Si este proyecto gratuito resulta útil, ayuda una estrella, una incidencia, una traducción o una solicitud de cambios bien delimitada. Las aportaciones financian el alojamiento y la accesibilidad.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Apoyar con Stripe](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Patrocinar en GitHub](https://github.com/sponsors/lachlanchen)

## Cita y licencia

Los metadatos están en [`CITATION.cff`](../CITATION.cff). Forma BibTeX breve:

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

Publicado con [MIT License](../LICENSE). Los modelos de voz generados son recursos de demostración; no deben usarse para suplantar a una persona real.
