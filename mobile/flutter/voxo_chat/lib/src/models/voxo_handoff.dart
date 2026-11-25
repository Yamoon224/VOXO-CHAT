import '../voxo_i18n.dart';

/// État de la reprise de la conversation par un humain.
enum VoxoHandoffStatus {
  /// L'assistant répond seul.
  none,

  /// Un conseiller a été sollicité mais n'a pas encore pris la main.
  waiting,

  /// Un conseiller échange en direct avec l'utilisateur.
  human,
}

VoxoHandoffStatus handoffStatusFromApi(String? value) => switch (value) {
      'waiting' => VoxoHandoffStatus.waiting,
      'human' => VoxoHandoffStatus.human,
      _ => VoxoHandoffStatus.none,
    };

/// Vue de la reprise humaine, telle qu'elle arrive par le WebSocket
/// (`handoff` sur n'importe quel événement) ou par l'historique.
class VoxoHandoff {
  const VoxoHandoff({
    this.status = VoxoHandoffStatus.none,
    this.agentName,
    this.reason,
  });

  final VoxoHandoffStatus status;

  /// Nom affichable du conseiller, une fois qu'il a pris la main.
  final String? agentName;

  final String? reason;

  bool get isHandledByHuman => status == VoxoHandoffStatus.human;

  /// Sous-titre à afficher dans l'en-tête du chat. `null` quand l'assistant
  /// répond seul : c'est alors l'état de connectivité qui s'affiche.
  ///
  /// Toujours en français, quelle que soit la locale de la conversation :
  /// c'est le contrat historique de cette propriété, lu tel quel par du code
  /// appelant existant. Utiliser [labelFor] pour un sous-titre localisé.
  String? get label => switch (status) {
        VoxoHandoffStatus.human =>
          'Vous échangez avec ${agentName ?? 'un conseiller'}',
        VoxoHandoffStatus.waiting => 'Un conseiller a été prévenu',
        VoxoHandoffStatus.none => null,
      };

  /// Variante localisée de [label], dans la langue de la conversation.
  String? labelFor(String locale) => switch (status) {
        VoxoHandoffStatus.human => VoxoI18n.text(locale, 'handoffWithAgent', {
            'agent': agentName ?? VoxoI18n.text(locale, 'handoffDefaultAgent'),
          }),
        VoxoHandoffStatus.waiting => VoxoI18n.text(locale, 'handoffWaiting'),
        VoxoHandoffStatus.none => null,
      };

  factory VoxoHandoff.fromJson(Map<String, dynamic> json) {
    final agent = json['assignedAgent'];
    return VoxoHandoff(
      status: handoffStatusFromApi(
        (json['status'] ?? json['handoffStatus']) as String?,
      ),
      agentName: agent is Map<String, dynamic> ? agent['name'] as String? : null,
      reason: (json['reason'] ?? json['handoffReason']) as String?,
    );
  }
}
