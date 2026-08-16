import { Prisma } from "../../../generated/prisma/client.js";

export function throwIfPrismaNotFound(
  error: unknown,
  createError: () => Error,
): never {
  if ( 
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    throw createError();
  }

  throw error;
}

export function throwIfPrismaForeignKeyConstraint(
  error: unknown,
  createError: () => Error,
): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  ) {
    throw createError();
  }

  throw error;
}