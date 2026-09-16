# Fiverr — Repository bootstrap

Nền React/TypeScript/Vite cho dự án cuối khóa BCFE. TASK-005 chỉ tạo hạ tầng tối thiểu. Chưa có feature nghiệp vụ, kết nối CyberSoft hoặc deployment.

## Runtime và cài đặt

Dùng đúng Node **24.21.0**, npm **12.0.2**. Manifest pin toàn bộ dependency trực tiếp theo matrix TASK-003; TypeScript **6.0.3** là lựa chọn có chủ đích. Không đổi version hoặc dùng force/legacy-peer-deps khi gặp lỗi.

```sh
node -v
npm -v
npm ci
npm run dev
```

`npm ci` là hướng dẫn cho lần cài lại được cấp phép; repeatability verification thuộc TASK-006. TASK-005 tạo lockfile bằng `npm install`. Không dùng package manager khác.

## Local checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Các lệnh trên trong handoff này là **TASK-005 LOCAL CHECKS**. Chúng không đóng IG10.toolchain, không hoàn tất TASK-006 và không chứng minh production readiness.

Vitest dùng jsdom, Testing Library và MSW Node interceptor. Mọi request không có mock handler đều gây lỗi; tests chỉ dùng domain tổng hợp `.invalid`. QueryClient được tạo mới cho mỗi render. T01–T24 chưa được triển khai. Playwright mới có package/config, chưa có E2E hoặc browser binary download; `npm run test:e2e` chưa có test để chạy.

## Cấu hình và HTTP

`.env.example` chỉ chứa tên biến và placeholder trống. Không chép credential từ research hoặc nhập secret trong TASK-005.

Bootstrap entry chỉ mount Router/Query providers và nội dung placeholder; không tạo HTTP client hoặc query. Vì vậy scaffold có thể build khi chưa có cấu hình API. Factory `src/infrastructure/http/create-http-client.ts` kiểm base URL, token cấu hình, app environment và origin allowlist trước khi tạo transport. Thiếu/sai config gây `ConfigurationError` với thông báo cố định, không chứa giá trị nhập. Mặc định allowlist rỗng nên kết nối bị đóng. Request đổi destination bị từ chối trước adapter.

Việc ghép cấu hình API vào app hoặc build phục vụ tích hợp cần task được cấp phép sau này. `VITE_*` là giá trị đưa vào bundle client, không phải kho server secrets. Không gửi token tới host ảnh hoặc URL ngoài allowlist. Chưa có auth/session/DTO/feature adapters; transport không retry.

## Cấu trúc hiện có

- `src/app/bootstrap/`: entry, Router placeholder, providers, QueryClient và Tailwind entry.
- `src/infrastructure/http/`: config validation và Axios factory tối thiểu.
- `tests/support/`: MSW và isolated render harness.
- `tests/`: local bootstrap/config/mock tests.

Không tạo sẵn các feature hoặc shared folders chưa dùng. ESLint giữ import boundaries theo hybrid feature/shared/infrastructure; source không được import test mocks.

## Dừng tại local handoff

Đọc [CONTRIBUTING.md](CONTRIBUTING.md). Không tự chạy TASK-006/TASK-007, gọi CyberSoft, push, tạo remote/PR, merge hoặc deploy. Local-complete chỉ là kết quả sẵn review; source chưa merge không được coi là predecessor đã merge cho task kế tiếp.
