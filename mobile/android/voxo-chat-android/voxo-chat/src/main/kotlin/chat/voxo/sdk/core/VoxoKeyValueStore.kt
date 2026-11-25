package chat.voxo.sdk.core

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

/** Stockage clé/valeur de chaînes. Abstrait pour pouvoir tester sans Android. */
interface VoxoKeyValueStore {
    suspend fun getString(key: String): String?
    suspend fun putString(key: String, value: String)
    suspend fun remove(key: String)
}

/** Implémentation mémoire : tests, ou intégrateur qui refuse toute persistance. */
class VoxoMemoryStore : VoxoKeyValueStore {
    private val values = java.util.concurrent.ConcurrentHashMap<String, String>()

    override suspend fun getString(key: String): String? = values[key]

    override suspend fun putString(key: String, value: String) {
        values[key] = value
    }

    override suspend fun remove(key: String) {
        values.remove(key)
    }
}

private val Context.voxoDataStore by preferencesDataStore(name = "voxo_chat")

/** Implémentation par défaut, adossée à Jetpack DataStore. */
class VoxoDataStore(context: Context) : VoxoKeyValueStore {
    private val store = context.applicationContext.voxoDataStore

    override suspend fun getString(key: String): String? =
        store.data.first()[stringPreferencesKey(key)]

    override suspend fun putString(key: String, value: String) {
        store.edit { it[stringPreferencesKey(key)] = value }
    }

    override suspend fun remove(key: String) {
        store.edit { it.remove(stringPreferencesKey(key)) }
    }
}
