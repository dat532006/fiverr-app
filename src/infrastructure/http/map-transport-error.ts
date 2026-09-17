import { isAxiosError } from 'axios';
import { ConfigurationError } from './config';
import { AppError } from '../../shared/models/app-error';

export function mapTransportError(error: unknown): AppError {
  if (error instanceof ConfigurationError) {
    return new AppError('configuration');
  }
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return new AppError('timeout');
    }
    if (!error.response) {
      return new AppError('network');
    }
    if (error.response.status === 403) {
      return new AppError('forbidden');
    }
    if (error.response.status >= 500) {
      return new AppError('server');
    }
  }
  return new AppError('unknown');
}
