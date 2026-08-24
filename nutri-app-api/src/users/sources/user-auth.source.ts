export interface UserAuthSource {
  id: string;
  email: string;
  password: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
