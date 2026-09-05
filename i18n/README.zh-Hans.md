[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**一款安静、透明、尊重语言差异的 L/N 发音教练。**

[打开在线 PWA](https://l-and-n.lazying.art) · [研究说明](../docs/research/pronunciation-assessment.md) · [原课程索引](../docs/source-lesson.md)

L-and-N 把容易混淆的声音变成一个短练习循环：看清单词中的目标字母或汉字，听录制好的范音，观察信号，录下自己的声音，再阅读可以解释的评分。相同课程可以安装为 PWA、Android、iPhone/iPad 应用，也有精简的 watchOS 练习版。

![练习界面](../docs/images/pwa-practice.png)

## 功能

- 英语含 10 组最小对立、20 个词，并有原创普通话和粤语练习。
- 突出目标字母或汉字，用清楚的舌位和气流提示帮助练习。
- 英语 GPT-SoVITS 与原生普通话、粤语范音已打包在应用中，播放不依赖在线语音合成服务。
- 实时波形和起始段频谱用于发现静音、削波和发音时机，不伪装成“正确度动画”。
- 交互式 3D 口腔模型显示 L 的舌侧气流和 N 的鼻腔气流。它是目标动作示意图，并不会声称从麦克风重建用户的真实舌位。
- 尝试记录和谨慎的个人校准保留在本机；汉语声调与辅音类别分开评分。

## 可以查看证据的评分

本地评分器先定位有声起始段、检查录音质量，再综合低频鼻音能量、A1–P0 风格代理量、近似 F1/F2 间距、频谱倾斜、连续性、提示词识别和最小对立结果。不同语言使用不同参考轮廓，只有多次高质量录音才会谨慎调整个人基准。证据弱或互相矛盾时，置信度会降低，并建议重新录制。

这只是练习反馈，不是医疗诊断、口音裁判或认证测量。波形能显示时机和削波，却不能单独证明说了哪个辅音；声音也无法唯一反推出舌头的位置。[研究报告](../docs/research/pronunciation-assessment.md)说明了方法、局限以及 L/N、GOP/CTC、声调、视觉反馈和发音反演的来源。

界面把总分拆成可读证据，而不是只显示一个神秘数字。学习者可以看到系统听到了哪个词、最小对立是否保留、起始辅音更像哪一类、录音质量是否足够，以及中文音高走势是否接近目标。每一项都配有下一次可以尝试的动作，例如缩短舌头接触范围、让空气从舌头两侧通过、保持鼻腔通路，或把麦克风移远一点以避免削波。这样的设计帮助用户根据证据练习，也让系统在不确定时诚实地说“不确定”。

分数应当帮助练习，而不应给学习者贴标签。

每次结果都可展开查看各项证据，也可以完全关闭云端转写。

## 隐私和语音服务

声学特征、分数、进度和校准均在本地运行。安装版会在操作系统支持时使用原生语音识别。托管 PWA 可把一次录音临时发送到同源、限速的网关，再由私有 Whisper 服务核对单词。网关只接受本站的准确转写路径，限制文件大小和并发，不记录或保存音频，并返回 `Cache-Control: no-store`。转写不可用时，练习仍可继续。

公共浏览器不会取得 LazyEdge 凭据，也不能直连私有模型。所有范音都是发布时生成并检查可懂度的静态资源。

## 平台和已验证构建

| 平台 | 实现 | 已验证内容 |
| --- | --- | --- |
| Web/PWA | React 19、TypeScript、Vite、Workbox | 响应式 Chromium、离线缓存、录音与评分流程 |
| Android | Capacitor 8 | API 36.1 模拟器构建、安装、录音结果、3D 模型、离线范音 |
| iOS | Capacitor 8 | macOS 上 iPhone 17 Pro 模拟器构建、安装、启动 |
| watchOS | SwiftUI | Apple Watch Series 11（42 mm）模拟器构建、安装、启动 |

## 构建和测试

需要 Node.js 22+、npm；Android 需要 Android Studio/JDK 21；Apple 平台需要 Xcode 和 XcodeGen。

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor 从 `dist/` 生成原生 Web 包。手表是刻意保持精简的独立 SwiftUI 目标。部署密钥和运行数据不会进入仓库；[网关源代码](../ops/landn_gateway.py)只从受保护文件读取短权限语音令牌。

## 课程和证据

首套英语内容按照 Pronunciation Snippets 的 [“The Difference Between L & N”](https://youtu.be/78RQW1Kq_3A) 中的发音教学顺序和最小对立设计。仓库仅保存带时间点的改写摘要，不复制原视频、音频或完整字幕。普通话和粤语练习是原创扩展。粤语对立练习明确为可选内容：香港常见的 /n/→[l] 变化不被标成“错误”或“懒音”。

目前没有大型、专家标注、跨设备语料能够验证本版本的三种语言。若要宣称生产级准确率，必须公布留出集精确率/召回率、校准误差、地区与设备分项，以及系统拒绝评分的比例。欢迎贡献经同意的数据规范、音素级 CTC/GOP 模型和无障碍审查。

## 项目结构

- `src/`：课程、声学分析、可解释评分、信号显示和 3D 模型。
- `public/audio/models/`：已打包并检查可懂度的练习范音。
- `android/`、`ios/`、`watch/`：原生封装和 SwiftUI 手表应用。
- `ops/`：最小化、无第三方依赖的 Whisper 网关和测试。
- `docs/`：研究、课程来源和模拟器证据。

## 支持

如果这个免费项目对你有帮助，欢迎加星、提交问题、改进翻译或发起范围清楚的合并请求。资金支持会用于托管和无障碍改进。

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt 捐助](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [通过 Stripe 支持](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[在 GitHub Sponsor 支持](https://github.com/sponsors/lachlanchen)

## 引用和许可

引用元数据见 [`CITATION.cff`](../CITATION.cff)，也可使用以下 BibTeX：

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

项目采用 [MIT License](../LICENSE)。生成的范音仅作为应用演示资源，请勿用于冒充真人。
