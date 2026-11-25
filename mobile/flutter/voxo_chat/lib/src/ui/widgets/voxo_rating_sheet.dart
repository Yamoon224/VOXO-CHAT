import 'package:flutter/material.dart';

import '../../core/voxo_limits.dart';
import '../../theme/voxo_theme.dart';
import '../../voxo_i18n.dart';

/// Résultat de la feuille de notation.
class VoxoRatingResult {
  const VoxoRatingResult({required this.rating, required this.comment});

  final int rating;
  final String comment;
}

/// Feuille de fin de conversation : note de 1 à 5 et commentaire facultatif.
///
/// Renvoie `null` si l'utilisateur referme sans valider : la conversation reste
/// alors ouverte, on ne clôt jamais sans intention explicite.
class VoxoRatingSheet extends StatefulWidget {
  const VoxoRatingSheet({this.locale = 'fr', super.key});

  final String locale;

  static Future<VoxoRatingResult?> show(
    BuildContext context,
    VoxoTheme theme,
    {String locale = 'fr'}
  ) =>
      showModalBottomSheet<VoxoRatingResult>(
        context: context,
        isScrollControlled: true,
        backgroundColor: theme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) => VoxoThemeScope(
          theme: theme,
          child: VoxoRatingSheet(locale: locale),
        ),
      );

  @override
  State<VoxoRatingSheet> createState() => _VoxoRatingSheetState();
}

class _VoxoRatingSheetState extends State<VoxoRatingSheet> {
  final TextEditingController _comment = TextEditingController();
  int _rating = 0;
  bool _showError = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  void _submit() {
    // Le backend refuse une note hors 1-5 : on ne laisse pas partir un zéro.
    if (_rating == 0) {
      setState(() => _showError = true);
      return;
    }
    Navigator.of(context).pop(
      VoxoRatingResult(rating: _rating, comment: _comment.text.trim()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = VoxoThemeScope.of(context);

    return Padding(
      // Remonte la feuille au-dessus du clavier quand le commentaire est saisi.
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                VoxoI18n.text(widget.locale, 'ratingTitle'),
                style: TextStyle(
                  color: theme.text,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 14),
              _stars(theme),
              if (_showError)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    VoxoI18n.text(widget.locale, 'ratingRequired'),
                    style: TextStyle(color: theme.danger, fontSize: 12),
                  ),
                ),
              const SizedBox(height: 14),
              _commentField(theme),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        VoxoI18n.text(widget.locale, 'cancel'),
                        style: TextStyle(color: theme.textMuted),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: theme.accent,
                        foregroundColor: theme.onAccent,
                      ),
                      child: Text(VoxoI18n.text(widget.locale, 'send')),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stars(VoxoTheme theme) => Semantics(
        label: VoxoI18n.text(widget.locale, 'ratingGroup'),
        child: Row(
          children: [
            for (var value = 1; value <= 5; value++)
              IconButton(
                onPressed: () => setState(() {
                  _rating = value;
                  _showError = false;
                }),
                icon: Icon(
                  value <= _rating ? Icons.star : Icons.star_border,
                  size: 30,
                  color: value <= _rating ? theme.accent : theme.textMuted,
                ),
                tooltip: VoxoI18n.text(widget.locale, 'ratingValue', {'count': value}),
                padding: const EdgeInsets.symmetric(horizontal: 2),
                constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              ),
          ],
        ),
      );

  Widget _commentField(VoxoTheme theme) => TextField(
        controller: _comment,
        maxLines: 3,
        maxLength: VoxoLimits.maxFeedbackLength,
        style: TextStyle(color: theme.text, fontSize: 14),
        decoration: InputDecoration(
          hintText: VoxoI18n.text(widget.locale, 'ratingComment'),
          hintStyle: TextStyle(color: theme.textMuted, fontSize: 14),
          filled: true,
          fillColor: theme.surfaceMuted,
          counterStyle: TextStyle(color: theme.textMuted, fontSize: 11),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      );
}
