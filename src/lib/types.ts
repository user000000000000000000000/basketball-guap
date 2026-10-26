export type Role = 'student' | 'admin'
export interface Profile { id: string; role: Role; full_name: string; group: string; phone: string; email: string }
export interface EventRow { id: string; title: string; date: string; start_time: string; end_time: string; lat: number | null; lng: number | null }
export interface Attendance { id: string; user_id: string; event_id: string; created_at: string; status: 'present' | 'absent' }
export type AttendanceFull = Attendance & { events: EventRow; profiles: Pick<Profile, 'full_name' | 'group'> }
