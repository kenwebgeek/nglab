export interface User {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  currentActivity?: string;
  admin?: boolean;
}

export type UserUpdate = User & { newPassword?: string };
