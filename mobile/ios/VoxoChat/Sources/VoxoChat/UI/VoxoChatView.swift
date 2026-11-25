#if canImport(SwiftUI)
import SwiftUI

/// Écran de chat prêt à l'emploi, construit sur le core : il n'appelle jamais le réseau
/// lui-même. `theme` nil = dérivé de la config distante (et du mode sombre du système si le
/// propriétaire n'a rien forcé).
@MainActor
public struct VoxoChatView: View {
    private let controller: VoxoController
    private let customTheme: VoxoTheme?
    private let onClose: (() -> Void)?

    @StateObject private var observer: VoxoStateObserver
    @Environment(\.colorScheme) private var colorScheme
    @State private var showRating = false
    @State private var showHistory = false
    @State private var showPicker = false
    @State private var toast: String?

    public init(controller: VoxoController, theme: VoxoTheme? = nil, onClose: (() -> Void)? = nil) {
        self.controller = controller
        self.customTheme = theme
        self.onClose = onClose
        _observer = StateObject(wrappedValue: VoxoStateObserver(controller))
    }

    private var ui: VoxoUiState { observer.state }

    private var theme: VoxoTheme {
        customTheme ?? VoxoTheme.fromConfig(ui.chatbot, systemDark: colorScheme == .dark)
    }

    public var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                header
                content
                composer
            }
            .background(theme.surface.color.ignoresSafeArea())
            if let toast { toastView(toast) }
            if showHistory {
                VoxoHistoryScreen(controller: controller, chatbot: ui.chatbot, locale: ui.locale, theme: theme) { showHistory = false }
                    .transition(.move(edge: .trailing))
            }
        }
        // `start` est idempotent : un second écran sur le même controller ne relance rien.
        .task { await controller.start() }
        .onAppear { controller.setOpen(true) }
        .onDisappear { controller.setOpen(false) }
        .onChange(of: ui.lastError) { error in
            guard let error else { return }
            controller.clearError()
            show(error)
        }
        .environment(\.openURL, OpenURLAction { url in
            guard VoxoChatActions.safeURL(url) != nil else {
                controller.reportError(VoxoI18n.text(ui.locale, "linkOpenFailed"))
                return .handled
            }
            return .systemAction
        })
        .sheet(isPresented: $showRating) { ratingSheet }
        .fileImporter(isPresented: $showPicker, allowedContentTypes: VoxoChatActions.allowedContentTypes, allowsMultipleSelection: true) { result in
            guard case .success(let urls) = result else {
                if case .failure = result { controller.reportError(VoxoI18n.text(ui.locale, "filePickerUnavailable")) }
                return
            }
            let room = max(controller.attachments.remainingSlots, 0)
            let paths = VoxoChatActions.copyToCache(Array(urls.prefix(room)))
            Task { await controller.attachments.addAll(paths) }
        }
    }

    private var header: some View {
        VoxoChatHeader(
            config: ui.chatbot, connectivity: ui.connectivity, handoff: ui.handoff, canRate: ui.canRate,
            locale: ui.locale, theme: theme,
            onRate: { showRating = true },
            onNewConversation: { Task { await controller.startNewSession() } },
            onHistory: { showHistory = true },
            onClose: onClose,
            onLocaleChange: controller.config.options.showLanguageSwitcher ? { controller.setLocale($0) } : nil)
    }

    @ViewBuilder private var content: some View {
        // Avant l'arrivée de la config, un fil vide ferait clignoter le thème par défaut.
        if !ui.isReady && ui.messages.isEmpty {
            ProgressView().tint(theme.accent.color).frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            VoxoMessageList(
                messages: ui.messages, features: ui.chatbot.features, markdown: ui.chatbot.enableMarkdown,
                isTyping: ui.isLoading && controller.config.options.enableTyping,
                agentName: ui.handoff.agentName, locale: ui.locale, theme: theme,
                onSuggestion: { text in Task { await controller.sendMessage(text) } },
                onFeedback: { message, value in Task { await controller.submitFeedback(message, value) } },
                onRetry: { id in Task { await controller.retry(id) } })
        }
    }

    private var composer: some View {
        VoxoComposerBar(
            pending: ui.pendingAttachments, maxFiles: ui.chatbot.maxAttachments, isSending: ui.isLoading,
            attachmentsEnabled: ui.chatbot.features.attachments, locale: ui.locale, theme: theme,
            onSend: { text in Task { await controller.sendMessage(text) } },
            onPickFiles: { showPicker = true },
            onRemoveAttachment: { controller.attachments.remove($0) },
            onActivity: { controller.notifyUserActivity() },
            onTyping: { controller.notifyTyping($0) })
    }

    private var ratingSheet: some View {
        VoxoRatingSheet(
            locale: ui.locale, theme: theme,
            onCancel: { showRating = false },
            onSubmit: { rating, comment in
                showRating = false
                Task {
                    if await controller.endConversation(rating: rating, comment: comment) {
                        show(VoxoI18n.text(ui.locale, "ratingThanks"))
                    }
                }
            })
    }

    private func toastView(_ message: String) -> some View {
        Text(message).font(.system(size: 14)).foregroundColor(.white)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(Color.black.opacity(0.85)).clipShape(Capsule())
            .padding(.bottom, 90)
            .transition(.opacity)
            .accessibilityAddTraits(.isStaticText)
    }

    private func show(_ message: String) {
        withAnimation { toast = message }
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            withAnimation { if toast == message { toast = nil } }
        }
    }
}
#endif
