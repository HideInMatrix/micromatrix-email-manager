export default defineNuxtRouteMiddleware(async (to) => {
  const isDashboard = to.path.startsWith('/dashboard')
  const isMailboxHome = to.path === '/'

  if (!isDashboard && !isMailboxHome) {
    return
  }

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const session = await $fetch<{
    configured: boolean
    authenticated: boolean
    isAdmin: boolean
  }>('/api/admin/session', { headers }).catch(() => ({
    configured: false,
    authenticated: false,
    isAdmin: false
  }))

  if (!session.configured || !session.authenticated) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    })
  }

  if (isDashboard && !session.isAdmin) {
    return navigateTo('/')
  }
})
