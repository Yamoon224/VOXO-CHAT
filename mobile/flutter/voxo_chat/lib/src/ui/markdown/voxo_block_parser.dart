/// Nature d'un bloc Markdown reconnu.
enum VoxoBlockKind { paragraph, codeBlock, bulletList, orderedList }

/// Bloc de haut niveau d'une réponse.
///
/// Pour un paragraphe, [lines] porte les lignes du paragraphe (un saut de ligne
/// simple les sépare). Pour une liste, chaque entrée est un élément. Pour un
/// bloc de code, [lines] est le contenu brut, sans analyse en ligne.
class VoxoBlock {
  const VoxoBlock(this.kind, this.lines);

  final VoxoBlockKind kind;
  final List<String> lines;

  bool get isCode => kind == VoxoBlockKind.codeBlock;
  bool get isList =>
      kind == VoxoBlockKind.bulletList || kind == VoxoBlockKind.orderedList;
  bool get isOrdered => kind == VoxoBlockKind.orderedList;
}

/// Découpage en blocs, portage de `renderMarkdown` de
/// `widget/src/markdown.js`.
///
/// Au-delà de [maxLength], le texte est rendu tel quel : une réponse
/// anormalement longue ne doit pas coûter une analyse complète.
abstract final class VoxoBlockParser {
  static const int maxLength = 8000;

  static final RegExp _fence = RegExp(r'^\s*```');
  static final RegExp _listItem = RegExp(r'^\s*([-+*]|\d+\.)\s+(.+)$');
  static final RegExp _ordered = RegExp(r'\d+\.');

  static List<VoxoBlock> parse(String value) {
    if (value.length > maxLength) {
      return [
        VoxoBlock(VoxoBlockKind.paragraph, value.split('\n')),
      ];
    }

    final lines = value.replaceAll(RegExp(r'\r\n?'), '\n').split('\n');
    final blocks = <VoxoBlock>[];
    var index = 0;

    while (index < lines.length) {
      if (lines[index].trim().isEmpty) {
        index++;
        continue;
      }
      index = _fence.hasMatch(lines[index])
          ? _readCodeBlock(lines, index, blocks)
          : _listItem.hasMatch(lines[index])
              ? _readList(lines, index, blocks)
              : _readParagraph(lines, index, blocks);
    }
    return blocks;
  }

  static int _readCodeBlock(
    List<String> lines,
    int start,
    List<VoxoBlock> blocks,
  ) {
    var index = start + 1;
    final content = <String>[];
    while (index < lines.length && !_fence.hasMatch(lines[index])) {
      content.add(lines[index++]);
    }
    // Une clôture manquante en fin de texte n'est pas une erreur : le bloc
    // court simplement jusqu'au bout.
    if (index < lines.length) index++;
    blocks.add(VoxoBlock(VoxoBlockKind.codeBlock, content));
    return index;
  }

  static int _readList(List<String> lines, int start, List<VoxoBlock> blocks) {
    final ordered = _ordered.hasMatch(_listItem.firstMatch(lines[start])!.group(1)!);
    final items = <String>[];
    var index = start;

    while (index < lines.length) {
      final match = _listItem.firstMatch(lines[index]);
      // Un changement de type ferme la liste : à puces et numérotée ne se
      // mélangent pas dans un même bloc.
      if (match == null || _ordered.hasMatch(match.group(1)!) != ordered) break;
      items.add(match.group(2)!);
      index++;
    }

    blocks.add(VoxoBlock(
      ordered ? VoxoBlockKind.orderedList : VoxoBlockKind.bulletList,
      items,
    ));
    return index;
  }

  static int _readParagraph(
    List<String> lines,
    int start,
    List<VoxoBlock> blocks,
  ) {
    final paragraph = <String>[];
    var index = start;
    while (index < lines.length &&
        lines[index].trim().isNotEmpty &&
        !_fence.hasMatch(lines[index]) &&
        !_listItem.hasMatch(lines[index])) {
      paragraph.add(lines[index++]);
    }
    blocks.add(VoxoBlock(VoxoBlockKind.paragraph, paragraph));
    return index;
  }
}
