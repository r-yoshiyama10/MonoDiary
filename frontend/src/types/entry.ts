export interface DiaryEntry {
  id: string
  line_user_id: string
  source_text: string
  ai_comment: string
  created_at: string
  updated_at: string
}

export interface EntriesResponse {
  items: DiaryEntry[]
  next_cursor: string | null
}
