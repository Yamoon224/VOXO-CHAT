import { useState } from 'react'
import { Button, Platform, StyleSheet, Text, TextInput, View } from 'react-native'

/**
 * Saisie de l'adresse du backend et du tenant.
 *
 * La valeur par défaut vise un backend lancé sur la machine de développement.
 * Sur un émulateur Android, `localhost` désigne l'émulateur lui-même : c'est
 * `10.0.2.2` qui pointe vers l'hôte. Le simulateur iOS, lui, partage le réseau
 * du Mac et joint `localhost` directement.
 */
const DEFAULT_API_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:5000/api`

export interface ConnectionFormProps {
  onConnect: (apiUrl: string, tenantId: string) => void
  isConnected: boolean
}

export function ConnectionForm({ onConnect, isConnected }: ConnectionFormProps) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [tenantId, setTenantId] = useState('')

  return (
    <View style={styles.form}>
      <Field
        label="apiUrl"
        hint="Doit se terminer par /api"
        value={apiUrl}
        onChangeText={setApiUrl}
        keyboardType="url"
      />
      <Field
        label="tenantId"
        hint="UUID v4, visible dans l’onglet Intégration"
        value={tenantId}
        onChangeText={setTenantId}
      />
      <Button
        title={isConnected ? 'Reconnecter' : 'Connecter'}
        onPress={() => onConnect(apiUrl.trim(), tenantId.trim())}
      />
    </View>
  )
}

interface FieldProps {
  label: string
  hint: string
  value: string
  onChangeText: (next: string) => void
  keyboardType?: 'url' | 'default'
}

function Field({ label, hint, value, onChangeText, keyboardType = 'default' }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        style={styles.input}
      />
      <Text style={styles.hint}>{hint}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { rowGap: 4 },
  form: { rowGap: 12 },
  hint: { color: '#6b7280', fontSize: 11 },
  input: {
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { fontSize: 13, fontWeight: '600' },
})
