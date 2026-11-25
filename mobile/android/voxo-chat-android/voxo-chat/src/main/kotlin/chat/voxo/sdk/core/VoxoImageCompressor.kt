package chat.voxo.sdk.core

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

/** Prépare une image avant envoi. Abstrait pour être remplacé en test. */
fun interface VoxoImageCompressor {
    /** Renvoie le chemin à envoyer : celui d'origine si la compression ne gagne rien ou échoue. */
    suspend fun compress(path: String): String
}

/** Pas de compression : pour les tests, ou un intégrateur qui compresse lui-même. */
object VoxoNoCompression : VoxoImageCompressor {
    override suspend fun compress(path: String): String = path
}

/**
 * 2 048 px sur le plus grand côté, WebP qualité 82 (contrat `CONTRACT.md`). Le
 * fichier d'origine est conservé si le résultat n'est pas plus léger.
 */
class VoxoAndroidImageCompressor(context: Context) : VoxoImageCompressor {
    private val cacheDir: File = context.applicationContext.cacheDir

    override suspend fun compress(path: String): String = withContext(Dispatchers.IO) {
        if (VoxoFileRules.extensionOf(path) !in COMPRESSIBLE) return@withContext path
        try {
            val source = File(path)
            val bitmap = decode(path) ?: return@withContext path
            val target = File(cacheDir, "voxo-${System.nanoTime()}.webp")
            FileOutputStream(target).use { bitmap.compress(webpFormat(), QUALITY, it) }
            bitmap.recycle()
            if (target.length() >= source.length()) {
                target.delete()
                path
            } else {
                target.absolutePath
            }
        } catch (_: Exception) {
            path
        }
    }

    private fun decode(path: String): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        val largest = max(bounds.outWidth, bounds.outHeight)
        if (largest <= 0) return null

        var sample = 1
        while (largest / (sample * 2) >= MAX_DIMENSION) sample *= 2
        val bitmap = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return null

        val scale = MAX_DIMENSION.toFloat() / max(bitmap.width, bitmap.height)
        if (scale >= 1f) return bitmap
        return Bitmap.createScaledBitmap(
            bitmap, (bitmap.width * scale).toInt().coerceAtLeast(1), (bitmap.height * scale).toInt().coerceAtLeast(1), true,
        ).also { if (it !== bitmap) bitmap.recycle() }
    }

    @Suppress("DEPRECATION")
    private fun webpFormat() =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Bitmap.CompressFormat.WEBP_LOSSY else Bitmap.CompressFormat.WEBP

    private companion object {
        const val MAX_DIMENSION = 2048
        const val QUALITY = 82
        val COMPRESSIBLE = setOf(".jpg", ".jpeg", ".png", ".webp")
    }
}
