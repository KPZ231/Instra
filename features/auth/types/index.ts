export type AuthActionState = {
  errors?: {
    name?: string[]
    email?: string[]
    username?: string[]
    password?: string[]
    confirmPassword?: string[]
    terms?: string[]
    code?: string[]
    _form?: string[]
  }
  message?: string
  success?: boolean
}
