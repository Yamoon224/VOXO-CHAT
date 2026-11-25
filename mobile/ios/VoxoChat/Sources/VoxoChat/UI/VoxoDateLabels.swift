import Foundation

/// Libellés d'heure et de séparateurs de jour, localisés (fr/en).
public enum VoxoDateLabels {
    private static let months: [String: [String]] = [
        "fr": ["janvier", "février", "mars", "avril", "mai", "juin",
               "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
        "en": ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"],
    ]

    public static func time(_ date: Date, timeZone: TimeZone = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    public static func daySeparator(_ date: Date, now: Date = Date(), locale: String = "fr", timeZone: TimeZone = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        if calendar.isDate(date, inSameDayAs: now) { return VoxoI18n.text(locale, "today") }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: yesterday) {
            return VoxoI18n.text(locale, "yesterday")
        }
        let normalized = VoxoI18n.normalize(locale)
        let parts = calendar.dateComponents([.day, .month, .year], from: date)
        let month = months[normalized]?[(parts.month ?? 1) - 1] ?? ""
        let day = parts.day ?? 1, year = parts.year ?? 1970
        return normalized == "en" ? "\(month) \(day), \(year)" : "\(day) \(month) \(year)"
    }
}
