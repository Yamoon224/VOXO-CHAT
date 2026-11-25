// Doit rester en tout premier : c'est ce polyfill qui fournit
// `crypto.getRandomValues`, dont dépend l'identifiant d'idempotence des
// messages. Sans lui, le SDK retombe sur Math.random et vous prévient.
import 'react-native-get-random-values'

import { useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { VoxoClient, VoxoError, VoxoLauncher, VoxoProvider } from 'voxo-chat-react-native'

import { ConnectionForm } from './ConnectionForm'

/**
 * Cette page tient lieu d'application cliente. Une vraie application câblerait
 * `apiUrl` et `tenantId` en dur ou via sa configuration d'environnement, sans
 * jamais les demander à l'utilisateur.
 */
export default function App() {
  const [client, setClient] = useState<VoxoClient | null>(null)
  const [error, setError] = useState<string | undefined>()

  // Un client par couple (apiUrl, tenantId) : changer l'un ou l'autre impose
  // d'en construire un neuf, la session étant indexée sur le tenant.
  const connect = (apiUrl: string, tenantId: string): void => {
    try {
      const next = new VoxoClient({
        apiUrl,
        tenantId,
        user: { name: 'Awa Diop', email: 'awa@example.com' },
      })
      client?.dispose()
      setClient(next)
      setError(undefined)
    } catch (caught) {
      // Le message est déjà rédigé en français pour l'utilisateur final.
      setError(caught instanceof VoxoError ? caught.message : String(caught))
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Boutique Acme</Text>
          <Text style={styles.intro}>
            Renseignez votre backend, puis ouvrez le chat avec la bulle en bas à droite.
          </Text>

          <ConnectionForm onConnect={connect} isConnected={client !== null} />
          {error !== undefined && <Text style={styles.error}>{error}</Text>}

          {client !== null && (
            <Text style={styles.hint}>
              La conversation continue en arrière-plan une fois le chat refermé : la réponse
              d’un conseiller arrive par le WebSocket, et l’application se resynchronise au
              retour au premier plan.
            </Text>
          )}
        </ScrollView>

        {client !== null && (
          // Le provider possède le cycle de vie applicatif (AppState) ; le
          // client, lui, appartient à cet écran.
          <VoxoProvider client={client}>
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <VoxoLauncher />
            </View>
          </VoxoProvider>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  content: { padding: 20, rowGap: 16 },
  error: { color: '#dc2626', fontSize: 13 },
  hint: { color: '#6b7280', fontSize: 12, lineHeight: 18 },
  intro: { color: '#374151', fontSize: 14 },
  root: { backgroundColor: '#ffffff', flex: 1 },
  title: { fontSize: 24, fontWeight: '700' },
})
