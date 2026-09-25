// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LAndNAudio",
    platforms: [.macOS(.v12)],
    products: [.library(name: "LAndNAudio", targets: ["LAndNAudio"])],
    targets: [
        .target(name: "LAndNAudio"),
        .testTarget(name: "LAndNAudioTests", dependencies: ["LAndNAudio"])
    ]
)
