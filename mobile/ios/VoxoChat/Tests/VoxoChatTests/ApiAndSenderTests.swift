import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import VoxoChat

/// Remplace le réseau : chaque requête est enregistrée puis servie par `handler`.
final class StubURLProtocol: URLProtocol {
    static var handler: ((URLRequest) -> (Int, String))?
    static var requests: [URLRequest] = []
    static var bodies: [Data] = []

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        var body = request.httpBody ?? Data()
        if body.isEmpty, let stream = request.httpBodyStream {
            stream.open()
            var buffer = [UInt8](repeating: 0, count: 4096)
            while stream.hasBytesAvailable {
                let count = stream.read(&buffer, maxLength: buffer.count)
                if count <= 0 { break }
                body.append(buffer, count: count)
            }
            stream.close()
        }
        Self.requests.append(request)
        Self.bodies.append(body)
        let (status, text) = Self.handler?(request) ?? (500, "")
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(text.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    static func reset() { handler = nil; requests = []; bodies = [] }
}

/// Réponse d'enveloppe de succès, utilisable depuis le thread réseau du stub.
func stubOK(_ data: String, status: Int = 200) -> (Int, String) {
    (status, "{\"success\":true,\"data\":" + data + "}")
}

@MainActor
final class ApiAndSenderTests: XCTestCase {
    private let tenant = VoxoUUID.v4()
    private var config: VoxoConfig!
    private var api: VoxoApiClient!

    override func setUp() async throws {
        StubURLProtocol.reset()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        config = try VoxoConfig(apiUrl: "https://api.test/api", tenantId: tenant)
        api = VoxoApiClient(config: config, session: URLSession(configuration: configuration))
    }

    func testEveryRequestCarriesTheTenantAndLanguageHeaders() async {
        StubURLProtocol.handler = { _ in stubOK(#"{"status":"healthy"}"#) }
        let healthy = await api.isHealthy()
        XCTAssertTrue(healthy)
        let request = StubURLProtocol.requests[0]
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Tenant-ID"), tenant)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept-Language"), "fr")
        XCTAssertNil(request.value(forHTTPHeaderField: "Origin"))
        XCTAssertEqual(request.url?.path, "/api/widget/health")
    }

    func testUploadSendsAMultipartBodyWithAFieldNamedFile() async throws {
        StubURLProtocol.handler = { _ in stubOK(#"{"id":"x"}"#, status: 201) }
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("voxo-test.txt")
        try "hello".write(to: file, atomically: true, encoding: .utf8)
        _ = try await api.uploadAttachment(fileURL: file, mimeType: "text/plain")
        let contentType = StubURLProtocol.requests[0].value(forHTTPHeaderField: "Content-Type") ?? ""
        XCTAssertTrue(contentType.hasPrefix("multipart/form-data; boundary="))
        let body = String(data: StubURLProtocol.bodies[0], encoding: .utf8) ?? ""
        XCTAssertTrue(body.contains("name=\"file\"; filename=\"voxo-test.txt\""))
        XCTAssertTrue(body.contains("hello"))
    }

    func testA404OnHistoryIsSurfacedAsNotFound() async {
        StubURLProtocol.handler = { _ in (404, #"{"success":false,"error":"x","code":"NOT_FOUND"}"#) }
        do {
            _ = try await api.getConversation(sessionId: "s")
            XCTFail("aurait dû échouer")
        } catch {
            XCTAssertEqual((error as? VoxoException)?.isNotFound, true)
        }
    }

    private func makeSender(_ state: VoxoConversationState, errors: ErrorBox, replaced: ErrorBox) -> VoxoMessageSender {
        VoxoMessageSender(
            api: api, config: config, state: state, rateLimiter: VoxoRateLimiter(),
            onChanged: {}, onError: { errors.items.append($0) },
            onSessionReplaced: { replaced.items.append($0) }, userId: { "user-1" })
    }

    final class ErrorBox { var items: [String] = [] }

    func testSendAdoptsANewServerSessionAndDedupesTheReply() async throws {
        let state = VoxoConversationState(sessionId: "old-session")
        let replaced = ErrorBox()
        StubURLProtocol.handler = { _ in
            stubOK(#"{"sessionId":"new-session","response":"Salut","userMessageId":"u1","assistantMessageId":"a1","suggestions":["Oui"]}"#)
        }
        let sent = await makeSender(state, errors: ErrorBox(), replaced: replaced).send(text: "Bonjour")
        XCTAssertTrue(sent)

        XCTAssertEqual(state.sessionId, "new-session")
        XCTAssertEqual(replaced.items, ["old-session"])
        XCTAssertEqual(state.messages.count, 2)
        let user = state.messages[0], reply = state.messages[1]
        XCTAssertEqual(user.deliveryStatus, .answered)
        XCTAssertEqual(user.serverId, "u1")
        XCTAssertEqual(reply.role, .assistant)
        XCTAssertEqual(reply.suggestions, ["Oui"])

        let body = String(data: StubURLProtocol.bodies[0], encoding: .utf8) ?? ""
        XCTAssertTrue(body.contains("\"clientMessageId\":\"\(user.id)\""))
        XCTAssertTrue(body.contains("\"sdk\":\"ios\""))
        XCTAssertFalse(body.contains("attachmentIds"))
    }

    func testAFailedSendKeepsTheMessageForRetryWithTheSameClientId() async {
        let state = VoxoConversationState(sessionId: "s")
        let errors = ErrorBox()
        StubURLProtocol.handler = { _ in (500, #"{"success":false,"error":"Panne"}"#) }
        let sender = makeSender(state, errors: errors, replaced: ErrorBox())
        let first = await sender.send(text: "Bonjour")
        XCTAssertFalse(first)

        guard let failed = state.lastFailed else { return XCTFail("pas de message en échec") }
        XCTAssertEqual(errors.items, ["Panne"])
        StubURLProtocol.handler = { _ in stubOK(#"{"sessionId":"s","userMessageId":"u2"}"#) }
        let retried = await sender.send(text: failed.text, attachmentIds: failed.pendingAttachmentIds, retryOf: failed)
        XCTAssertTrue(retried)
        XCTAssertEqual(state.messages.count, 1)
        XCTAssertEqual(state.messages[0].id, failed.id)
        XCTAssertTrue((String(data: StubURLProtocol.bodies[1], encoding: .utf8) ?? "").contains(failed.id))
    }

    func testLocalValidationBlocksOversizedMessagesWithoutARequest() async {
        let errors = ErrorBox()
        let state = VoxoConversationState()
        let sent = await makeSender(state, errors: errors, replaced: ErrorBox()).send(text: String(repeating: "x", count: 2001))
        XCTAssertFalse(sent)
        XCTAssertEqual(errors.items.count, 1)
        XCTAssertEqual(StubURLProtocol.requests.count, 0)
        XCTAssertTrue(state.isEmpty)
    }
}
