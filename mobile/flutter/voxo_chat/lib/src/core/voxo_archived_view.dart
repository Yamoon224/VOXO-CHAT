import '../models/voxo_handoff.dart';
import '../models/voxo_message.dart';

/// Conversation archivée rouverte en **lecture seule** (voir `CONTRACT.md`,
/// « Conversations archivées »). Elle ne remplace jamais la session active.
class VoxoArchivedView {
  const VoxoArchivedView({required this.messages, required this.handoff});

  final List<VoxoMessage> messages;
  final VoxoHandoff handoff;
}
