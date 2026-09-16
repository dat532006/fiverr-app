export type AppErrorKind =
  'network' | 'timeout' | 'server' | 'decode' | 'configuration' | 'unknown';

const MESSAGES: Readonly<Record<AppErrorKind, string>> = {
  network: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  timeout: 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
  server: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  decode: 'Không đọc được dữ liệu trả về.',
  configuration: 'Cấu hình kết nối chưa hợp lệ.',
  unknown: 'Đã xảy ra lỗi không xác định.',
};

export class AppError extends Error {
  readonly kind: AppErrorKind;

  constructor(kind: AppErrorKind) {
    super(MESSAGES[kind]);
    this.name = 'AppError';
    this.kind = kind;
  }
}
