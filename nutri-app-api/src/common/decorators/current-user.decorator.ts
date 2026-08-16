import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { JwtPayload } from "../types/jwt-payload.interface.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<FastifyRequest & { user: JwtPayload }>();

    return request.user;
  },
);