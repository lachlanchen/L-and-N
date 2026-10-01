[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://github.com/lachlanchen/lachlanchen/blob/main/figs/banner.png)

[![PWA](https://img.shields.io/badge/PWA-L_%26_N-13A99B?style=for-the-badge)](https://l-and-n.lazying.art) [![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

# L-and-N

**L と N を聞き分け、発音するための、穏やかで根拠が見える発音コーチです。**

[PWA を開く](https://l-and-n.lazying.art) · [研究ノート](../docs/research/pronunciation-assessment.md) · [元レッスン対応表](../docs/source-lesson.md)

[App Store — 0.99米ドル](https://apps.apple.com/us/app/l-n-speech-practice/id6808872450) · [Google Play — ダウンロード無料・アプリ内購入あり](https://play.google.com/store/apps/details?id=art.lazying.landn) · [公式リンク](../docs/public-links.md)

L-and-N は、難しい音の対立を短い練習サイクルにします。単語中の文字や漢字を見て、収録済みの手本を聞き、信号を確認し、自分の声を録音して、説明付きの結果を読みます。同じ教材をインストール可能な PWA、Android、iPhone/iPad、コンパクトな watchOS ドリルで利用できます。

![練習画面](../docs/images/pwa-practice.png)

<p align="center"><a href="https://apps.apple.com/us/app/l-n-speech-practice/id6808872450"><img src="../docs/images/store-app-store.png" width="48%" alt="L &amp; N: Speech Practice on the App Store"></a> <a href="https://play.google.com/store/apps/details?id=art.lazying.landn"><img src="../docs/images/store-google-play.png" width="48%" alt="L &amp; N: Speech Practice on Google Play"></a></p>

## 12の表示言語、3つの練習言語

現在のソースは、下記のプロフィールの11言語に加え、広東語のUIにも対応します。メニュー、学習原理、モデルのラベル、評価の説明、プライバシー・購入メッセージ、全118語の意味を翻訳しています。追加8言語では、声調や語末に応じた簡潔なL/Nの指導を表示します。表示言語を変えても練習語、音声、採点は変わりません。アラビア語は右から左のレイアウトです。ネイティブ版の公開状況はリリース記録を参照してください。独立したWatch版の言語拡張はこの変更に含みません。

English · العربية · Español · Français · 日本語 · 한국어 · Tiếng Việt · 简体中文 · 繁體中文 · Deutsch · Русский · 廣東話

[12の表示言語、3つの練習言語](../docs/LOCALIZATION.md)

## アプリを見る

English · 中文

<video src="https://github.com/user-attachments/assets/036ebbdf-ab34-4761-875e-46470074aff8" controls width="320"></video>

<video src="https://github.com/user-attachments/assets/f13a2ea0-ca16-4d40-8f3b-478e5b5e7792" controls width="320"></video>

## できること

- 最小対立59組：英語16組、普通話22組、広東語21組。意味と指導を各表示言語で提供します。
- 対象文字や漢字を強調し、舌の位置と空気の流れを平易な言葉で示します。
- 英語 GPT-SoVITS と中国語ネイティブ音声をアプリに同梱し、再生時にオンライン TTS は不要です。
- ライブ波形と開始部スペクトルは無音、クリッピング、タイミングを確認するためのものです。見栄えだけの正答メーターにはしません。
- 対話型 3D 口腔断面は L の側面気流と N の鼻腔気流を示します。目標動作の模型であり、マイクから学習者の舌を復元するものではありません。
- 記録と慎重な個人較正は端末内に保存し、中国語の声調は子音と別に採点します。

## 根拠を確認できるスコア

認識器が発話した語を判定し、対立語を認識した場合は点数を制限して理由を示します。分析器は有声開始点と録音品質を確認し、小さな端末内ネットワーク（約9千パラメータ）で最初の300 msが側音か鼻音かを推定します。講義録音の /l/・/n/ の開始部1万1千件超で学習し、学習に使わない録音で約89%を示しました。以前のスペクトル指標は微調整にだけ使い、弱い・矛盾する証拠では信頼度を下げます。すべての端末・アクセントで検証済みの精度ではありません。 [モデルの詳細](../docs/research/onset-model.md).

これは練習用フィードバックであり、診断、訛りの判定、認証された測定ではありません。波形だけでは子音を確定できず、音声から舌位置を一意に逆算することもできません。[研究レポート](../docs/research/pronunciation-assessment.md)に L/N、GOP/CTC、声調、視覚フィードバック、調音逆推定の根拠と限界をまとめています。

## プライバシーと音声サービス

音響特徴、点数、進捗、較正はローカルで処理します。iOS では、単一のネイティブ音声エンジンのストリームを波形、ローカル音響分析、OS の音声認識で共有し、アプリ自身がマイクを奪い合わない構成です。ホスト版 PWA は通常、まず互換性のあるブラウザー音声認識を試します。その認識は、ブラウザーまたはプラットフォームが独自のサービスで処理する場合があります。iPhone と iPad の Web 版では、波形と録音処理がマイクを奪い合わないよう一つのストリームだけを録音し、停止後に同じ短い音声を転写します。ブラウザー認識が利用できない、失敗する、または文字を返さない場合、試行を同一オリジンの速度制限付きゲートウェイから非公開 Whisper サービスへ一時送信することがあります。ゲートウェイはこのオリジンからの正確な転写ルートだけを受け付け、サイズと同時数を制限し、音声を記録・保存せず、`Cache-Control: no-store` を返します。転写できない場合も波形は残りますが、点数は表示も保存もしません。

公開ブラウザーへ LazyEdge 資格情報は渡らず、非公開モデルへ直接接続もしません。全手本はリリース時に生成し、明瞭さを確認した静的資産です。

## 対応プラットフォームと検証

| プラットフォーム | 実装 | 検証内容 |
| --- | --- | --- |
| Web/PWA | React 19、TypeScript、Vite、Workbox | Chromium、オフラインキャッシュ、録音・採点フロー |
| Android | Capacitor 8 | API 36.1 エミュレーターでビルド、導入、録音結果、3D、同梱音声 |
| iOS | Capacitor 8 + ネイティブ AVAudioEngine レコーダー | iPhone 17 Pro シミュレーターでビルド、導入、起動。レコーダー統合と内蔵 Watch もコンパイル済み（実機マイク試験は未実施） |
| watchOS | SwiftUI | Apple Watch Series 11（42 mm）シミュレーターでビルド、導入、起動 |

## ビルドとテスト

Node.js 22+ と npm、Android には Android Studio/JDK 21、Apple 向けには Xcode と XcodeGen が必要です。

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor は `dist/` からネイティブ Web バンドルを作成します。Watch は小さく保った独立 SwiftUI ターゲットです。秘密情報と実行状態はコミットしません。[ゲートウェイ](../ops/landn_gateway.py)は保護ファイルから限定トークンを読みます。

## 教材と根拠

最初の英語セットは Pronunciation Snippets の [“The Difference Between L & N”](https://youtu.be/78RQW1Kq_3A) の調音説明とミニマルペアの順序に基づきます。リポジトリには時刻付きの言い換えだけを置き、動画、音声、字幕全文は再配布しません。普通話と広東語は独自追加です。香港で広く見られる /n/→[l] の変異を誤りや「怠惰」とせず、広東語の対立練習は任意と明記します。

3 言語と複数端末を網羅する大規模な専門家評価コーパスはまだありません。実運用精度を主張するには、保留データの適合率・再現率、較正誤差、地域・端末別結果、採点を辞退する割合の公開が必要です。同意に基づくデータ手順、音素 CTC/GOP、アクセシビリティレビューを歓迎します。

## プロジェクト構成

- `src/`：教材、音響解析、説明可能な採点、信号表示、3D 模型。
- `public/audio/models/`：同梱され、明瞭さを確認した手本。
- `android/`、`ios/`、`watch/`：ネイティブラッパーと SwiftUI Watch アプリ。
- `ops/`：依存なしの小さな Whisper ゲートウェイとテスト。
- `docs/`：研究、教材出典、シミュレーター証拠。

## 支援

無料プロジェクトが役立った場合は、スター、課題報告、翻訳、範囲を絞った PR が助けになります。資金はホスティングとアクセシビリティ改善に使います。

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

## 引用とライセンス

引用情報は [`CITATION.cff`](../CITATION.cff) にあります。BibTeX：

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

[MIT License](../LICENSE) で公開します。生成された手本音声はアプリ実演用であり、実在人物のなりすましに使用しないでください。
