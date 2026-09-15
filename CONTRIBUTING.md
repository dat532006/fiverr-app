# Contribution và local-stop

## Trước khi thay đổi

Đọc task record đã đóng băng, predecessor handoff và authorization đúng operation. Dùng frozen IDs trong tracker. Chỉ chỉnh file thuộc allowed areas; không đổi stack/ADR/scope hoặc copy research/credential vào app.

## Quy ước

- TypeScript strict; dữ liệu ngoài hệ thống là `unknown` và phải kiểm tra. Không `any`, blanket ts-ignore hoặc non-null assertion để che lỗi.
- Component/type PascalCase; function camelCase; named exports có chủ đích.
- Hybrid feature/shared/infrastructure: shared không import feature; infrastructure không import app/feature. Cross-feature chỉ qua public interface đúng allowlist; UI không import Axios/endpoint DTO.
- Query giữ server state; Router Declarative giữ URL. Không thêm cache/global store khác. Mutation retry 0; không replay/offline queue.
- Không log config/token/password/response nhạy cảm. Không tự đọc credential hoặc gọi API để làm test xanh.
- Test helpers/MSW/fixtures không thuộc production entry. Mock PASS không đóng live gate.

## Git và handoff

Workflow: latest accepted main → branch task → implementation/local checks → self-review/fix/retest → STOP. Branch TASK-005: `chore/005-bootstrap`. Bootstrap bắt đầu bằng local Git metadata trên main rồi chuyển branch TASK-005; chưa tạo commit khi chưa có source acceptance. Không tự suy main đã có accepted source.

Không push, tạo remote, PR, merge, deploy hoặc future task branches nếu chưa có authorization riêng. Không reset/clean/stash/cherry-pick user work tự động.

Handoff ghi AC01–AC04, local typecheck/lint/format/tests/build, scope, import/config boundaries, findings, package/lock hashes, Git state và evidence refs. Cập nhật Excel tracker theo kết quả thật: `LOCAL_COMPLETE` hoặc `BLOCKED`. Giữ lịch sử blockers; không backfill dates/reviews hoặc completion giả.

## Stop conditions

STOP khi runtime/engine/peer không hợp lệ, exact version không resolve, cần substitution/bypass, gặp frozen hash mismatch, credential risk, architecture/scope conflict hoặc thiếu authorization. Giữ bằng chứng lỗi và chỉ xử lý đúng blocker.

Sau TASK-005, IG10.toolchain vẫn OPEN và TASK-006 chưa chạy. Không chuyển sang task tiếp theo tự động.
