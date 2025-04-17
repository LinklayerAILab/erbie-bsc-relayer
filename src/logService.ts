import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// 确保日志目录存在
const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// 创建Winston日志记录器
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // 控制台输出
        new winston.transports.Console(),
        // 信息日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'info.log'),
            level: 'info'
        }),
        // 错误日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        }),
        // 所有日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    ],
});

// 日志辅助函数
const log = {
    info: (message: string) => {
        logger.info(message);
    },
    error: (message: string, error?: any) => {
        if (error) {
            logger.error(`${message}: ${error.message || error}`);
        } else {
            logger.error(message);
        }
    },
    warn: (message: string) => {
        logger.warn(message);
    },
    debug: (message: string) => {
        logger.debug(message);
    }
};

export default log;