export interface UserVerificationSource {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}

