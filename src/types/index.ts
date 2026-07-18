export type DomainSlug = string

export type TaskStatus = 'todo' | 'in_progress' | 'waiting'

export type HabitFrequency = 'daily' | 'weekly'

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface Domain {
  id: string
  user_id: string
  slug: DomainSlug
  name: string
  sort_order: number
  created_at: string
  archived_at: string | null
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  is_pinned: boolean
  completed: boolean
  completed_at: string | null
  due_date: string | null
  status: TaskStatus
  domain: DomainSlug
  created_at: string
  archived_at: string | null
}

export interface Habit {
  id: string
  user_id: string
  name: string
  category: string | null
  frequency: HabitFrequency
  days_of_week: DayOfWeek[] | null
  domain: DomainSlug
  is_active: boolean
  created_at: string
  archived_at: string | null
}

export interface HabitCompletion {
  id: string
  user_id: string
  habit_id: string
  completion_date: string
  created_at: string
}

export type TaskInsert = Omit<
  Task,
  | 'id'
  | 'user_id'
  | 'created_at'
  | 'archived_at'
  | 'completed'
  | 'completed_at'
  | 'is_pinned'
  | 'status'
> & {
  is_pinned?: boolean
  completed?: boolean
  completed_at?: string | null
  status?: TaskStatus
}

export type TaskUpdate = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'category'
    | 'is_pinned'
    | 'completed'
    | 'completed_at'
    | 'due_date'
    | 'status'
    | 'domain'
    | 'archived_at'
  >
>

export type HabitInsert = Omit<
  Habit,
  'id' | 'user_id' | 'created_at' | 'archived_at' | 'is_active'
> & {
  is_active?: boolean
}

export type HabitUpdate = Partial<
  Pick<
    Habit,
    | 'name'
    | 'category'
    | 'frequency'
    | 'days_of_week'
    | 'domain'
    | 'is_active'
    | 'archived_at'
  >
>

export type DomainInsert = Omit<
  Domain,
  'id' | 'user_id' | 'created_at' | 'archived_at'
> & {
  archived_at?: string | null
}

export type DomainUpdate = Partial<
  Pick<Domain, 'name' | 'slug' | 'sort_order' | 'archived_at'>
>
