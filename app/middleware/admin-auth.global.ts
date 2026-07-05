export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/dashboard')) {
    return
  }

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const session = await $fetch<{
    configured: boolean
    authenticated: boolean
  }>('/api/admin/session', { headers }).catch(() => ({
    configured: false,
    authenticated: false
  }))

  if (!session.configured || !session.authenticated) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }
})
