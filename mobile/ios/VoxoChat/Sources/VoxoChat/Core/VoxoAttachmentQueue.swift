import Foundation

/// File des pièces jointes en préparation : compression, validation, upload
/// (`POST /widget/upload`). L'id serveur obtenu est celui qui part dans `attachmentIds` du
/// prochain message.
@MainActor
public final class VoxoAttachmentQueue {
    private let api: VoxoApiClient
    private let config: VoxoConfig
    private let compressor: VoxoImageCompressor
    private let onChanged: () -> Void
    private let onError: (String) -> Void

    public private(set) var maxFiles = VoxoFileRules.maxAttachmentsPerMessage
    public private(set) var maxBytes = VoxoFileRules.maxFileBytes
    private var pending: [VoxoPendingAttachment] = []

    init(
        api: VoxoApiClient,
        config: VoxoConfig,
        compressor: VoxoImageCompressor,
        onChanged: @escaping () -> Void,
        onError: @escaping (String) -> Void
    ) {
        self.api = api
        self.config = config
        self.compressor = compressor
        self.onChanged = onChanged
        self.onError = onError
    }

    public var items: [VoxoPendingAttachment] { pending }
    var uploaded: [VoxoPendingAttachment] { pending.filter { $0.isUploaded } }
    var uploadedIds: [String] { uploaded.compactMap { $0.remoteId } }
    /// Au moins un fichier est encore en cours d'envoi.
    public var isUploading: Bool { pending.contains { !$0.isUploaded && !$0.failed } }
    public var isEmpty: Bool { pending.isEmpty }
    public var remainingSlots: Int { maxFiles - pending.count }

    /// Ajoute des fichiers locaux (chemins). Les erreurs sont signalées, jamais levées.
    public func addAll(_ paths: [String]) async {
        guard !paths.isEmpty else { return }
        let room = remainingSlots
        if room <= 0 {
            onError(VoxoI18n.text(config.locale, "maxAttachmentsError", ["count": maxFiles]))
            return
        }
        if paths.count > room {
            onError(VoxoI18n.text(config.locale, "remainingSlotsError", ["count": room]))
        }
        for path in paths.prefix(room) { await addOne(path) }
    }

    private func addOne(_ path: String) async {
        let prepared = await compressor.compress(path: path)
        let url = URL(fileURLWithPath: prepared)
        guard let size = VoxoFileRules.fileSize(atPath: prepared) else {
            onError(VoxoI18n.text(config.locale, "fileUnreadable"))
            return
        }

        let validation = VoxoFileRules.validate(url.lastPathComponent, sizeBytes: size, maxBytes: maxBytes, locale: config.locale)
        guard validation.isValid, let category = validation.category else {
            onError(validation.error ?? VoxoI18n.text(config.locale, "fileUnreadable"))
            return
        }

        let item = VoxoPendingAttachment(localId: VoxoUUID.v4(), name: url.lastPathComponent, size: size, category: category, path: prepared)
        pending.append(item)
        onChanged()
        await upload(item, url)
    }

    private func upload(_ item: VoxoPendingAttachment, _ url: URL) async {
        do {
            let data = try await api.uploadAttachment(fileURL: url, mimeType: VoxoFileRules.mimeTypeOf(url.lastPathComponent))
            guard let id = data.string("id"), !id.isEmpty else { throw VoxoException.malformedResponse(config.locale) }
            if let index = pending.firstIndex(where: { $0.localId == item.localId }) {
                pending[index].remoteId = id
            }
            onChanged()
        } catch {
            pending.removeAll { $0.localId == item.localId }
            onChanged()
            onError((error as? VoxoException)?.message ?? VoxoI18n.text(config.locale, "network"))
        }
    }

    public func remove(_ localId: String) {
        pending.removeAll { $0.localId == localId }
        onChanged()
    }

    func clear() {
        guard !pending.isEmpty else { return }
        pending.removeAll()
        onChanged()
    }

    /// Les limites annoncées par le serveur font foi sur les constantes locales.
    func applyServerLimits(maxFiles: Int, maxBytes: Int64) {
        self.maxFiles = maxFiles
        self.maxBytes = maxBytes
    }
}
