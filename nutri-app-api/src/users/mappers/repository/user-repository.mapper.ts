import { User as PrismaUser } from '../../../../generated/prisma/client.js';
import { UserSource } from '../../sources/user.source.js';

export class UserRepositoryMapper {
  static toUserSource(row: PrismaUser): UserSource {
    return {
      id: row.id,
      email: row.email,
      createdAt: row.createdAt,
    };
  }
}
