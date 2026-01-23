export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/friends/:path*', '/invitations/:path*', '/meetup/:path*'],
}
