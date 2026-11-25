#if canImport(SwiftUI)
import SwiftUI

struct VoxoDateSeparator: View {
    let label: String
    let theme: VoxoTheme

    var body: some View {
        HStack {
            Rectangle().fill(theme.border.color).frame(height: 1)
            Text(label).font(.system(size: 11)).foregroundColor(theme.textMuted.color).fixedSize()
            Rectangle().fill(theme.border.color).frame(height: 1)
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}

/// Trois points animés, décalés d'un tiers de cycle.
struct VoxoTypingIndicator: View {
    let theme: VoxoTheme
    let locale: String

    var body: some View {
        TimelineView(.animation) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1.2) / 1.2
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    let p = (phase + Double(index) / 3).truncatingRemainder(dividingBy: 1)
                    Circle()
                        .fill(theme.textMuted.color)
                        .frame(width: 7, height: 7)
                        .opacity(0.35 + 0.65 * (1 - abs(p * 2 - 1)))
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(theme.botBubble.color)
        .clipShape(VoxoBubbleShape(radius: theme.cornerRadius, fromUser: false))
        .accessibilityLabel(VoxoI18n.text(locale, "typingLabel"))
    }
}

/// Réponses rapides proposées sous le dernier message de l'assistant.
struct VoxoQuickReplies: View {
    let suggestions: [String]
    let theme: VoxoTheme
    let onSelected: (String) -> Void

    var body: some View {
        if !suggestions.isEmpty {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 6, alignment: .leading)], alignment: .leading, spacing: 6) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button(action: { onSelected(suggestion) }) {
                        Text(suggestion)
                            .font(.system(size: 13))
                            .foregroundColor(theme.accent.color)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .overlay(Capsule().stroke(theme.accent.color.opacity(0.45), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 2)
            .padding(.bottom, 10)
        }
    }
}

/// Bulle à coin « queue » : en bas à droite pour l'utilisateur, en bas à gauche sinon.
struct VoxoBubbleShape: Shape {
    let radius: Double
    let fromUser: Bool

    func path(in rect: CGRect) -> Path {
        let big = CGFloat(radius), small: CGFloat = 4
        let tl = big, tr = big
        let br = fromUser ? small : big
        let bl = fromUser ? big : small
        var path = Path()
        path.move(to: CGPoint(x: rect.minX + tl, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - tr, y: rect.minY))
        path.addArc(center: CGPoint(x: rect.maxX - tr, y: rect.minY + tr), radius: tr, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - br))
        path.addArc(center: CGPoint(x: rect.maxX - br, y: rect.maxY - br), radius: br, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
        path.addLine(to: CGPoint(x: rect.minX + bl, y: rect.maxY))
        path.addArc(center: CGPoint(x: rect.minX + bl, y: rect.maxY - bl), radius: bl, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + tl))
        path.addArc(center: CGPoint(x: rect.minX + tl, y: rect.minY + tl), radius: tl, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        path.closeSubpath()
        return path
    }
}
#endif
