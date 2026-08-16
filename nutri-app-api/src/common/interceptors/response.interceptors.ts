import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | undefined>
  {
    intercept(
      context: ExecutionContext, 
      next: CallHandler<T>,
    ): Observable<ApiResponse<T> | undefined> {
      const response = context.switchToHttp().getResponse<{
        statusCode: number;
      }>();

      return next.handle().pipe(
        map((data: T) => {
          if (response.statusCode === HttpStatus.NO_CONTENT) {
            return undefined;
          }
          
          return {
            success: true as const,
            data,
            timestamp: new Date().toISOString(),
          }
        }),
      );
    }
  }