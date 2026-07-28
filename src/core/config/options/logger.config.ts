import { registerAs } from '@nestjs/config';
import pinoPretty from 'pino-pretty';

const isDev = process.env.NODE_ENV !== 'production';

const pinoHttpBase = {
  level: process.env.LOG_LEVEL || 'info',
  autoLogging: {
    ignore: (req: any) => req.url === '/health',
  },
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      remoteAddress: req.remoteAddress,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
  customSuccessMessage: (req: any) => `→ ${req.method} ${req.url}`,
  customErrorMessage: (req: any, res: any) =>
    `✗ ${req.method} ${req.url} - ${res.statusCode}`,
  customReceivedMessage: (req: any) => `◀ ${req.method} ${req.url}`,
  customLogLevel: (_req: any, res: any, err?: any) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
};

export const loggerConfig = registerAs('logger', () => ({
  pinoHttp: isDev
    ? {
        ...pinoHttpBase,
        stream: pinoPretty({
          colorize: true,
          levelFirst: true,
          translateTime: 'SYS:yyyy-MM-dd HH:mm:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          hideObject: false,
          customLevels: {
            log: 30,
          },
        }),
      }
    : pinoHttpBase,
}));
