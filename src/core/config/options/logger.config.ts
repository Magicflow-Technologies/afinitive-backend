import { registerAs } from '@nestjs/config';
import pinoPretty from 'pino-pretty';

const isDev = process.env.NODE_ENV !== 'production';

export const loggerConfig = registerAs('logger', () => ({
  pinoHttp: isDev
    ? {
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
    : null,
}));
