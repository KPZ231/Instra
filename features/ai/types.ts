export interface GenerateCaptionState {
  text?: string
  errors?: {
    _form?: string[]
    prompt?: string[]
  }
}
