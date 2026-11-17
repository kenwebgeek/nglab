// The sign-up form's values. The profile fields are the same ones a User has; the API stores
// them as a user and keeps only a hash of the password.
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nickname: string;
}
