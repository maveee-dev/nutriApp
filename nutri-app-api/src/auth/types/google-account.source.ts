export interface GoogleAccountSource {
  readonly providerId: string;
  readonly email: string;
  readonly emailVerified: boolean;
}
