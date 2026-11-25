/// Service de notification qui a émis le jeton confié à
/// `VoxoController.registerPushToken`.
///
/// Le SDK ne dépend ni de Firebase ni d'APNs : c'est l'application hôte qui
/// obtient le jeton et le lui transmet.
enum VoxoPushPlatform {
  /// Firebase Cloud Messaging (Android, et iOS via FCM).
  fcm,

  /// Apple Push Notification service, jeton APNs brut.
  apns;

  /// Valeur attendue par `POST /widget/push-token`.
  String get wireName => name;

  static VoxoPushPlatform? fromWire(String? value) {
    for (final platform in values) {
      if (platform.wireName == value) return platform;
    }
    return null;
  }
}
