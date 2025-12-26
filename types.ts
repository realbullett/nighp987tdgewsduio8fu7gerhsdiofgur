
export interface UserProfile {
  id: string;
  username: string;
  access_key: string;
}

export enum AuthView {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER'
}
