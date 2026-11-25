#if canImport(SwiftUI)
import SwiftUI

/// Rendu natif d'un sous-ensemble de Markdown (gras, italique, code, liens, listes, blocs de
/// code). Les liens ne sont posés que s'ils ont passé `VoxoSafeURL` ; leur ouverture passe
/// par l'`openURL` de l'environnement, que l'écran de chat détourne pour signaler un échec.
struct VoxoMarkdownView: View {
    let text: String
    let color: Color
    let linkColor: Color
    let codeBackground: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(VoxoBlockParser.parse(text).enumerated()), id: \.offset) { _, block in
                if block.isCode {
                    codeBlock(block.lines.joined(separator: "\n"))
                } else if block.isList {
                    list(block)
                } else {
                    inline(block.lines.joined(separator: "\n"))
                }
            }
        }
    }

    private func list(_ block: VoxoBlock) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(Array(block.lines.enumerated()), id: \.offset) { index, item in
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(block.isOrdered ? "\(index + 1)." : "•").foregroundColor(color)
                    inline(item)
                }
            }
        }
    }

    private func codeBlock(_ code: String) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            Text(code)
                .font(.system(size: 13, design: .monospaced))
                .foregroundColor(color)
                .padding(8)
        }
        .background(codeBackground)
        .cornerRadius(8)
    }

    private func inline(_ value: String) -> some View {
        Text(attributed(value)).font(.system(size: 15)).foregroundColor(color)
    }

    private func attributed(_ value: String) -> AttributedString {
        var result = AttributedString()
        for span in VoxoInlineParser.parse(value) {
            var piece = AttributedString(span.text)
            var intent: InlinePresentationIntent = []
            if span.bold { intent.insert(.stronglyEmphasized) }
            if span.italic { intent.insert(.emphasized) }
            if span.code {
                intent.insert(.code)
                piece.backgroundColor = codeBackground
            }
            if !intent.isEmpty { piece.inlinePresentationIntent = intent }
            if let href = span.href, let url = URL(string: href) {
                piece.link = url
                piece.foregroundColor = linkColor
            }
            result.append(piece)
        }
        return result
    }
}
#endif
