import Foundation

/// Couleur RGBA en composantes 0…1. Pure (sans SwiftUI) pour rester testable ; l'UI la
/// convertit en `Color`.
public struct VoxoRGBA: Equatable {
    public var red: Double
    public var green: Double
    public var blue: Double
    public var alpha: Double

    public init(_ red: Double, _ green: Double, _ blue: Double, _ alpha: Double = 1) {
        self.red = red
        self.green = green
        self.blue = blue
        self.alpha = alpha
    }

    public init(hex: UInt32) {
        self.init(Double((hex >> 16) & 0xff) / 255, Double((hex >> 8) & 0xff) / 255, Double(hex & 0xff) / 255)
    }

    public static let white = VoxoRGBA(1, 1, 1)

    /// Luminance relative (WCAG), pour choisir un texte lisible sur un fond.
    var luminance: Double {
        func linear(_ c: Double) -> Double { c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4) }
        return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
    }

    func mixed(with other: VoxoRGBA, amount: Double) -> VoxoRGBA {
        let t = min(max(amount, 0), 1)
        return VoxoRGBA(red + (other.red - red) * t, green + (other.green - green) * t, blue + (other.blue - blue) * t)
    }
}

/// Couleurs lues depuis la config distante (`#rgb`, `#rrggbb`, `#aarrggbb`).
enum VoxoColor {
    static func parse(_ value: String?) -> VoxoRGBA? {
        var input = value?.trimmingCharacters(in: .whitespaces) ?? ""
        if input.hasPrefix("#") { input.removeFirst() }
        let normalized: String
        switch input.count {
        case 3: normalized = "ff" + input.map { "\($0)\($0)" }.joined()
        case 6: normalized = "ff" + input
        case 8: normalized = input
        default: return nil
        }
        guard let argb = UInt32(normalized, radix: 16) else { return nil }
        return VoxoRGBA(
            Double((argb >> 16) & 0xff) / 255, Double((argb >> 8) & 0xff) / 255,
            Double(argb & 0xff) / 255, Double((argb >> 24) & 0xff) / 255)
    }

    static func parseOr(_ value: String?, _ fallback: VoxoRGBA) -> VoxoRGBA { parse(value) ?? fallback }

    static func onColor(_ background: VoxoRGBA) -> VoxoRGBA {
        background.luminance > 0.5 ? VoxoRGBA(hex: 0x111827) : .white
    }
}

/// Palette de l'écran de chat. Dérivée de la config distante par défaut ; une app hôte
/// peut en fournir une sur mesure à `VoxoChatView`.
public struct VoxoTheme: Equatable {
    public var accent: VoxoRGBA
    public var onAccent: VoxoRGBA
    public var surface: VoxoRGBA
    public var surfaceMuted: VoxoRGBA
    public var border: VoxoRGBA
    public var text: VoxoRGBA
    public var textMuted: VoxoRGBA
    public var userBubble: VoxoRGBA
    public var onUserBubble: VoxoRGBA
    public var botBubble: VoxoRGBA
    public var onBotBubble: VoxoRGBA
    /// Teinte d'accent très diluée : distingue un conseiller humain de l'assistant.
    public var agentBubble: VoxoRGBA
    public var danger: VoxoRGBA
    public var isDark: Bool
    public var cornerRadius: Double = 16

    private static let defaultAccent = VoxoRGBA(hex: 0x3b82f6)

    /// `systemDark` sert quand le propriétaire n'a pas forcé de mode.
    public static func fromConfig(_ config: VoxoChatbotConfig, systemDark: Bool = false) -> VoxoTheme {
        let accent = VoxoColor.parseOr(config.primaryColor, defaultAccent)
        let dark: Bool
        switch config.colorScheme {
        case "dark": dark = true
        case "light": dark = false
        default: dark = systemDark
        }
        return dark ? makeDark(accent) : makeLight(accent, config)
    }

    private static func makeLight(_ accent: VoxoRGBA, _ config: VoxoChatbotConfig) -> VoxoTheme {
        VoxoTheme(
            accent: accent, onAccent: VoxoColor.onColor(accent),
            surface: .white, surfaceMuted: VoxoRGBA(hex: 0xf3f4f6), border: VoxoRGBA(hex: 0xe5e7eb),
            text: VoxoColor.parseOr(config.textColor, VoxoRGBA(hex: 0x111827)), textMuted: VoxoRGBA(hex: 0x6b7280),
            userBubble: accent, onUserBubble: VoxoColor.onColor(accent),
            botBubble: VoxoRGBA(hex: 0xf3f4f6), onBotBubble: VoxoRGBA(hex: 0x111827),
            agentBubble: accent.mixed(with: .white, amount: 0.88),
            danger: VoxoRGBA(hex: 0xdc2626), isDark: false)
    }

    private static func makeDark(_ accent: VoxoRGBA) -> VoxoTheme {
        let surface = VoxoRGBA(hex: 0x111827)
        return VoxoTheme(
            accent: accent, onAccent: VoxoColor.onColor(accent),
            surface: surface, surfaceMuted: VoxoRGBA(hex: 0x1f2937), border: VoxoRGBA(hex: 0x374151),
            text: VoxoRGBA(hex: 0xf9fafb), textMuted: VoxoRGBA(hex: 0x9ca3af),
            userBubble: accent, onUserBubble: VoxoColor.onColor(accent),
            botBubble: VoxoRGBA(hex: 0x1f2937), onBotBubble: VoxoRGBA(hex: 0xf9fafb),
            agentBubble: accent.mixed(with: surface, amount: 0.75),
            danger: VoxoRGBA(hex: 0xf87171), isDark: true)
    }
}
