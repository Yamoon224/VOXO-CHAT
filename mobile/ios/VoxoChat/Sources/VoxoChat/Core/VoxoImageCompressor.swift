import Foundation
#if canImport(ImageIO) && canImport(CoreGraphics)
import ImageIO
import CoreGraphics
#endif

/// Prépare une image avant envoi. Abstrait pour être remplacé en test.
public protocol VoxoImageCompressor {
    /// Renvoie le chemin à envoyer : celui d'origine si la compression ne gagne rien ou échoue.
    func compress(path: String) async -> String
}

/// Pas de compression : pour les tests, ou un intégrateur qui compresse lui-même.
public struct VoxoNoCompression: VoxoImageCompressor {
    public init() {}
    public func compress(path: String) async -> String { path }
}

#if canImport(ImageIO) && canImport(CoreGraphics)
/// 2 048 px sur le plus grand côté, qualité 0,82. ImageIO sait lire le WebP mais pas
/// l'écrire : on suit le repli JPEG prévu par `mobile/CONTRACT.md`. Le fichier d'origine
/// est conservé si le résultat n'est pas plus léger.
public struct VoxoImageIOCompressor: VoxoImageCompressor {
    private static let maxDimension = 2048
    private static let quality = 0.82
    private static let compressible: Set<String> = [".jpg", ".jpeg", ".png", ".webp"]

    public init() {}

    public func compress(path: String) async -> String {
        guard Self.compressible.contains(VoxoFileRules.extensionOf(path)) else { return path }
        let source = URL(fileURLWithPath: path)
        guard let imageSource = CGImageSourceCreateWithURL(source as CFURL, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, [
                  kCGImageSourceCreateThumbnailFromImageAlways: true,
                  kCGImageSourceCreateThumbnailWithTransform: true,
                  kCGImageSourceThumbnailMaxPixelSize: Self.maxDimension,
              ] as CFDictionary) else { return path }

        let target = FileManager.default.temporaryDirectory
            .appendingPathComponent("voxo-\(VoxoUUID.v4())", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: target, withIntermediateDirectories: true)
        } catch { return path }
        // Même nom de base que l'original : c'est lui qui s'affiche et part au serveur.
        let output = target.appendingPathComponent(source.deletingPathExtension().lastPathComponent + ".jpg")

        guard let destination = CGImageDestinationCreateWithURL(output as CFURL, "public.jpeg" as CFString, 1, nil) else { return path }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: Self.quality] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { return path }

        let originalSize = VoxoFileRules.fileSize(atPath: path)
        let newSize = VoxoFileRules.fileSize(atPath: output.path)
        guard let originalSize, let newSize, newSize < originalSize else {
            try? FileManager.default.removeItem(at: target)
            return path
        }
        return output.path
    }
}
#endif
