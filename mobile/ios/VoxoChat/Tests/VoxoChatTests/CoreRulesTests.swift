import XCTest
@testable import VoxoChat

final class CoreRulesTests: XCTestCase {
    private let tenant = VoxoUUID.v4()

    func testUuidV4RespectsVersionAndVariantBits() {
        for _ in 0..<200 { XCTAssertTrue(VoxoUUID.isValid(VoxoUUID.v4())) }
        XCTAssertFalse(VoxoUUID.isValid("not-a-uuid"))
        XCTAssertFalse(VoxoUUID.isValid("11111111-1111-1111-1111-111111111111"))
        XCTAssertFalse(VoxoUUID.isValid(nil))
    }

    func testEnvelopeReturnsDataOnSuccess() throws {
        let data = try VoxoEnvelope.unwrap(statusCode: 200, body: #"{"success":true,"data":{"a":1}}"#)
        XCTAssertEqual(data.int("a"), 1)
    }

    func testEnvelopeRelaysTheServerErrorVerbatim() {
        XCTAssertThrowsError(try VoxoEnvelope.unwrap(
            statusCode: 429, body: #"{"success":false,"error":"Trop vite","code":"RATE_LIMIT_EXCEEDED"}"#)
        ) { error in
            let voxo = error as? VoxoException
            XCTAssertEqual(voxo?.message, "Trop vite")
            XCTAssertEqual(voxo?.isRateLimited, true)
            XCTAssertEqual(voxo?.statusCode, 429)
        }
    }

    func testEnvelopeFallsBackOnUnreadableFailureBodyAndKeepsTheStatus() {
        XCTAssertThrowsError(try VoxoEnvelope.unwrap(statusCode: 502, body: "<html>")) { error in
            XCTAssertEqual((error as? VoxoException)?.message, VoxoI18n.text("fr", "unavailable"))
            XCTAssertEqual((error as? VoxoException)?.statusCode, 502)
        }
        XCTAssertThrowsError(try VoxoEnvelope.unwrap(statusCode: 404, body: "")) { error in
            XCTAssertEqual((error as? VoxoException)?.isNotFound, true)
        }
    }

    func testEnvelopeRejectsASuccessfulButMalformedBody() {
        XCTAssertThrowsError(try VoxoEnvelope.unwrap(statusCode: 200, body: "oops")) { error in
            XCTAssertEqual((error as? VoxoException)?.code, "MALFORMED_RESPONSE")
        }
    }

    func testRateLimiterBlocksThe16thMessageAndFreesItAfterTheWindow() {
        var now: TimeInterval = 0
        let limiter = VoxoRateLimiter(clock: { now })
        for _ in 0..<VoxoLimits.messagesPerMinute { XCTAssertTrue(limiter.tryConsume()) }
        XCTAssertFalse(limiter.tryConsume())
        XCTAssertGreaterThan(limiter.cooldown(), 0)
        now += 60.001
        XCTAssertTrue(limiter.tryConsume())
    }

    func testSocketBackoffDoublesThenCapsAt15Seconds() {
        XCTAssertEqual((0...6).map { VoxoLimits.reconnectDelay(attempt: $0) }, [1, 2, 4, 8, 15, 15, 15])
        XCTAssertEqual(VoxoLimits.reconnectDelay(attempt: 10_000), 15)
    }

    func testI18nCatalogsHaveTheSameKeys() {
        XCTAssertTrue(VoxoI18n.catalogsHaveParity)
        XCTAssertEqual(VoxoI18n.text("en", "defaultWelcome"), "Hello! How can I help you?")
        XCTAssertEqual(VoxoI18n.text("de", "defaultWelcome"), "Bonjour ! Comment puis-je vous aider ?")
    }

    func testConfigNormalizesTheApiUrlAndBuildsTheSocketUrl() throws {
        let config = try VoxoConfig(apiUrl: "https://api.voxo.chat/api/?x=1#f", tenantId: tenant)
        XCTAssertEqual(config.apiUrl, "https://api.voxo.chat/api")
        XCTAssertEqual(
            config.conversationSocketURL(sessionId: "a/b")?.absoluteString,
            "wss://api.voxo.chat/api/widget/conversation/a%2Fb/socket?tenantId=\(tenant)")
        let local = try VoxoConfig(apiUrl: "http://10.0.2.2:3000/api", tenantId: tenant)
        XCTAssertEqual(local.apiUrl, "http://10.0.2.2:3000/api")
        XCTAssertTrue(local.conversationSocketURL(sessionId: "s")?.absoluteString.hasPrefix("ws://10.0.2.2:3000/") == true)
    }

    func testConfigRejectsABadTenantOrUrl() {
        XCTAssertThrowsError(try VoxoConfig(apiUrl: "https://x/api", tenantId: "nope")) {
            XCTAssertEqual(($0 as? VoxoException)?.code, "INVALID_CONFIG")
        }
        XCTAssertThrowsError(try VoxoConfig(apiUrl: "ftp://x/api", tenantId: tenant)) {
            XCTAssertEqual(($0 as? VoxoException)?.code, "INVALID_CONFIG")
        }
        XCTAssertThrowsError(try VoxoConfig(apiUrl: "", tenantId: tenant)) {
            XCTAssertEqual(($0 as? VoxoException)?.code, "INVALID_CONFIG")
        }
    }

    func testFileRulesMirrorTheSharedRules() {
        XCTAssertTrue(VoxoFileRules.validate("a.PDF", sizeBytes: 10).isValid)
        XCTAssertEqual(VoxoFileRules.validate("a.pdf", sizeBytes: 0).error, VoxoI18n.text("fr", "fileEmpty"))
        XCTAssertTrue(VoxoFileRules.validate("a.exe", sizeBytes: 10).error?.contains(".pdf") == true)
        XCTAssertTrue(VoxoFileRules.validate("a.png", sizeBytes: VoxoFileRules.maxFileBytes + 1).error?.contains("10,0 Mo") == true)
        XCTAssertEqual(VoxoFileRules.formatSize(1_572_864), "1,5 Mo")
        XCTAssertEqual(VoxoFileRules.formatSize(10), "1 Ko")
        XCTAssertEqual(VoxoFileRules.conversationExtensions.count, 14)
        XCTAssertEqual(VoxoFileRules.categoryOf("photo.JPEG"), .image)
        XCTAssertEqual(VoxoFileRules.extensionOf("archive"), "")
    }
}
