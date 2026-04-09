export interface DiaryEntry {
  id: string
  line_user_id: string
  source_text: string
  diary_text: string
  created_at: string
  updated_at: string
}

export interface EntriesResponse {
  entries: DiaryEntry[]
  next_cursor: string | null
}
