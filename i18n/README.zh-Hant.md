[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**一款安靜、透明、尊重語言差異的 L/N 發音教練。**

[開啟線上 PWA](https://l-and-n.lazying.art) · [研究說明](../docs/research/pronunciation-assessment.md) · [原課程索引](../docs/source-lesson.md)

L-and-N 把容易混淆的聲音變成短練習循環：看清單詞中的目標字母或漢字，聽錄製好的示範音，觀察訊號，錄下自己的聲音，再閱讀可以解釋的評分。相同課程可安裝成 PWA、Android、iPhone/iPad 應用，亦有精簡的 watchOS 練習版。

![練習畫面](../docs/images/pwa-practice.png)

## 功能

- 英語包含 10 組最小對立、20 個詞，並有原創普通話及廣東話練習。
- 突出目標字母或漢字，以清楚的舌位和氣流提示協助練習。
- 英語 GPT-SoVITS 與原生普通話、廣東話示範音已封裝在應用內，播放不依賴即時語音合成服務。
- 即時波形與起始段頻譜用來發現靜音、削波和發音時機，不偽裝成「正確度動畫」。
- 互動式 3D 口腔模型顯示 L 的舌側氣流與 N 的鼻腔氣流；它是目標動作示意，並非從咪高峰重建使用者的真正舌位。
- 練習記錄與謹慎個人校準保留在裝置；中文聲調和輔音類別分開評分。

## 可查看證據的評分

本機評分器先定位有聲起始段和檢查錄音品質，再綜合低頻鼻音能量、A1–P0 類代理量、近似 F1/F2 距離、頻譜傾斜、連續性、提示詞辨識及最小對立結果。不同語言採用不同參考輪廓，只有多次高品質錄音才會謹慎調整個人基準。證據薄弱或矛盾時會降低信心並建議重錄。

這是練習回饋，不是醫療診斷、口音裁判或認證量測。波形能顯示時機與削波，但不能獨自證明說了哪個輔音；聲音也無法唯一反推出舌頭位置。[研究報告](../docs/research/pronunciation-assessment.md)說明方法、限制與 L/N、GOP/CTC、聲調、視覺回饋及發音反演文獻。

介面把總分拆成可以閱讀的證據，而不是只顯示一個神秘數字。學習者可看到系統聽到哪個詞、最小對立是否保留、起始輔音較像哪一類、錄音品質是否足夠，以及中文音高走勢是否接近目標。每一項都有下次可嘗試的具體動作，例如縮窄舌頭接觸範圍、讓空氣從舌頭兩側流過、保持鼻腔通路，或把咪高峰移遠以避免削波。這種設計讓使用者按照證據練習，也讓系統在資料不足時誠實表示「不確定」。

分數應當協助練習，而不應給學習者貼標籤。每次結果都可展開查看訊號品質和各項聲學證據，也可完全忽略雲端轉寫，只使用離線提示與本機分析。

## 私隱與語音服務

聲學特徵、分數、進度及校準均在本機運行。在 iOS 上，同一條原生音訊引擎資料流同時供波形、本機聲學分析及系統語音辨識使用，應用內部不會再爭用咪高峰。託管的 PWA 會先使用相容的瀏覽器語音辨識；瀏覽器或平台可能透過自己的服務處理該辨識。僅在沒有相容的瀏覽器語音辨識時，才可能把單次嘗試暫時傳送到同源、限速的閘道，再由私有 Whisper 服務核對單詞。閘道只接受來自此來源的精確轉寫路徑，限制檔案大小和並發數，不記錄或儲存音訊，並回傳 `Cache-Control: no-store`。沒有轉寫時，應用仍然可用。

錄音流程採用單一狀態鎖，防止快速連按建立重複工作階段；音訊啟動失敗、頁面進入背景、錄音結束或處理逾時時都會關閉音軌與音訊上下文。只有偵測到足夠長而且清晰的真實語音才會進入評分。靜音、空白錄音及無法解碼的錄音會顯示具體的重試提示，不再以看似合理的佔位聲學資料產生誤導分數。

公共瀏覽器不會取得 LazyEdge 憑據，亦不能直接連接私有模型。所有示範音都是發布時產生並檢查可懂度的靜態資源。

## 平台及已驗證構建

| 平台 | 實作 | 已驗證內容 |
| --- | --- | --- |
| Web/PWA | React 19、TypeScript、Vite、Workbox | 響應式 Chromium、離線快取、錄音及評分流程 |
| Android | Capacitor 8 | API 36.1 模擬器構建、安裝、錄音結果、3D 模型、離線示範音 |
| iOS | Capacitor 8 + 原生 AVAudioEngine 錄音器 | iPhone 17 Pro 模擬器構建、安裝、啟動；錄音器整合及內嵌 Watch 已通過編譯（仍需真機咪高峰驗證） |
| watchOS | SwiftUI | Apple Watch Series 11（42 mm）模擬器構建、安裝、啟動 |

## 構建與測試

需要 Node.js 22+、npm；Android 需要 Android Studio/JDK 21；Apple 平台需要 Xcode 和 XcodeGen。

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor 從 `dist/` 產生原生 Web 套件。手錶是刻意精簡的獨立 SwiftUI 目標。部署密鑰與運行資料不會進入倉庫；[閘道源碼](../ops/landn_gateway.py)只從受保護檔案讀取短權限語音權杖。

## 課程與證據

首套英語內容跟隨 Pronunciation Snippets 的 [“The Difference Between L & N”](https://youtu.be/78RQW1Kq_3A) 發音教學順序及最小對立。倉庫只保留有時間點的改寫摘要，不複製原影片、音訊或完整字幕。普通話與廣東話練習是原創延伸。廣東話對立練習明確屬自選內容：香港常見的 /n/→[l] 變化不被標為「錯誤」或「懶音」。

目前沒有大型、專家標註、跨裝置語料能驗證本版本的三種語言。若要宣稱生產級準確率，必須公布留出集精確率/召回率、校準誤差、地域和裝置分項，以及系統拒絕評分的比例。歡迎貢獻經同意的資料規範、音素級 CTC/GOP 模型及無障礙審查。

## 專案結構

- `src/`：課程、聲學分析、可解釋評分、訊號顯示和 3D 模型。
- `public/audio/models/`：封裝並檢查可懂度的練習示範音。
- `android/`、`ios/`、`watch/`：原生包裝及 SwiftUI 手錶應用。
- `ops/`：最小化、無第三方依賴的 Whisper 閘道與測試。
- `docs/`：研究、課程來源及模擬器證據。

## 支持

如果這個免費專案對你有幫助，歡迎加星、提交問題、改善翻譯或提出範圍清楚的合併請求。資助會用於託管及無障礙改進。

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt 捐助](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [透過 Stripe 支持](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[在 GitHub Sponsors 支持](https://github.com/sponsors/lachlanchen)

## 引用與授權

引用資料見 [`CITATION.cff`](../CITATION.cff)，亦可使用以下 BibTeX：

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

專案採用 [MIT License](../LICENSE)。產生的示範音只作應用展示，請勿用作冒充真人。
