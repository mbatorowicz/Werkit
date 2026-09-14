/** Twardy max treści notatki sesji (S2) — `session_notes.note` jest `text`, limit jest w serwisie. */
export const SESSION_NOTE_MAX_LENGTH = 4000;

export function assertSessionNoteLength(note: string): void {
  if (note.length > SESSION_NOTE_MAX_LENGTH) {
    throw new Error("note_too_long");
  }
}
