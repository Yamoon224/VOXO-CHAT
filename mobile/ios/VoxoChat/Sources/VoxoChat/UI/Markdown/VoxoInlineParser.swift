import Foundation

/// Fragment de texte inline. Les styles imbriqués (`**gras _italique_**`) sont aplatis :
/// chaque fragment porte l'ensemble de ses styles. `href` n'est posé que sur un lien que
/// l'on sait ouvrir.
struct VoxoSpan: Equatable {
    var text: String
    var bold = false
    var italic = false
    var code = false
    var href: String?
}

/// Gras, italique, code, liens `[x](url)` et URL nues. Pas d'HTML.
enum VoxoInlineParser {
    private static let pattern = try! NSRegularExpression(
        pattern: "(`[^`\\n]+`"
            + "|\\*\\*[^*\\n]+\\*\\*"
            + "|__[^_\\n]+__"
            + "|\\*[^*\\n]+\\*"
            + "|_[^_\\n]+_"
            + "|\\[[^\\]\\n]+\\]\\([^\\s)]+\\)"
            + "|https?://[^\\s<]+)",
        options: [.caseInsensitive]
    )
    private static let linkPattern = try! NSRegularExpression(pattern: "^\\[([^\\]]+)\\]\\(([^)]+)\\)$")

    static func parse(_ value: String, base: VoxoSpan = VoxoSpan(text: "")) -> [VoxoSpan] {
        var spans: [VoxoSpan] = []
        var cursor = value.startIndex
        let whole = NSRange(value.startIndex..., in: value)
        for match in pattern.matches(in: value, range: whole) {
            guard let range = Range(match.range, in: value) else { continue }
            if range.lowerBound > cursor {
                spans.append(plain(String(value[cursor..<range.lowerBound]), base))
            }
            cursor = range.upperBound
            spans.append(contentsOf: token(String(value[range]), base))
        }
        if cursor < value.endIndex { spans.append(plain(String(value[cursor...]), base)) }
        return spans
    }

    private static func plain(_ text: String, _ base: VoxoSpan) -> VoxoSpan {
        var span = base
        span.text = text
        return span
    }

    private static func token(_ token: String, _ base: VoxoSpan) -> [VoxoSpan] {
        if token.hasPrefix("`") {
            var span = plain(String(token.dropFirst().dropLast()), base)
            span.code = true
            return [span]
        }
        if wrapped(token, "**") || wrapped(token, "__") {
            var inner = base
            inner.bold = true
            return parse(String(token.dropFirst(2).dropLast(2)), base: inner)
        }
        if wrapped(token, "*") || wrapped(token, "_") {
            var inner = base
            inner.italic = true
            return parse(String(token.dropFirst().dropLast()), base: inner)
        }
        if token.hasPrefix("[") {
            guard let match = linkPattern.firstMatch(in: token, range: NSRange(token.startIndex..., in: token)),
                  let label = Range(match.range(at: 1), in: token),
                  let url = Range(match.range(at: 2), in: token) else { return [plain(token, base)] }
            return [link(String(token[label]), String(token[url]), base)]
        }
        // URL nue : la ponctuation finale n'en fait pas partie.
        let (url, trailing) = VoxoSafeURL.splitTrailingPunctuation(token)
        var spans = [link(url, url, base)]
        if !trailing.isEmpty { spans.append(plain(trailing, base)) }
        return spans
    }

    /// Un lien qu'on ne saurait pas ouvrir s'affiche en texte inerte, pas en lien mort.
    private static func link(_ label: String, _ rawUrl: String, _ base: VoxoSpan) -> VoxoSpan {
        var span = plain(label, base)
        span.href = VoxoSafeURL.sanitize(rawUrl)
        return span
    }

    private static func wrapped(_ token: String, _ marker: String) -> Bool {
        token.count > marker.count * 2 && token.hasPrefix(marker) && token.hasSuffix(marker)
    }
}
