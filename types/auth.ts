import { DefaultSession, DefaultJWT } from 'next-auth'

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export type SessionUser = {
  id: string
  role: UserRole
} & DefaultSession['user']

declare module 'next-auth' {
  interface Session {
    user: SessionUser
  }

  interface User {
    role?: UserRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: UserRole
  }
}
