import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import VoxoChat

/// Réutilise `StubURLProtocol` / `stubOK` définis dans ApiAndSenderTests.swift.
@MainActor
final class PushTypingHistoryTests: XCTestCase {
    private let tenant = VoxoUUID.v4()
    private var session: URLSession!

    override func setUp() async throws {
        StubURLProtocol.reset()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        session = URLSession(configuration: configuration)
    }

    private func makeConfig(appId: String? = nil) throws -> VoxoConfig {
        try VoxoConfig(apiUrl: "https://api.test/api", tenantId: tenant, appId: appId)
    }

    private func bodyText(_ index: Int) -> String { String(data: StubURLProtocol.bodies[index], encoding: .utf8) ?? "" }

    // MARK: appId

    func testTheAppIdTravelsAsXAppIdAndAsTheSocketParameterAndOnlyWhenKnown() async throws {
        StubURLProtocol.handler = { _ in stubOK(#"{"status":"healthy"}"#) }
        let withId = try makeConfig(appId: " com.exemple.app ")
        _ = await VoxoApiClient(config: withId, session: session).isHealthy()
        XCTAssertEqual(StubURLProtocol.requests[0].value(forHTTPHeaderField: "X-App-Id"), "com.exemple.app")
        XCTAssertTrue(withId.conversationSocketURL(sessionId: "s")?.absoluteString.contains("appId=com.exemple.app") == true)

        let without = try makeConfig()
        _ = await VoxoApiClient(config: without, session: session).isHealthy()
        XCTAssertNil(StubURLProtocol.requests[1].value(forHTTPHeaderField: "X-App-Id"))
        XCTAssertFalse(without.conversationSocketURL(sessionId: "s")?.absoluteString.contains("appId") == true)
        XCTAssertNil(try makeConfig(appId: "   ").appId)
    }

    // MARK: push

    private func makeRegistrar(_ config: VoxoConfig, _ kv: VoxoMemoryStore, session sessionId: @escaping () -> String) -> VoxoPushRegistrar {
        VoxoPushRegistrar(
            api: VoxoApiClient(config: config, session: session),
            store: VoxoSessionStore(config: config, store: kv), config: config, sessionId: sessionId)
    }

    func testRegisteringSendsTheTokenBoundToTheCurrentSessionAndANewSessionMovesIt() async throws {
        StubURLProtocol.handler = { _ in stubOK(#"{"registered":true}"#) }
        var sessionId = "s1"
        let push = makeRegistrar(try makeConfig(), VoxoMemoryStore()) { sessionId }
        await push.register("tok-1", platform: .fcm)
        XCTAssertEqual(StubURLProtocol.requests[0].url?.path, "/api/widget/push-token")
        let first = bodyText(0)
        XCTAssertTrue(first.contains("\"sessionId\":\"s1\"") && first.contains("\"platform\":\"fcm\"") && first.contains("\"token\":\"tok-1\""))

        sessionId = "s2"
        await push.syncSession()
        XCTAssertTrue(bodyText(1).contains("\"sessionId\":\"s2\""))
    }

    func testAStoredTokenIsRelinkedAfterARestart() async throws {
        StubURLProtocol.handler = { _ in stubOK(#"{"registered":true}"#) }
        let kv = VoxoMemoryStore()
        let config = try makeConfig()
        await makeRegistrar(config, kv) { "s1" }.register("tok-1", platform: .apns)

        let restarted = makeRegistrar(config, kv) { "s9" }
        await restarted.load()
        await restarted.syncSession()
        let body = bodyText(1)
        XCTAssertTrue(body.contains("\"sessionId\":\"s9\"") && body.contains("\"platform\":\"apns\""))
    }

    func testPushNotEnabledStopsFurtherAttemptsSilentlyUntilANewTokenIsHandedOver() async throws {
        StubURLProtocol.handler = { _ in (403, #"{"success":false,"error":"x","code":"PUSH_NOT_ENABLED"}"#) }
        let push = makeRegistrar(try makeConfig(), VoxoMemoryStore()) { "s1" }
        await push.register("tok-1", platform: .fcm)
        let before = StubURLProtocol.requests.count
        await push.syncSession()
        XCTAssertEqual(StubURLProtocol.requests.count, before)

        StubURLProtocol.handler = { _ in stubOK(#"{"registered":true}"#) }
        await push.register("tok-2", platform: .fcm)
        XCTAssertEqual(StubURLProtocol.requests.count, before + 1)
    }

    func testAnOutageNeverReachesTheUserAndDoesNotDisableTheFeature() async throws {
        StubURLProtocol.handler = { _ in (500, #"{"success":false,"error":"Panne"}"#) }
        let push = makeRegistrar(try makeConfig(), VoxoMemoryStore()) { "s1" }
        await push.register("tok-1", platform: .fcm)
        StubURLProtocol.handler = { _ in stubOK(#"{"registered":true}"#) }
        await push.syncSession()
        XCTAssertEqual(StubURLProtocol.requests.count, 2)
    }

    func testUnregisterForgetsTheTokenOnTheServerAndLocally() async throws {
        StubURLProtocol.handler = { _ in stubOK(#"{"registered":true}"#) }
        let push = makeRegistrar(try makeConfig(), VoxoMemoryStore()) { "s1" }
        await push.register("tok-1", platform: .fcm)
        StubURLProtocol.handler = { _ in stubOK(#"{"removed":true}"#) }
        await push.unregister()
        XCTAssertEqual(StubURLProtocol.requests[1].httpMethod, "DELETE")
        XCTAssertTrue(bodyText(1).contains("\"token\":\"tok-1\""))
        let before = StubURLProtocol.requests.count
        await push.syncSession()
        XCTAssertEqual(StubURLProtocol.requests.count, before)
    }

    // MARK: saisie

    private func pause(_ seconds: TimeInterval) async { try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000)) }

    func testTypingIsThrottledAndTheLastValueAlwaysArrives() async {
        var sent: [String] = []
        let typing = VoxoTypingSender(minInterval: 0.1, isEligible: { true }, send: { sent.append($0); return true })
        typing.submit("b")
        typing.submit("bo")
        typing.submit("bon")
        XCTAssertEqual(sent, ["b"])
        await pause(0.25)
        XCTAssertEqual(sent, ["b", "bon"])
    }

    func testClearingTheFieldSendsAnEmptyFrameAndNeverRepeatsAnUnchangedValue() async {
        var sent: [String] = []
        let typing = VoxoTypingSender(minInterval: 0.05, isEligible: { true }, send: { sent.append($0); return true })
        typing.submit("salut")
        await pause(0.1)
        typing.submit("salut")
        typing.submit("")
        typing.submit("")
        XCTAssertEqual(sent, ["salut", ""])
    }

    func testNothingLeavesTheDeviceUnlessTypingIsAllowedAndTextIsCappedAt500() async {
        var sent: [String] = []
        var allowed = false
        let typing = VoxoTypingSender(minInterval: 0.05, isEligible: { allowed }, send: { sent.append($0); return true })
        typing.submit("secret")
        await pause(0.15)
        XCTAssertTrue(sent.isEmpty)

        allowed = true
        typing.submit(String(repeating: "x", count: 900))
        XCTAssertEqual(sent.first?.count, 500)
    }

    func testAFrameThatCouldNotBeSentIsRetriedOnTheNextChange() async {
        var open = false
        var sent: [String] = []
        let typing = VoxoTypingSender(minInterval: 0.05, isEligible: { true }, send: { if open { sent.append($0); return true } else { return false } })
        typing.submit("a")
        open = true
        await pause(0.1)
        typing.submit("ab")
        XCTAssertEqual(sent, ["ab"])
    }

    // MARK: historique archivé

    private func makeSync(_ config: VoxoConfig, _ state: VoxoConversationState) -> VoxoConversationSync {
        VoxoConversationSync(
            api: VoxoApiClient(config: config, session: session), socket: VoxoSocket(config: config, session: session),
            store: VoxoSessionStore(config: config, store: VoxoMemoryStore()), state: state, config: config)
    }

    func testAnArchivedConversationIsReadWithoutTouchingTheActiveSession() async throws {
        let state = VoxoConversationState(sessionId: "active")
        StubURLProtocol.handler = { _ in
            stubOK(#"{"messages":[{"id":"m1","role":"user","content":"Bonjour"},{"id":"m2","role":"agent","content":"Salut"},{"id":"m2","role":"agent","content":"Salut"}],"handoffStatus":"human","assignedAgent":{"name":"Léa"}}"#)
        }
        let archived = try await makeSync(try makeConfig(), state).loadArchived(sessionId: "old")
        XCTAssertEqual(archived.messages.map { $0.text }, ["Bonjour", "Salut"])
        XCTAssertEqual(archived.handoff.agentName, "Léa")
        XCTAssertEqual(state.sessionId, "active")
        XCTAssertTrue(state.isEmpty)
        XCTAssertTrue(StubURLProtocol.requests[0].url?.absoluteString.contains("/widget/conversation/old?limit=100") == true)
    }

    func testAPurgedArchivedConversationBecomesHistoryUnavailableNotATechnicalError() async throws {
        StubURLProtocol.handler = { _ in (404, #"{"success":false,"error":"x","code":"CONVERSATION_NOT_FOUND"}"#) }
        do {
            _ = try await makeSync(try makeConfig(), VoxoConversationState()).loadArchived(sessionId: "gone")
            XCTFail("aurait dû échouer")
        } catch {
            XCTAssertEqual((error as? VoxoException)?.code, "HISTORY_UNAVAILABLE")
            XCTAssertEqual((error as? VoxoException)?.message, "Historique indisponible")
        }
    }

    func testADuplicatedMessageIdNeverReachesTheUI() {
        let state = VoxoConversationState()
        state.replaceWithHistory([
            VoxoMessage(id: "ag1", serverId: "ag1", role: .agent, text: "Salut"),
            VoxoMessage(id: "ag1", serverId: "ag1", role: .agent, text: "Salut"),
            VoxoMessage(id: "ag2", serverId: "ag2", role: .agent, text: "Ça va ?"),
        ])
        XCTAssertEqual(state.ordered.map { $0.id }, ["ag1", "ag2"])
    }

    func testLiveTypingFeatureIsOffByDefaultAndReadFromTheRemoteConfig() {
        XCTAssertFalse(VoxoChatbotConfig.fromJSON([:]).features.liveTypingPreview)
        let json = decodeJSONObject(#"{"options":{"features":{"liveTypingPreview":true}}}"#) ?? [:]
        XCTAssertTrue(VoxoChatbotConfig.fromJSON(json).features.liveTypingPreview)
        XCTAssertTrue(VoxoOptions().enableLiveTyping)
    }
}
