export type ConnectionRole = 'parent' | 'tutor'
export interface BookingMessage {
  id: string
  senderRole: ConnectionRole
  text: string
  createdAt: string
}
export interface BookingMessageInput { requestId: string; text: string }
export interface BookingMessageQuery { pageSize?: number; beforeId?: string }
export interface BookingConnectionPage {
  bookingId: string
  status: string
  canSend: boolean
  areaLabel: string | null
  messages: BookingMessage[]
  nextBeforeId: string | null
}
export interface BookingConnectionService {
  list(bookingId: string, query?: BookingMessageQuery): Promise<BookingConnectionPage>
  send(bookingId: string, input: BookingMessageInput): Promise<BookingMessage>
}
