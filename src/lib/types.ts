export type Role = 'student' | 'admin'
export interface Profile { id: string; role: Role; full_name: string; group: string; phone: string; email: string }
export interface ScheduleSlot { dow: number; start: string; end: string } // dow: 1 = пн … 6 = сб, 0 = вс
export interface Section { id: string; name: string; color: string; schedule: ScheduleSlot[]; lat: number | null; lng: number | null }
export interface EventRow { id: string; section_id: string; title: string; date: string; start_time: string; end_time: string; lat: number | null; lng: number | null }
export interface Attendance { id: string; user_id: string; event_id: string; created_at: string; status: 'present' | 'absent' }
export type AttendanceFull = Attendance & { events: EventRow & { sections?: Pick<Section, 'name' | 'color'> }; profiles: Pick<Profile, 'full_name' | 'group'> }
