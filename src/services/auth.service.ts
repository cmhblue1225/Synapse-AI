import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  session: any
}

export class AuthService {
  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })
    
    if (error) throw error
    
    return {
      user: data.user,
      session: data.session
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName
        }
      }
    })
    
    if (error) throw error

    // 프로필이 자동 생성되지 않는 경우를 위해 수동 생성
    if (data.user) {
      await this.createProfile(data.user.id, userData.firstName, userData.lastName)
    }
    
    return {
      user: data.user,
      session: data.session
    }
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // User profile
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async createProfile(userId: string, firstName: string, lastName: string) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        first_name: firstName,
        last_name: lastName
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async updateProfile(userId: string, updates: {
    first_name?: string
    last_name?: string
    avatar_url?: string
    bio?: string
    preferences?: any
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
  }

  // Token management helpers
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  async refreshSession() {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) throw error
    return session
  }

  // Convenience methods
  isAuthenticated(): boolean {
    return !!this.getCurrentUser()
  }

  // Auth state listener
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const authService = new AuthService()