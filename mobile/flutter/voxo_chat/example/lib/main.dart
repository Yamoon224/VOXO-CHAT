import 'package:flutter/material.dart';
import 'package:voxo_chat/voxo_chat.dart';

import 'connection_form.dart';

void main() => runApp(const VoxoExampleApp());

class VoxoExampleApp extends StatelessWidget {
  const VoxoExampleApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'VOXO Chat — démo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: const Color(0xff3b82f6)),
        darkTheme: ThemeData(
          colorSchemeSeed: const Color(0xff3b82f6),
          brightness: Brightness.dark,
        ),
        home: const HomePage(),
      );
}

/// Écran d'accueil de la démo : on saisit l'adresse du backend et le tenant,
/// puis on ouvre le chat.
///
/// Une vraie application ne demanderait rien de tout ça — elle câblerait
/// `apiUrl` et `tenantId` en dur ou via sa configuration d'environnement.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  VoxoController? _controller;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  /// Un controller par couple (apiUrl, tenantId) : changer l'un ou l'autre
  /// impose d'en construire un neuf, la session étant indexée sur le tenant.
  void _connect(String apiUrl, String tenantId) {
    try {
      final controller = VoxoController(
        config: VoxoConfig(
          apiUrl: apiUrl,
          tenantId: tenantId,
          user: const VoxoUser(name: 'Awa Diop', email: 'awa@example.com'),
        ),
      );
      setState(() {
        _controller?.dispose();
        _controller = controller;
      });
    } on VoxoException catch (error) {
      // Le message est déjà rédigé en français pour l'utilisateur final.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    return Scaffold(
      appBar: AppBar(title: const Text('Boutique Acme')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Cette page tient lieu d’application cliente. '
              'Renseignez votre backend, puis ouvrez le chat.',
            ),
            const SizedBox(height: 20),
            ConnectionForm(onConnect: _connect, isConnected: controller != null),
            if (controller != null) ...[
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () => VoxoLauncher.open(context, controller),
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Ouvrir le chat en plein écran'),
              ),
              const SizedBox(height: 8),
              const Text(
                'Le bouton flottant en bas à droite fait la même chose. '
                'La conversation continue en arrière-plan une fois refermée : '
                'la réponse d’un conseiller arrive par le WebSocket.',
                style: TextStyle(fontSize: 12),
              ),
            ],
          ],
        ),
      ),
      floatingActionButton:
          controller == null ? null : VoxoLauncher(controller: controller),
    );
  }
}
