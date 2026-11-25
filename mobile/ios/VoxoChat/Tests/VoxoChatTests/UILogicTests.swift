import XCTest
@testable import VoxoChat

final class UILogicTests: XCTestCase {
    // MARK: Markdown

    func testSafeUrlAllowsOnlyWebMailAndPhoneSchemes() {
        XCTAssertEqual(VoxoSafeURL.sanitize(" https://a.b/c "), "https://a.b/c")
        XCTAssertEqual(VoxoSafeURL.sanitize("mailto:x@y.z"), "mailto:x@y.z")
        XCTAssertEqual(VoxoSafeURL.sanitize("tel:+33123"), "tel:+33123")
        XCTAssertNil(VoxoSafeURL.sanitize("javascript:alert(1)"))
        XCTAssertNil(VoxoSafeURL.sanitize("JaVaScRiPt:alert(1)"))
        XCTAssertNil(VoxoSafeURL.sanitize("/relative"))
        XCTAssertNil(VoxoSafeURL.sanitize("https://a.b/\u{0}x"))
        XCTAssertNil(VoxoSafeURL.sanitize("no-scheme"))
        XCTAssertNil(VoxoSafeURL.sanitize(nil))
    }

    func testTrailingPunctuationIsNotPartOfABareUrl() {
        let (url, trailing) = VoxoSafeURL.splitTrailingPunctuation("https://a.b).")
        XCTAssertEqual(url, "https://a.b")
        XCTAssertEqual(trailing, ").")
    }

    func testBlocksSplitParagraphsListsAndCode() {
        let blocks = VoxoBlockParser.parse("Intro\nsuite\n\n- a\n- b\n1. un\n\n```\ncode\n```\nfin")
        XCTAssertEqual(blocks.map { $0.kind }, [.paragraph, .bulletList, .orderedList, .codeBlock, .paragraph])
        XCTAssertEqual(blocks[1].lines, ["a", "b"])
        XCTAssertEqual(blocks[3].lines, ["code"])
    }

    func testUnterminatedCodeFenceRunsToTheEndAndOversizedTextStaysRaw() {
        XCTAssertEqual(VoxoBlockParser.parse("```\na\nb").first?.lines, ["a", "b"])
        let huge = String(repeating: "- x\n", count: 3000)
        XCTAssertEqual(VoxoBlockParser.parse(huge).first?.kind, .paragraph)
    }

    func testInlineStylesNestAndLinksAreSanitized() {
        let spans = VoxoInlineParser.parse("**gras _et italique_** `c` [ok](https://a.b) [bad](javascript:x) voir https://c.d.")
        XCTAssertTrue(spans.contains { $0.bold && $0.italic && $0.text == "et italique" })
        XCTAssertTrue(spans.contains { $0.code && $0.text == "c" })
        XCTAssertEqual(spans.first { $0.text == "ok" }?.href, "https://a.b")
        XCTAssertNil(spans.first { $0.text == "bad" }?.href)
        XCTAssertEqual(spans.first { $0.text == "https://c.d" }?.href, "https://c.d")
        XCTAssertEqual(spans.last?.text, ".")
    }

    // MARK: Thème

    func testColorsParseShortLongAndAlphaHexAndRejectGarbage() {
        XCTAssertEqual(VoxoColor.parse("#3b82f6"), VoxoRGBA(0x3b / 255.0, 0x82 / 255.0, 0xf6 / 255.0))
        XCTAssertEqual(VoxoColor.parse("abc"), VoxoRGBA(0xaa / 255.0, 0xbb / 255.0, 0xcc / 255.0))
        XCTAssertEqual(VoxoColor.parse("#80112233")?.alpha ?? 0, 0x80 / 255.0, accuracy: 0.001)
        XCTAssertNil(VoxoColor.parse("rouge"))
        XCTAssertNil(VoxoColor.parse("#12"))
        XCTAssertNil(VoxoColor.parse(nil))
    }

    func testTextOnABubbleStaysReadableOnLightAndDarkAccents() {
        XCTAssertEqual(VoxoColor.onColor(VoxoRGBA(hex: 0xfde047)), VoxoRGBA(hex: 0x111827))
        XCTAssertEqual(VoxoColor.onColor(VoxoRGBA(hex: 0x1e3a8a)), .white)
    }

    func testOwnerSchemeWinsOverTheSystemOtherwiseTheSystemDecides() {
        var none = VoxoChatbotConfig()
        XCTAssertFalse(VoxoTheme.fromConfig(none, systemDark: false).isDark)
        XCTAssertTrue(VoxoTheme.fromConfig(none, systemDark: true).isDark)
        none.colorScheme = "dark"
        XCTAssertTrue(VoxoTheme.fromConfig(none, systemDark: false).isDark)
        none.colorScheme = "light"
        XCTAssertFalse(VoxoTheme.fromConfig(none, systemDark: true).isDark)
    }

    func testAnInvalidAccentFallsBackToTheDefaultBlue() {
        var config = VoxoChatbotConfig()
        config.primaryColor = "n'importe quoi"
        XCTAssertEqual(VoxoTheme.fromConfig(config).accent, VoxoRGBA(hex: 0x3b82f6))
    }

    // MARK: Dates

    func testDaySeparatorsAreLocalized() {
        let utc = TimeZone(identifier: "UTC")!
        let now = VoxoDates.parse("2026-11-17T12:00:00Z")!
        func label(_ iso: String, _ locale: String) -> String {
            VoxoDateLabels.daySeparator(VoxoDates.parse(iso)!, now: now, locale: locale, timeZone: utc)
        }
        XCTAssertEqual(label("2026-11-17T01:00:00Z", "fr"), "Aujourd’hui")
        XCTAssertEqual(label("2026-11-16T23:00:00Z", "en"), "Yesterday")
        XCTAssertEqual(label("2026-01-03T10:00:00Z", "fr"), "3 janvier 2026")
        XCTAssertEqual(label("2026-01-03T10:00:00Z", "en"), "January 3, 2026")
        XCTAssertEqual(VoxoDateLabels.time(VoxoDates.parse("2026-11-17T09:05:00Z")!, timeZone: utc), "09:05")
    }
}
