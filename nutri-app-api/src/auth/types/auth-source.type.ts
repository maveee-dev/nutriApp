import { UserSource } from '../../users/sources/user.source.js';

export type AuthResponseSource = {
  accessToken: string;
  user: UserSource;
  refreshToken: string;
}
