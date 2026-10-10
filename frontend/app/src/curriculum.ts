export type SubjectColor = 'butter' | 'lavender' | 'blue' | 'sage' | 'peach'
export interface ClassSession { id: string; day: number; start: number; end: number }
export interface CourseSubject {
  id: string
  title: string
  color: SubjectColor
  sessions: ClassSession[]
}
export interface Curriculum { subjects: CourseSubject[] }
export const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// The supplied ETH timetable. Times are used only to preserve the original spacing.
export const exampleCurriculum: Curriculum = {
  subjects: [
    { id: 'analysis', title: 'Analysis', color: 'butter', sessions: blocks('analysis', [[0, 10, 12], [2, 8, 10], [3, 8, 10], [4, 10, 12]]) },
    { id: 'informatik', title: 'Informatik', color: 'lavender', sessions: blocks('informatik', [[0, 8, 10], [1, 10, 12], [2, 10, 12]]) },
    { id: 'lineare-algebra', title: 'Lineare Algebra', color: 'blue', sessions: blocks('lineare-algebra', [[1, 8, 10], [4, 8, 10]]) },
    { id: 'physik', title: 'Physik', color: 'sage', sessions: blocks('physik', [[1, 16, 17], [1, 17, 18], [2, 12, 13], [3, 10, 11], [3, 16, 18]]) },
    { id: 'diskrete-mathematik', title: 'Diskrete Mathematik', color: 'peach', sessions: blocks('diskrete-mathematik', [[0, 14, 16], [0, 16, 18], [1, 14, 16], [2, 14, 16]]) },
  ],
}
function blocks(subject: string, sessions: [number, number, number][]): ClassSession[] {
  return sessions.map(([day, start, end], index) => ({ id: `${subject}-${index}`, day, start, end }))
}
