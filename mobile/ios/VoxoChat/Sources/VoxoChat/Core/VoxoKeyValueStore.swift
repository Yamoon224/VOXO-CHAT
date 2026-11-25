import Foundation

/// Stockage clé/valeur de chaînes. Abstrait pour pouvoir tester sans plateforme Apple.
public protocol VoxoKeyValueStore {
    func getString(_ key: String) async -> String?
    func putString(_ key: String, _ value: String) async
    func remove(_ key: String) async
}

/// Implémentation mémoire : tests, ou intégrateur qui refuse toute persistance.
public actor VoxoMemoryStore: VoxoKeyValueStore {
    private var values: [String: String] = [:]

    public init() {}

    public func getString(_ key: String) -> String? { values[key] }
    public func putString(_ key: String, _ value: String) { values[key] = value }
    public func remove(_ key: String) { values.removeValue(forKey: key) }
}

/// Implémentation par défaut, adossée à `UserDefaults`. Les clés portent le préfixe `voxo.`
/// pour ne jamais entrer en collision avec celles de l'application hôte.
public struct VoxoUserDefaultsStore: VoxoKeyValueStore {
    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public func getString(_ key: String) async -> String? { defaults.string(forKey: "voxo." + key) }
    public func putString(_ key: String, _ value: String) async { defaults.set(value, forKey: "voxo." + key) }
    public func remove(_ key: String) async { defaults.removeObject(forKey: "voxo." + key) }
}
