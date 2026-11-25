import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/src/core/voxo_rate_limiter.dart';

void main() {
  late DateTime now;
  VoxoRateLimiter build({int max = 3}) => VoxoRateLimiter(
        maxMessages: max,
        window: const Duration(minutes: 1),
        clock: () => now,
      );

  setUp(() => now = DateTime(2026, 8, 23, 12));

  test('laisse passer jusqu’au quota de la fenêtre', () {
    final limiter = build();
    expect(limiter.tryConsume(), isTrue);
    expect(limiter.tryConsume(), isTrue);
    expect(limiter.tryConsume(), isTrue);
    expect(limiter.tryConsume(), isFalse);
  });

  test('un refus ne consomme rien : le quota reste utilisable plus tard', () {
    final limiter = build(max: 1);
    expect(limiter.tryConsume(), isTrue);
    expect(limiter.tryConsume(), isFalse);
    expect(limiter.tryConsume(), isFalse);

    now = now.add(const Duration(minutes: 1, seconds: 1));
    expect(limiter.tryConsume(), isTrue);
  });

  test('la fenêtre glisse : les jetons se libèrent un à un', () {
    final limiter = build();
    limiter.tryConsume();
    now = now.add(const Duration(seconds: 30));
    limiter.tryConsume();
    limiter.tryConsume();
    expect(limiter.tryConsume(), isFalse);

    // Le premier jeton sort de la fenêtre, les deux autres non.
    now = now.add(const Duration(seconds: 31));
    expect(limiter.tryConsume(), isTrue);
    expect(limiter.tryConsume(), isFalse);
  });

  test('cooldown vaut zéro tant qu’un envoi est possible', () {
    final limiter = build();
    limiter.tryConsume();
    expect(limiter.cooldown, Duration.zero);
  });

  test('cooldown annonce le délai avant le prochain jeton', () {
    final limiter = build(max: 1);
    limiter.tryConsume();
    now = now.add(const Duration(seconds: 20));
    expect(limiter.cooldown, const Duration(seconds: 40));
  });

  test('reset relâche le quota immédiatement', () {
    final limiter = build(max: 1);
    limiter.tryConsume();
    expect(limiter.tryConsume(), isFalse);
    limiter.reset();
    expect(limiter.tryConsume(), isTrue);
  });
}
