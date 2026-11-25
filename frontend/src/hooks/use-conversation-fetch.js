import { useEffect } from 'react'

export function useConversationFetch(selectedConversation, fetchHistory) {
    const sessionId = selectedConversation?.sessionId
    const hasNoMessages = !selectedConversation?.messages?.length

    useEffect(() => {
        if (sessionId && hasNoMessages) {
            fetchHistory(sessionId)
        }
    }, [sessionId, hasNoMessages, fetchHistory])
}
