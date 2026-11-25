// frontend/src/hooks/use-crawl.js - Suivi d'un crawl multi-pages par polling
import { useState, useEffect, useCallback, useRef } from 'react'
import { knowledgeAPI, knowledgeHelpers } from '@/lib/api-knowledge'
import { useToast } from './use-toast'

const POLL_INTERVAL_MS = 2000

export const useCrawl = ({ onFinished } = {}) => {
  const { toast } = useToast()

  const [job, setJob] = useState(null)
  const [starting, setStarting] = useState(false)

  const pollTimerRef = useRef(null)
  const onFinishedRef = useRef(onFinished)

  // Garder la dernière callback sans relancer le polling à chaque rendu
  useEffect(() => {
    onFinishedRef.current = onFinished
  }, [onFinished])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // Interroger l'état du crawl jusqu'à son terme
  const pollJob = useCallback(async (jobId) => {
    try {
      const response = await knowledgeAPI.getCrawlJob(jobId)
      const current = response.data

      setJob(current)

      if (current.isFinished) {
        stopPolling()

        if (current.status === 'completed') {
          toast.success(`${current.pagesIndexed} page(s) indexée(s) depuis ${current.rootUrl}`)
        } else if (current.status === 'partial') {
          toast.warning(current.failureMessage || 'Crawl partiellement terminé')
        } else {
          toast.error(current.failureMessage || 'Le crawl a échoué')
        }

        if (onFinishedRef.current) await onFinishedRef.current(current)
        return
      }

      pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS)
    } catch {
      stopPolling()
      toast.error('Impossible de suivre l\'avancement du crawl')
    }
  }, [stopPolling, toast])

  // Démarrer un crawl : la réponse est immédiate (202), le suivi se fait ensuite
  const startCrawl = useCallback(async (url, options = {}) => {
    const validation = knowledgeHelpers.validateUrl(url)
    if (!validation.isValid) {
      toast.error(validation.error)
      throw new Error(validation.error)
    }

    setStarting(true)
    try {
      const response = await knowledgeAPI.crawlSite(url, options)
      const created = response.data

      setJob(created)
      pollJob(created.id)

      return created
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Impossible de démarrer le crawl'
      toast.error(message)
      throw error
    } finally {
      setStarting(false)
    }
  }, [pollJob, toast])

  const reset = useCallback(() => {
    stopPolling()
    setJob(null)
  }, [stopPolling])

  // Arrêter le polling si le composant est démonté
  useEffect(() => stopPolling, [stopPolling])

  return {
    job,
    starting,
    isRunning: !!job && !job.isFinished,
    startCrawl,
    reset
  }
}
