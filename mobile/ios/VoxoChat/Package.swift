// swift-tools-version:5.9
import PackageDescription

// Un seul module, deux couches séparées par dossier : `Core/` + `Models/` (Foundation
// pur, aucune dépendance à l'UI) et `UI/` (SwiftUI, entièrement sous
// `#if canImport(SwiftUI)`). Le core se compile et se teste donc sans plateforme Apple.
let package = Package(
    name: "VoxoChat",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "VoxoChat", targets: ["VoxoChat"]),
    ],
    targets: [
        .target(name: "VoxoChat", path: "Sources/VoxoChat"),
        .testTarget(name: "VoxoChatTests", dependencies: ["VoxoChat"], path: "Tests/VoxoChatTests"),
    ]
)
