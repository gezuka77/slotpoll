import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'super_user' | 'admin' | 'normal'
      suspended: boolean
    } & DefaultSession['user']
  }

  interface User {
    role: 'super_user' | 'admin' | 'normal'
    suspended: boolean
  }
}
