import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Client REST du widget : **seul** point de sortie réseau du SDK. Pose `X-Tenant-ID` et
/// `Accept-Language` sur chaque requête. Pas d'en-tête `Origin` : un client natif n'en envoie pas.
final class VoxoApiClient {
    private let config: VoxoConfig
    private let session: URLSession

    init(config: VoxoConfig, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    func sendMessage(
        message: String,
        sessionId: String,
        clientMessageId: String,
        userId: String,
        userName: String? = nil,
        userEmail: String? = nil,
        attachmentIds: [String] = [],
        metadata: [String: String] = [:]
    ) async throws -> JSONObject {
        var body: JSONObject = [
            "message": message,
            "sessionId": sessionId,
            "clientMessageId": clientMessageId,
            "userId": userId,
            "metadata": metadata.merging(["locale": config.locale]) { _, new in new },
        ]
        if let userName { body["userName"] = userName }
        if let userEmail { body["userEmail"] = userEmail }
        if !attachmentIds.isEmpty { body["attachmentIds"] = attachmentIds }
        return try await send(try post("/widget/message", body))
    }

    /// Un seul fichier, champ `file`. URLSession n'écrit pas de multipart : le corps et son
    /// `boundary` (unique par envoi) sont construits ici, et l'en-tête les référence.
    func uploadAttachment(fileURL: URL, mimeType: String?) async throws -> JSONObject {
        guard let data = try? Data(contentsOf: fileURL) else {
            throw VoxoException(VoxoI18n.text(config.locale, "fileUnreadable"))
        }
        let boundary = "voxo-\(VoxoUUID.v4())"
        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileURL.lastPathComponent)\"\r\n")
        body.append("Content-Type: \(mimeType ?? "application/octet-stream")\r\n\r\n")
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n")

        var request = try makeRequest("/widget/upload", method: "POST")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        return try await send(request, timeout: VoxoLimits.uploadTimeout)
    }

    func getConversation(sessionId: String, limit: Int = 50, offset: Int = 0) async throws -> JSONObject {
        let path = "/widget/conversation/\(VoxoConfig.encodeSegment(sessionId))"
        return try await send(makeRequest(path, query: ["limit": "\(limit)", "offset": "\(offset)"]))
    }

    func endConversation(
        sessionId: String,
        rating: Int? = nil,
        feedback: String? = nil,
        sessionDurationMs: Int64? = nil,
        messageCount: Int? = nil
    ) async throws -> JSONObject {
        var body: JSONObject = [
            "sessionDuration": sessionDurationMs.map { $0 as Any } ?? NSNull(),
            "messageCount": messageCount.map { $0 as Any } ?? NSNull(),
        ]
        if let rating { body["rating"] = rating }
        if let feedback, !feedback.isEmpty { body["feedback"] = feedback }
        return try await postConversation(sessionId, "end", body)
    }

    func endConversationForInactivity(sessionId: String, sessionDurationMs: Int64? = nil, messageCount: Int? = nil) async throws -> JSONObject {
        try await postConversation(sessionId, "timeout", [
            "sessionDuration": sessionDurationMs.map { $0 as Any } ?? NSNull(),
            "messageCount": messageCount.map { $0 as Any } ?? NSNull(),
        ])
    }

    /// `value` vaut `up`, `down` ou nil pour retirer l'avis.
    func sendMessageFeedback(sessionId: String, messageId: String? = nil, messageIndex: Int? = nil, value: String? = nil) async throws -> JSONObject {
        var body: JSONObject = ["value": value.map { $0 as Any } ?? NSNull()]
        if let messageId { body["messageId"] = messageId }
        if let messageIndex { body["messageIndex"] = messageIndex }
        return try await postConversation(sessionId, "message-feedback", body)
    }

    /// Lie le jeton de notification à la session courante (voir CONTRACT.md).
    func registerPushToken(sessionId: String, token: String, platform: String, locale: String) async throws -> JSONObject {
        try await send(post("/widget/push-token", ["sessionId": sessionId, "token": token, "platform": platform, "locale": locale]))
    }

    func unregisterPushToken(_ token: String) async throws -> JSONObject {
        var request = try post("/widget/push-token", ["token": token])
        request.httpMethod = "DELETE"
        return try await send(request)
    }

    func getConfig() async throws -> JSONObject { try await send(makeRequest("/widget/config")) }

    func getQuickReplies(category: String = "greeting") async throws -> JSONObject {
        try await send(makeRequest("/widget/quick-replies", query: ["category": category]))
    }

    func isHealthy() async -> Bool {
        guard let request = try? makeRequest("/widget/health"),
              let data = try? await send(request, timeout: VoxoLimits.healthTimeout) else { return false }
        return data.string("status") == "healthy"
    }

    // MARK: - Requêtes

    private func makeRequest(_ path: String, method: String = "GET", query: [String: String] = [:]) throws -> URLRequest {
        guard let url = config.restURL(path, query: query) else {
            throw VoxoException(VoxoI18n.text(config.locale, "invalidApiUrl"), code: "INVALID_CONFIG")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(config.tenantId, forHTTPHeaderField: "X-Tenant-ID")
        request.setValue(config.locale, forHTTPHeaderField: "Accept-Language")
        if let appId = config.appId { request.setValue(appId, forHTTPHeaderField: "X-App-Id") }
        return request
    }

    private func post(_ path: String, _ body: JSONObject) throws -> URLRequest {
        var request = try makeRequest(path, method: "POST")
        request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        request.httpBody = encodeJSON(body).data(using: .utf8)
        return request
    }

    private func postConversation(_ sessionId: String, _ action: String, _ body: JSONObject) async throws -> JSONObject {
        try await send(post("/widget/conversation/\(VoxoConfig.encodeSegment(sessionId))/\(action)", body))
    }

    private func send(_ request: URLRequest, timeout: TimeInterval = VoxoLimits.requestTimeout) async throws -> JSONObject {
        var request = request
        request.timeoutInterval = timeout
        let locale = config.locale
        do {
            let (data, response) = try await perform(request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            return try VoxoEnvelope.unwrap(statusCode: status, body: String(data: data, encoding: .utf8) ?? "", locale: locale)
        } catch let error as VoxoException {
            throw error
        } catch let error as URLError where error.code == .timedOut {
            throw VoxoException.timeout(locale)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            throw VoxoException.network(locale)
        }
    }

    /// `URLSession.data(for:)` n'existe pas partout (Linux, Windows) : on passe par un dataTask.
    private func perform(_ request: URLRequest) async throws -> (Data, URLResponse) {
        try await withCheckedThrowingContinuation { continuation in
            let task = session.dataTask(with: request) { data, response, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let data, let response {
                    continuation.resume(returning: (data, response))
                } else {
                    continuation.resume(throwing: URLError(.badServerResponse))
                }
            }
            task.resume()
        }
    }
}

private extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) { append(data) }
    }
}
