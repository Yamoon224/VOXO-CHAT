#if canImport(SwiftUI)
import SwiftUI
import UniformTypeIdentifiers

/// Actions plateforme de l'UI fournie : sélection de fichiers et ouverture de liens.
public enum VoxoChatActions {
    /// Types acceptés par le sélecteur, déduits des extensions de `VoxoFileRules`.
    static var allowedContentTypes: [UTType] {
        VoxoFileRules.allowedExtensions.compactMap { UTType(filenameExtension: $0) }
    }

    /// Copie les fichiers choisis dans le cache de l'app (une URL du sélecteur est liée à une
    /// portée de sécurité temporaire) et renvoie des chemins locaux, que la file de pièces
    /// jointes valide. Chaque fichier va dans un sous-dossier unique : deux fichiers de même
    /// nom ne s'écrasent pas, et le nom d'origine reste intact.
    static func copyToCache(_ urls: [URL]) -> [String] {
        urls.compactMap { url in
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                let directory = FileManager.default.temporaryDirectory
                    .appendingPathComponent("voxo-\(VoxoUUID.v4())", isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let name = url.lastPathComponent.isEmpty ? "fichier" : url.lastPathComponent
                let target = directory.appendingPathComponent(name)
                try FileManager.default.copyItem(at: url, to: target)
                return target.path
            } catch {
                return nil
            }
        }
    }

    /// Passe par `VoxoSafeURL` : n'autorise que http(s), mailto et tel. `nil` = lien refusé.
    static func safeURL(_ url: URL) -> URL? {
        VoxoSafeURL.sanitize(url.absoluteString).flatMap(URL.init(string:))
    }
}
#endif
