/// Nature d'une pièce jointe, telle que le backend la classe.
enum VoxoAttachmentCategory { image, document }

VoxoAttachmentCategory? categoryFromName(String? value) => switch (value) {
      'image' => VoxoAttachmentCategory.image,
      'document' => VoxoAttachmentCategory.document,
      _ => null,
    };

/// Pièce jointe connue du serveur : soit fraîchement envoyée via
/// `POST /widget/upload`, soit lue dans l'historique d'une conversation.
class VoxoAttachment {
  const VoxoAttachment({
    required this.id,
    required this.name,
    this.category,
    this.mimeType,
    this.size,
    this.url,
  });

  /// UUID v4 renvoyé par l'upload, à placer dans `attachmentIds` d'un message.
  final String id;
  final String name;
  final VoxoAttachmentCategory? category;
  final String? mimeType;
  final int? size;

  /// URL **signée et à durée de vie limitée**, présente uniquement sur les
  /// pièces lues dans l'historique. Ne pas la mettre en cache durablement :
  /// elle expire, et un rechargement de l'historique en fournit une neuve.
  final String? url;

  bool get isImage => category == VoxoAttachmentCategory.image;

  factory VoxoAttachment.fromJson(Map<String, dynamic> json) => VoxoAttachment(
        id: json['id'] as String? ?? '',
        // Repli non localisé : le backend renvoie toujours un `name` pour une
        // pièce jointe réellement envoyée, ce cas ne couvre qu'une charge
        // malformée. Menacer la locale jusqu'ici demanderait de la faire
        // traverser tout le parsing de l'historique pour un repli qui ne
        // s'affiche jamais en pratique.
        name: json['name'] as String? ?? 'Fichier',
        category: categoryFromName(json['category'] as String?),
        mimeType: json['mimeType'] as String?,
        size: (json['size'] as num?)?.toInt(),
        url: json['url'] as String?,
      );

  /// L'URL signée est volontairement exclue : elle expire, la persister
  /// reviendrait à restaurer un lien mort au prochain démarrage.
  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (category != null) 'category': category!.name,
        if (mimeType != null) 'mimeType': mimeType,
        if (size != null) 'size': size,
      };
}

/// Pièce jointe en cours de préparation locale, avant d'être rattachée à un
/// message. Elle traverse trois états : compression, envoi, prête.
class VoxoPendingAttachment {
  VoxoPendingAttachment({
    required this.localId,
    required this.name,
    required this.size,
    required this.category,
    required this.path,
    this.remoteId,
    this.failed = false,
  });

  /// Identifiant local, stable pendant toute la vie de l'élément dans la file.
  final String localId;
  final String name;
  final int size;
  final VoxoAttachmentCategory category;

  /// Chemin du fichier sur l'appareil, après compression éventuelle. Sert à
  /// l'aperçu et à l'envoi.
  final String path;

  /// Renseigné une fois l'upload réussi : c'est l'identifiant serveur.
  String? remoteId;

  bool failed;

  /// Prête à être rattachée à un message.
  bool get isUploaded => remoteId != null;

  bool get isImage => category == VoxoAttachmentCategory.image;

  /// Trace conservée sur le message pour permettre un nouvel essai : les
  /// fichiers sont déjà sur le serveur, seul l'envoi du message a échoué.
  Map<String, dynamic> toJson() => {
        'id': remoteId,
        'name': name,
        'category': category.name,
      };
}
