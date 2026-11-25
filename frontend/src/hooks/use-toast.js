import { useMemo } from 'react'
import { toast as sonnerToast } from 'sonner'

export const useToast = () => {
  return useMemo(() => ({
    toast: {
      success: (message, options = {}) => {
        sonnerToast.success(message, {
          duration: 4000,
          ...options
        })
      },
      error: (message, options = {}) => {
        sonnerToast.error(message, {
          duration: 5000,
          ...options
        })
      },
      warning: (message, options = {}) => {
        sonnerToast.warning(message, {
          duration: 4000,
          ...options
        })
      },
      info: (message, options = {}) => {
        sonnerToast.info(message, {
          duration: 4000,
          ...options
        })
      },
      loading: (message, options = {}) => {
        return sonnerToast.loading(message, options)
      },
      promise: (promise, messages) => {
        return sonnerToast.promise(promise, messages)
      },
      dismiss: (toastId) => {
        sonnerToast.dismiss(toastId)
      },
    }
  }), [])
}