import 'dart:io';

import 'package:flutter/material.dart';

/// Saisie de l'adresse du backend et du tenant.
///
/// La valeur par défaut vise un backend lancé sur la machine de développement.
/// Sur un émulateur Android, `localhost` désigne l'émulateur lui-même : c'est
/// `10.0.2.2` qui pointe vers l'hôte. Le simulateur iOS, lui, partage le réseau
/// du Mac et joint `localhost` directement.
class ConnectionForm extends StatefulWidget {
  const ConnectionForm({
    required this.onConnect,
    required this.isConnected,
    super.key,
  });

  final void Function(String apiUrl, String tenantId) onConnect;
  final bool isConnected;

  @override
  State<ConnectionForm> createState() => _ConnectionFormState();
}

class _ConnectionFormState extends State<ConnectionForm> {
  late final TextEditingController _apiUrl =
      TextEditingController(text: _defaultApiUrl);
  final TextEditingController _tenantId = TextEditingController();

  static String get _defaultApiUrl {
    final host = Platform.isAndroid ? '10.0.2.2' : 'localhost';
    return 'http://$host:5000/api';
  }

  @override
  void dispose() {
    _apiUrl.dispose();
    _tenantId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _apiUrl,
            keyboardType: TextInputType.url,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'apiUrl',
              helperText: 'Doit se terminer par /api',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _tenantId,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'tenantId',
              helperText: 'UUID v4, visible dans l’onglet Intégration',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () =>
                widget.onConnect(_apiUrl.text.trim(), _tenantId.text.trim()),
            child: Text(widget.isConnected ? 'Reconnecter' : 'Connecter'),
          ),
        ],
      );
}
