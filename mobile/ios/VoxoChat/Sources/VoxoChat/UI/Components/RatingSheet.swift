#if canImport(SwiftUI)
import SwiftUI

/// Note 1-5 et commentaire facultatif. Une note à zéro n'est jamais envoyée : le backend la refuse.
struct VoxoRatingSheet: View {
    let locale: String
    let theme: VoxoTheme
    let onCancel: () -> Void
    let onSubmit: (_ rating: Int, _ comment: String) -> Void

    @State private var rating = 0
    @State private var comment = ""
    @State private var showError = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(VoxoI18n.text(locale, "ratingTitle"))
                .font(.system(size: 17, weight: .semibold)).foregroundColor(theme.text.color)

            HStack(spacing: 2) {
                ForEach(1...5, id: \.self) { value in
                    Button(action: { rating = value; showError = false }) {
                        Text(value <= rating ? "★" : "☆").font(.system(size: 30))
                            .foregroundColor(value <= rating ? theme.accent.color : theme.textMuted.color)
                            .frame(minWidth: 44, minHeight: 44)
                    }
                    .accessibilityLabel(VoxoI18n.text(locale, "ratingValue", ["count": value]))
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(VoxoI18n.text(locale, "ratingGroup"))

            if showError {
                Text(VoxoI18n.text(locale, "ratingRequired")).font(.system(size: 12)).foregroundColor(theme.danger.color)
            }

            TextEditor(text: $comment)
                .frame(minHeight: 90)
                .padding(6)
                .background(theme.surfaceMuted.color)
                .cornerRadius(12)
                .onChange(of: comment) { value in
                    if value.count > VoxoLimits.maxFeedbackLength { comment = String(value.prefix(VoxoLimits.maxFeedbackLength)) }
                }
            Text("\(comment.count)/\(VoxoLimits.maxFeedbackLength)").font(.system(size: 11)).foregroundColor(theme.textMuted.color)

            HStack(spacing: 8) {
                Button(VoxoI18n.text(locale, "cancel"), action: onCancel)
                    .foregroundColor(theme.textMuted.color).frame(maxWidth: .infinity)
                Button(action: {
                    if rating == 0 { showError = true } else { onSubmit(rating, comment.trimmingCharacters(in: .whitespacesAndNewlines)) }
                }) {
                    Text(VoxoI18n.text(locale, "send")).fontWeight(.semibold).foregroundColor(theme.onAccent.color)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(theme.accent.color).clipShape(Capsule())
                }
            }
        }
        .padding(20)
        .background(theme.surface.color.ignoresSafeArea())
    }
}
#endif
