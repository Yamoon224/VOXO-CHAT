import XCTest
@testable import VoxoChat

@MainActor
final class SessionAndStateTests: XCTestCase {
    private let config = try! VoxoConfig(apiUrl: "https://x.test/api", tenantId: VoxoUUID.v4())

    private func json(_ text: String) -> JSONObject { decodeJSONObject(text) ?? [:] }

    func testHistoryReplacementKeepsInFlightMessagesAndTheWelcomeOnlyWhenEmpty() {
        let state = VoxoConversationState()
        let welcome = state.add(VoxoMessage(role: .assistant, text: "Hi", isWelcome: true))
        let inFlight = state.add(VoxoMessage(role: .user, text: "?", deliveryStatus: .sending))

        state.replaceWithHistory([])
        XCTAssertEqual(state.messages.map { $0.id }, [welcome.id, inFlight.id])

        state.replaceWithHistory([VoxoMessage(serverId: "s1", role: .assistant, text: "Real")])
        XCTAssertEqual(state.messages.map { $0.serverId ?? $0.id }, ["s1", inFlight.id])
    }

    func testStateCapsMemoryAt100MessagesAndCountsOnlyRealUserMessages() {
        let state = VoxoConversationState()
        for index in 0..<120 { state.add(VoxoMessage(role: .user, text: "m\(index)")) }
        state.add(VoxoMessage(role: .user, text: "w", isWelcome: true))
        XCTAssertEqual(state.messages.count, 100)
        XCTAssertEqual(state.messageCount, 120)
    }

    func testHistoryMessageParsingIsTolerantAndMapsRoles() {
        let message = VoxoMessage.fromHistory(json("""
        {"id":"m1","role":"user","content":"yo","timestamp":"2026-01-01T10:00:00Z","feedback":"up","messageIndex":3,
         "attachments":[{"id":"a","name":"p.png","category":"image","size":5,"url":"https://s/x"}]}
        """))
        XCTAssertEqual(message.deliveryStatus, .answered)
        XCTAssertEqual(message.serverId, "m1")
        XCTAssertEqual(message.messageIndex, 3)
        XCTAssertTrue(message.attachments.first?.isImage == true)
        XCTAssertEqual(VoxoMessage.fromHistory(json(#"{"role":"internal_note"}"#)).role, .assistant)
    }

    func testTimestampsAcceptFractionalSeconds() {
        XCTAssertNotNil(VoxoDates.parse("2026-01-01T10:00:00.123Z"))
        XCTAssertNotNil(VoxoDates.parse("2026-01-01T10:00:00Z"))
        XCTAssertNil(VoxoDates.parse("hier"))
    }

    func testChatbotConfigToleratesMissingOptionalKeys() {
        let bare = VoxoChatbotConfig.fromJSON([:])
        XCTAssertNil(bare.avatarUrl)
        XCTAssertNil(bare.colorScheme)
        XCTAssertTrue(bare.showPoweredBy)
        XCTAssertEqual(bare.maxAttachments, 3)

        let full = VoxoChatbotConfig.fromJSON(json("""
        {"name":"Zoé","features":{"customBranding":true},"options":{"ui":{"colorScheme":"dark"},
         "features":{"attachments":false},"attachments":{"maxFiles":2,"maxBytes":1000}}}
        """))
        XCTAssertFalse(full.showPoweredBy)
        XCTAssertFalse(full.features.attachments)
        XCTAssertEqual(full.colorScheme, "dark")
        XCTAssertEqual(full.maxAttachmentBytes, 1000)
    }

    func testHandoffLabelsAreLocalized() {
        let human = VoxoHandoff.fromJSON(json(#"{"status":"human","assignedAgent":{"name":"Léa"}}"#))
        XCTAssertEqual(human.status, .human)
        XCTAssertEqual(human.label(for: "fr"), "Vous échangez avec Léa")
        XCTAssertEqual(human.label(for: "en"), "You are chatting with Léa")
        XCTAssertNil(VoxoHandoff().label(for: "fr"))
    }

    func testSessionSurvivesARestartAndExpiresAfter30Minutes() async {
        let kv = VoxoMemoryStore()
        var now = Date(timeIntervalSince1970: 1_000_000)
        let state = VoxoConversationState(sessionId: "sess")
        state.add(VoxoMessage(role: .user, text: "Bonjour"))

        await VoxoSessionStore(config: config, store: kv, clock: { now }).save(state, reminderCount: 2)
        now = now.addingTimeInterval(5 * 60)
        let restored = await VoxoSessionStore(config: config, store: kv, clock: { now }).restore()
        XCTAssertEqual(restored?.sessionId, "sess")
        XCTAssertEqual(restored?.inactivityReminderCount, 2)
        XCTAssertEqual(restored?.messages.first?.text, "Bonjour")

        now = now.addingTimeInterval(31 * 60)
        let store = VoxoSessionStore(config: config, store: kv, clock: { now })
        let expired = await store.restore()
        XCTAssertNil(expired)
        let history = await store.history()
        XCTAssertEqual(history.first?.title, "Bonjour")
        let leftover = await kv.getString("session-\(config.tenantId)")
        XCTAssertNil(leftover)
    }

    func testArchiveIsCappedAt30EntriesAndDedupesBySession() async {
        let store = VoxoSessionStore(config: config, store: VoxoMemoryStore())
        let messages = [VoxoMessage(role: .user, text: "t")]
        for index in 0..<35 { await store.archive(sessionId: "s\(index)", messages: messages) }
        await store.archive(sessionId: "s34", messages: messages)
        let history = await store.history()
        XCTAssertEqual(history.count, 30)
        XCTAssertEqual(history.first?.sessionId, "s34")
        XCTAssertEqual(history.filter { $0.sessionId == "s34" }.count, 1)
    }

    func testAnonymousUserIdIsGeneratedOnceAndAnExternalIdWins() async throws {
        let kv = VoxoMemoryStore()
        let first = await VoxoSessionStore(config: config, store: kv).userId()
        XCTAssertTrue(first.hasPrefix("user-"))
        let second = await VoxoSessionStore(config: config, store: kv).userId()
        XCTAssertEqual(first, second)
        let external = try VoxoConfig(apiUrl: "https://x.test/api", tenantId: config.tenantId, user: VoxoUser(externalId: "ext-9"))
        let externalId = await VoxoSessionStore(config: external, store: kv).userId()
        XCTAssertEqual(externalId, "ext-9")
    }

    func testInactivitySendsTwoRemindersThenAnnouncesClosingAndTimesOut() async {
        var now: TimeInterval = 0
        var events: [String] = []
        let monitor = VoxoInactivityMonitor(
            onReminder: { events.append("reminder") },
            onClosing: { events.append("closing") },
            onTimeout: { events.append("timeout") },
            isActive: { true },
            clock: { now }
        )
        let step: TimeInterval = 10 * 60 + 1
        for _ in 0..<3 {
            now += step
            await monitor.tick()
        }
        XCTAssertEqual(events, ["reminder", "reminder", "closing", "timeout"])
        XCTAssertEqual(monitor.reminderCount, 3)
    }
}
