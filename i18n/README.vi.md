[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

![LazyingArt banner](../docs/images/banner.svg)

# L-and-N

**Huấn luyện viên phát âm nhẹ nhàng, minh bạch để nghe và nói L với N.**

[Mở PWA](https://l-and-n.lazying.art) · [Ghi chú nghiên cứu](../docs/research/pronunciation-assessment.md) · [Bản đồ bài học](../docs/source-lesson.md)

L-and-N biến một cặp âm dễ nhầm thành vòng luyện tập ngắn: nhìn chữ cái hoặc chữ Hán trong từ, nghe mẫu đã thu, xem tín hiệu, ghi âm rồi đọc điểm số có giải thích. Cùng giáo trình chạy dưới dạng PWA có thể cài đặt, ứng dụng Android, iPhone/iPad và bài tập watchOS nhỏ gọn.

![Màn hình luyện tập](../docs/images/pwa-practice.png)

## Tính năng

- Luyện 20 từ tiếng Anh trong mười cặp tối thiểu, cùng bài tập Quan thoại và Quảng Đông nguyên bản.
- Làm nổi chữ cái hoặc chữ Hán mục tiêu và hướng dẫn vị trí lưỡi, luồng khí bằng lời dễ hiểu.
- Âm GPT-SoVITS tiếng Anh và giọng Hoa bản địa được đóng gói sẵn, không cần TTS trực tuyến khi nghe.
- Sóng âm trực tiếp và phổ đoạn đầu giúp thấy im lặng, quá biên và thời điểm; chúng không giả làm thước đo “đúng”.
- Mô hình miệng 3D tương tác cho thấy khí hai bên với L và khí qua mũi với N. Đây là cử động mục tiêu, không tuyên bố tái tạo lưỡi thật từ micro.
- Lần thử và hiệu chỉnh cá nhân thận trọng ở lại thiết bị; thanh điệu tiếng Hoa được chấm riêng với phụ âm.

## Điểm số có thể kiểm tra

Bộ phân tích cục bộ tìm khởi đầu hữu thanh, kiểm tra chất lượng, rồi kết hợp năng lượng mũi dải thấp, đại lượng gần A1–P0, khoảng F1/F2 ước lượng, độ nghiêng phổ, tính liên tục, nhận dạng từ được nhắc và độ phân biệt cặp tối thiểu. Hồ sơ tham chiếu tùy ngôn ngữ và chỉ nhiều bản thu tốt mới điều chỉnh nền cá nhân một cách dè dặt. Bằng chứng yếu hoặc mâu thuẫn sẽ hạ độ tin cậy và yêu cầu thử lại.

Đây là phản hồi luyện tập, không phải chẩn đoán, phán xét giọng hay phép đo được chứng nhận. Sóng âm cho biết thời điểm và quá biên nhưng không chứng minh phụ âm; âm thanh cũng không xác định duy nhất vị trí lưỡi. [Báo cáo nghiên cứu](../docs/research/pronunciation-assessment.md) trình bày phương pháp, giới hạn và nguồn về L/N, GOP/CTC, thanh điệu, phản hồi thị giác và bài toán ngược cấu âm.

## Quyền riêng tư và dịch vụ giọng nói

Đặc trưng âm học, điểm, tiến độ và hiệu chỉnh chạy cục bộ. Trên iOS, một luồng duy nhất của bộ máy âm thanh gốc đồng thời cấp dữ liệu cho dạng sóng, phân tích âm học cục bộ và nhận dạng giọng nói của hệ thống; các phần của ứng dụng không còn tranh giành micrô. PWA được lưu trữ trước tiên dùng tính năng nhận dạng giọng nói tương thích của trình duyệt; trình duyệt hoặc nền tảng có thể xử lý việc nhận dạng đó qua dịch vụ riêng của họ. Chỉ khi không có tính năng nhận dạng giọng nói tương thích trong trình duyệt, một lần thử mới có thể được gửi tạm thời qua cổng cùng nguồn có giới hạn tần suất tới dịch vụ Whisper riêng để đối chiếu từ. Cổng chỉ nhận đúng đường dẫn phiên âm từ nguồn này, giới hạn kích thước và số yêu cầu đồng thời, không ghi nhật ký hay lưu âm thanh và trả về `Cache-Control: no-store`. Ứng dụng vẫn hữu ích khi không có phiên âm.

Trình duyệt không nhận thông tin xác thực LazyEdge và không kết nối thẳng tới mô hình riêng. Mọi mẫu là tệp tĩnh được tạo và kiểm tra độ rõ khi phát hành.

## Nền tảng và bản dựng đã kiểm tra

| Nền tảng | Cách làm | Kiểm tra |
| --- | --- | --- |
| Web/PWA | React 19, TypeScript, Vite, Workbox | Chromium đáp ứng, bộ nhớ đệm ngoại tuyến, ghi âm và chấm điểm |
| Android | Capacitor 8 | Giả lập API 36.1: dựng, cài, kết quả, 3D và âm thanh đóng gói |
| iOS | Capacitor 8 + bộ ghi AVAudioEngine gốc | Giả lập iPhone 17 Pro: dựng, cài và chạy; đã biên dịch tích hợp bộ ghi và Watch nhúng (vẫn cần thử micrô trên thiết bị thật) |
| watchOS | SwiftUI | Giả lập Apple Watch Series 11 (42 mm): dựng, cài và chạy |

## Dựng và kiểm thử

Cần Node.js 22+, npm, Android Studio/JDK 21 cho Android, Xcode và XcodeGen cho Apple.

```bash
npm install
npm run check
npm run dev
npm run cap:sync
cd android && ./gradlew testDebugUnitTest assembleDebug
cd ../watch && xcodegen generate && xcodebuild -project LAndNWatch.xcodeproj -scheme LAndNWatch -sdk watchsimulator build
```

Capacitor tạo gói web gốc từ `dist/`. Bản Watch là mục tiêu SwiftUI độc lập, cố ý nhỏ. Bí mật triển khai và trạng thái chạy bị loại trừ; [mã cổng](../ops/landn_gateway.py) đọc token phạm vi hẹp từ tệp được bảo vệ.

## Giáo trình và bằng chứng

Bộ tiếng Anh đầu tiên theo trình tự cấu âm và các cặp tối thiểu trong [“The Difference Between L & N”](https://youtu.be/78RQW1Kq_3A) của Pronunciation Snippets. Kho chỉ chứa diễn giải có mốc thời gian, không phát lại video, âm thanh hay toàn bộ phụ đề. Quan thoại và Quảng Đông là phần bổ sung nguyên bản. Bài Quảng Đông là tùy chọn: biến thể /n/→[l] phổ biến ở Hồng Kông không bị gọi là lỗi hay “lười”.

Chưa có kho ngữ liệu lớn do chuyên gia đánh giá, trên nhiều thiết bị, xác nhận cả ba biến thể. Muốn công bố độ chính xác thực tế cần đưa ra precision/recall trên dữ liệu giữ lại, sai số hiệu chỉnh, phân tích theo vùng và thiết bị, cùng tỷ lệ hệ thống từ chối chấm. Hoan nghênh quy trình dữ liệu có đồng thuận, mô hình CTC/GOP cấp âm vị và rà soát khả năng tiếp cận.

## Cấu trúc dự án

- `src/`: giáo trình, phân tích âm học, điểm có giải thích, tín hiệu và mô hình 3D.
- `public/audio/models/`: mẫu luyện đóng gói và đã kiểm tra độ rõ.
- `android/`, `ios/`, `watch/`: vỏ ứng dụng gốc và ứng dụng Watch SwiftUI.
- `ops/`: cổng Whisper tối giản không phụ thuộc và kiểm thử.
- `docs/`: nghiên cứu, nguồn bài học và bằng chứng giả lập.

## Hỗ trợ

Nếu dự án miễn phí này hữu ích, một ngôi sao, issue, bản dịch hoặc pull request có phạm vi rõ ràng đều giúp ích. Tài trợ dùng cho máy chủ và khả năng tiếp cận.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [LazyingArt Donate](https://chat.lazying.art/donate) | [paypal.me/RongzhouChen](https://paypal.me/RongzhouChen) | [Ủng hộ qua Stripe](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

[Tài trợ trên GitHub](https://github.com/sponsors/lachlanchen)

## Trích dẫn và giấy phép

Siêu dữ liệu trích dẫn nằm trong [`CITATION.cff`](../CITATION.cff). BibTeX ngắn:

```bibtex
@software{chen2026landn,
  author = {Lachlan Chen},
  title = {L-and-N: a transparent pronunciation coach},
  year = {2026},
  version = {1.0.0},
  url = {https://github.com/lachlanchen/L-and-N}
}
```

Phát hành theo [MIT License](../LICENSE). Âm mẫu tạo ra chỉ để trình diễn ứng dụng, không dùng để mạo danh người thật.
