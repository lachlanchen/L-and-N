[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**L과 N을 듣고 발음하도록 돕는 차분하고 근거가 보이는 발음 코치입니다.**

[라이브 PWA 열기](https://l-and-n.lazying.art) · [연구 노트](../docs/research/pronunciation-assessment.md) · [원본 수업 안내](../docs/source-lesson.md)

L-and-N은 어려운 소리 대조를 짧은 연습 순환으로 바꿉니다. 단어나 한자에서 목표를 보고, 녹음된 모델을 듣고, 신호를 확인하고, 자신의 소리를 녹음한 뒤 설명 가능한 점수를 읽습니다. 같은 교육 과정이 설치형 PWA, Android, iPhone/iPad와 작은 watchOS 훈련 앱에서 동작합니다.

![연습 화면](../docs/images/pwa-practice.png)

## 주요 기능

- 영어 최소 대립쌍 10개와 20단어, 독자적인 표준중국어 및 광둥어 연습을 제공합니다.
- 목표 글자나 한자를 강조하고 혀 위치와 공기 흐름을 쉬운 말로 안내합니다.
- 영어 GPT-SoVITS와 중국어 네이티브 모델 음성이 앱에 포함되어 실시간 TTS가 필요 없습니다.
- 실시간 파형과 시작 구간 스펙트럼은 무음, 클리핑, 타이밍을 확인하기 위한 것이며 장식적인 정답 미터가 아닙니다.
- 대화형 3D 입 단면은 L의 측면 기류와 N의 비강 기류를 보여 줍니다. 목표 동작 모델이며 마이크로 사용자의 실제 혀를 복원한다고 주장하지 않습니다.
- 시도 기록과 조심스러운 개인 보정은 기기에 남고, 중국어 성조는 자음과 별도로 평가합니다.

## 근거를 확인하는 점수

로컬 평가기는 유성 시작점과 녹음 품질을 확인한 뒤 저대역 비음 에너지, A1–P0 형식 대리값, 대략적인 F1/F2 간격, 스펙트럼 기울기, 연속성, 제시 단어 인식, 최소 대립 결과를 함께 비교합니다. 언어별 참조 프로필을 사용하고 여러 번의 좋은 녹음이 있을 때만 개인 기준을 조심스럽게 바꿉니다. 근거가 약하거나 충돌하면 신뢰도를 낮추고 다시 녹음하도록 안내합니다.

이는 연습 피드백이며 진단, 억양 판정, 인증된 측정이 아닙니다. 파형만으로 자음을 확정할 수 없고 소리만으로 혀 위치를 유일하게 역산할 수도 없습니다. [연구 보고서](../docs/research/pronunciation-assessment.md)에 L/N, GOP/CTC, 성조, 시각 피드백, 조음 역문제의 근거와 한계를 설명합니다.

## 개인정보와 음성 서비스

음향 특징, 점수, 진행도와 보정은 로컬에서 처리합니다. iOS에서는 하나의 네이티브 오디오 엔진 스트림을 파형, 로컬 음향 분석, 운영체제 음성 인식이 함께 사용하므로 앱 내부 기능끼리 마이크를 두고 충돌하지 않습니다. 호스팅 PWA는 일반적으로 먼저 호환되는 브라우저 음성 인식을 시도하며, 브라우저나 플랫폼은 자체 서비스를 통해 이를 처리할 수 있습니다. iPhone과 iPad 웹에서는 파형과 녹음기가 마이크를 두고 충돌하지 않도록 스트림 하나만 녹음하고, 중지한 뒤 같은 짧은 클립을 전사합니다. 브라우저 인식을 사용할 수 없거나 실패하거나 텍스트를 반환하지 않으면, 시도가 같은 출처의 속도 제한 게이트웨이를 거쳐 비공개 Whisper 서비스로 일시 전송될 수 있습니다. 게이트웨이는 이 출처의 정확한 전사 경로만 허용하고 크기와 동시 요청을 제한하며, 음성을 기록하거나 저장하지 않고 `Cache-Control: no-store`를 반환합니다. 전사가 없으면 파형은 남지만 점수를 표시하거나 저장하지 않습니다.

공개 브라우저는 LazyEdge 자격 증명을 받지 않고 비공개 모델에 직접 연결하지 않습니다. 모든 모델 음성은 출시 때 생성하고 명료도를 확인한 정적 파일입니다.

## 플랫폼과 검증된 빌드

| 플랫폼 | 구현 | 검증 내용 |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chromium 반응형 흐름, 오프라인 캐시, 녹음과 평가 |
| Android | Capacitor 8 | API 36.1 에뮬레이터 빌드·설치·녹음 결과·3D·번들 음성 |
| iOS | Capacitor 8 + 네이티브 AVAudioEngine 녹음기 | iPhone 17 Pro 시뮬레이터 빌드·설치·실행, 녹음기 통합 및 내장 Watch 컴파일 완료(실기기 마이크 검증 필요) |
| watchOS | SwiftUI | Apple Watch Series 11(42 mm) 시뮬레이터 빌드·설치·실행 |

## 빌드와 테스트

Node.js 22+와 npm, Android용 Android Studio/JDK 21, Apple 대상 Xcode와 XcodeGen이 필요합니다.

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor는 `dist/`에서 네이티브 웹 번들을 만듭니다. Watch는 의도적으로 작은 독립 SwiftUI 대상입니다. 배포 비밀과 실행 상태는 커밋하지 않으며 [게이트웨이 소스](../ops/landn_gateway.py)는 보호된 파일에서 범위가 좁은 토큰을 읽습니다.

## 교육 과정과 근거

첫 영어 세트는 Pronunciation Snippets의 [“The Difference Between L & N”](https://youtu.be/78RQW1Kq_3A)에 나온 조음 순서와 최소 대립쌍을 따릅니다. 저장소에는 시간표가 있는 요약만 있고 원본 영상, 음성, 전체 자막은 재배포하지 않습니다. 표준중국어와 광둥어 훈련은 독자적인 추가 항목입니다. 홍콩에서 널리 나타나는 /n/→[l] 변이를 결함이나 게으름으로 부르지 않으며 광둥어 대조 훈련은 선택 사항입니다.

세 언어와 여러 기기를 모두 검증하는 대규모 전문가 평가 말뭉치는 아직 없습니다. 실제 정확도를 주장하려면 보류 데이터의 정밀도·재현율, 보정 오차, 지역·기기별 결과와 평가 거부 비율을 공개해야 합니다. 동의 기반 데이터 절차, 음소 CTC/GOP 모델, 접근성 검토 기여를 환영합니다.

## 프로젝트 구조

- `src/`: 교육 과정, 음향 분석, 설명 가능한 평가, 신호 표시, 3D 모델.
- `public/audio/models/`: 포함되고 명료도를 확인한 연습 음성.
- `android/`, `ios/`, `watch/`: 네이티브 래퍼와 SwiftUI Watch 앱.
- `ops/`: 의존성 없는 최소 Whisper 게이트웨이와 테스트.
- `docs/`: 연구, 수업 출처, 시뮬레이터 증거.

## 후원

이 무료 프로젝트가 유용하다면 별표, 이슈, 번역 또는 범위가 명확한 PR이 도움이 됩니다. 후원은 호스팅과 접근성 개선에 사용됩니다.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Stripe 후원](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[GitHub Sponsors](https://github.com/sponsors/lachlanchen)

## 인용과 라이선스

인용 메타데이터는 [`CITATION.cff`](../CITATION.cff)에 있으며 BibTeX는 다음과 같습니다.

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

[MIT License](../LICENSE)로 배포합니다. 생성된 모델 음성은 앱 시연용이며 실제 인물을 사칭하는 데 사용하면 안 됩니다.
