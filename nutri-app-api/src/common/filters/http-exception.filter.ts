import { 
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException 
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { ErrorResponse } from "../interfaces/error-response.interface.js";
import { DomainConflictError } from "../errors/domain-conflict.error.js";
import { DomainNotFoundError } from "../errors/domain-not-found.error.js";
import { DomainUnauthorizedError } from "../errors/domain-unauthorized.error.js";
import { DomainValidationError } from "../errors/domain-validation.error.js";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof DomainValidationError) {
      exception = new BadRequestException(exception.message);
    } else if (exception instanceof DomainConflictError) {
      exception = new ConflictException(exception.message);
    } else if (exception instanceof DomainNotFoundError) {
      exception = new NotFoundException(exception.message);
    } else if (exception instanceof DomainUnauthorizedError) {
      exception = new UnauthorizedException(exception.message);
    }

    const ctx = host.switchToHttp();

    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const status = 
    exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      const exceptionRecord = exception as { code?: unknown; meta?: unknown; clientVersion?: unknown };
      const diagnostic = exceptionRecord.code == null
        ? ''
        : `\ncode=${String(exceptionRecord.code)} meta=${JSON.stringify(exceptionRecord.meta ?? null)} clientVersion=${String(exceptionRecord.clientVersion ?? '')}`;
      const detail = exception instanceof Error
        ? `${exception.name}: ${exception.message}${diagnostic}\n${exception.stack ?? ''}`
        : `${String(exception)}${diagnostic}`;
      this.logger.error(`Unhandled request exception for ${request.method} ${request.url}\n${detail}`);
    }

    let message: string | string[];

    if (exception instanceof HttpException) {
      const response = exception.getResponse()

      if (typeof response === 'string') {
        message = response;
      } else {
        message = 
          (response as { message?: string | string[] }).message ??
          'Unexpected error';
      }
    } else {
      message = 'Internal server error';
    }

    const body: ErrorResponse =  {
      success: false,
      statusCode: status,
      message,
      path: request.routeOptions?.url ?? request.url,
      timestamp: new Date().toISOString(),
    };

    reply.status(status).send(body);
  }
}
