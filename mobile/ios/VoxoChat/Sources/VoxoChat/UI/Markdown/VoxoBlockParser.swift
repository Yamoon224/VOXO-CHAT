import Foundation

enum VoxoBlockKind { case paragraph, codeBlock, bulletList, orderedList }

struct VoxoBlock: Equatable {
    let kind: VoxoBlockKind
    let lines: [String]

    var isCode: Bool { kind == .codeBlock }
    var isList: Bool { kind == .bulletList || kind == .orderedList }
    var isOrdered: Bool { kind == .orderedList }
}

/// Découpe un message en blocs : paragraphes, listes (à puces ou numérotées) et blocs de
/// code. Volontairement minimal — pas de titres, tableaux ni HTML. Au-delà de `maxLength`,
/// le texte reste brut (garde-fou de performance).
enum VoxoBlockParser {
    static let maxLength = 8000

    private static let fence = try! NSRegularExpression(pattern: "^\\s*```")
    private static let listItem = try! NSRegularExpression(pattern: "^\\s*([-+*]|\\d+\\.)\\s+(.+)$")

    static func parse(_ value: String) -> [VoxoBlock] {
        if value.count > maxLength { return [VoxoBlock(kind: .paragraph, lines: value.components(separatedBy: "\n"))] }

        let lines = value.replacingOccurrences(of: "\r\n?", with: "\n", options: .regularExpression)
            .components(separatedBy: "\n")
        var blocks: [VoxoBlock] = []
        var index = 0
        while index < lines.count {
            if lines[index].trimmingCharacters(in: .whitespaces).isEmpty {
                index += 1
            } else if matches(fence, lines[index]) {
                index = readCode(lines, index, &blocks)
            } else if listMarker(lines[index]) != nil {
                index = readList(lines, index, &blocks)
            } else {
                index = readParagraph(lines, index, &blocks)
            }
        }
        return blocks
    }

    private static func matches(_ regex: NSRegularExpression, _ line: String) -> Bool {
        regex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)) != nil
    }

    /// (marqueur, contenu) d'une ligne de liste, nil si ce n'en est pas une.
    private static func listMarker(_ line: String) -> (marker: String, content: String)? {
        guard let match = listItem.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)),
              let marker = Range(match.range(at: 1), in: line),
              let content = Range(match.range(at: 2), in: line) else { return nil }
        return (String(line[marker]), String(line[content]))
    }

    private static func isOrdered(_ marker: String) -> Bool { marker.hasSuffix(".") && marker.dropLast().allSatisfy(\.isNumber) }

    private static func readCode(_ lines: [String], _ start: Int, _ blocks: inout [VoxoBlock]) -> Int {
        var index = start + 1
        var content: [String] = []
        while index < lines.count, !matches(fence, lines[index]) {
            content.append(lines[index])
            index += 1
        }
        // Une clôture manquante en fin de texte n'est pas une erreur.
        if index < lines.count { index += 1 }
        blocks.append(VoxoBlock(kind: .codeBlock, lines: content))
        return index
    }

    private static func readList(_ lines: [String], _ start: Int, _ blocks: inout [VoxoBlock]) -> Int {
        guard let first = listMarker(lines[start]) else { return start + 1 }
        let ordered = isOrdered(first.marker)
        var items: [String] = []
        var index = start
        while index < lines.count, let item = listMarker(lines[index]) {
            // Un changement de type ferme la liste.
            if isOrdered(item.marker) != ordered { break }
            items.append(item.content)
            index += 1
        }
        blocks.append(VoxoBlock(kind: ordered ? .orderedList : .bulletList, lines: items))
        return index
    }

    private static func readParagraph(_ lines: [String], _ start: Int, _ blocks: inout [VoxoBlock]) -> Int {
        var paragraph: [String] = []
        var index = start
        while index < lines.count,
              !lines[index].trimmingCharacters(in: .whitespaces).isEmpty,
              !matches(fence, lines[index]),
              listMarker(lines[index]) == nil {
            paragraph.append(lines[index])
            index += 1
        }
        blocks.append(VoxoBlock(kind: .paragraph, lines: paragraph))
        return index
    }
}
