package chat.voxo.sdk.ui

import chat.voxo.sdk.core.VoxoI18n
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Libellés d'heure et de séparateurs de jour, localisés (fr/en). */
object VoxoDateLabels {
    private val months = mapOf(
        "fr" to listOf(
            "janvier", "février", "mars", "avril", "mai", "juin",
            "juillet", "août", "septembre", "octobre", "novembre", "décembre",
        ),
        "en" to listOf(
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ),
    )

    fun time(value: Instant, zone: ZoneId = ZoneId.systemDefault()): String {
        val local = value.atZone(zone)
        return "%02d:%02d".format(local.hour, local.minute)
    }

    fun daySeparator(
        value: Instant,
        now: Instant = Instant.now(),
        locale: String = "fr",
        zone: ZoneId = ZoneId.systemDefault(),
    ): String {
        val day: LocalDate = value.atZone(zone).toLocalDate()
        val today: LocalDate = now.atZone(zone).toLocalDate()
        if (day == today) return VoxoI18n.text(locale, "today")
        if (day == today.minusDays(1)) return VoxoI18n.text(locale, "yesterday")

        val normalized = VoxoI18n.normalize(locale)
        val month = months.getValue(normalized)[day.monthValue - 1]
        return if (normalized == "en") "$month ${day.dayOfMonth}, ${day.year}" else "${day.dayOfMonth} $month ${day.year}"
    }
}
