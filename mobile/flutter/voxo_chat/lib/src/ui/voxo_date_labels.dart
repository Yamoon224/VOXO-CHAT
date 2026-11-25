/// Libellés de date et d'heure en français.
///
/// Écrits à la main plutôt qu'avec `intl` : le SDK n'a besoin que de deux
/// formats, et une dépendance de plus dans une application hôte se justifie
/// mal pour si peu. Les formulations reprennent celles du widget web.
library;

import '../voxo_i18n.dart';

abstract final class VoxoDateLabels {
  static const Map<String, List<String>> _months = {'fr': [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ], 'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']};

  /// `14:05`.
  static String time(DateTime value) {
    final local = value.toLocal();
    return '${_pad(local.hour)}:${_pad(local.minute)}';
  }

  /// `Aujourd'hui`, `Hier`, ou `23 août 2026`.
  static String daySeparator(DateTime value, {DateTime? now, String locale = 'fr'}) {
    final today = (now ?? DateTime.now()).toLocal();
    final local = value.toLocal();

    if (_isSameDay(local, today)) return VoxoI18n.text(locale, 'today');
    if (_isSameDay(local, today.subtract(const Duration(days: 1)))) {
      return VoxoI18n.text(locale, 'yesterday');
    }
    final normalized = VoxoI18n.normalize(locale);
    final month = _months[normalized]![local.month - 1];
    return normalized == 'en' ? '$month ${local.day}, ${local.year}' : '${local.day} $month ${local.year}';
  }

  static bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  static String _pad(int value) => value.toString().padLeft(2, '0');
}
