# SafeZone Admin Web

Trang quản trị web của SafeZone, dùng để theo dõi tình hình dịch bệnh trên bản đồ, quản lý ca báo cáo, vùng dịch, người dùng, nội dung y tế và thông báo.

## Công nghệ

- Next.js 16 với App Router
- React 19 và TypeScript
- Tailwind CSS 4
- Leaflet và React Leaflet cho bản đồ
- React Markdown và remark GFM cho nội dung y tế

## Chức năng chính

- Đăng nhập và bảo vệ khu vực quản trị
- Dashboard bản đồ GIS và lớp nhiệt vùng dịch
- Thống kê ca bệnh và xu hướng dịch
- Quản lý báo cáo ca bệnh
- Quản lý vùng dịch
- Quản lý người dùng và phân quyền
- Quản lý bài viết, thông tin y tế, danh mục bệnh
- Gửi và quản lý thông báo
- Xem hồ sơ quản trị viên

## Yêu cầu

- Node.js 20 trở lên
- npm 10 trở lên
- SafeZone API đang chạy hoặc một API đã triển khai

## Cài đặt

```powershell
cd apps/admin-web
npm install
```

Tạo file `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

`NEXT_PUBLIC_API_URL` phải trỏ tới đúng base URL của API, bao gồm `/api/v1`.

## Chạy phát triển

```powershell
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Build và chạy production

```powershell
npm run build
npm run start
```

## Kiểm tra mã nguồn

```powershell
npm run lint
```

## Cấu trúc thư mục

```text
src/
  app/          # Routes, pages và dashboard
  components/   # Component dùng chung
  constants/    # Hằng số ứng dụng
  hooks/        # React hooks dùng chung
  types/        # Kiểu TypeScript
public/         # Tài nguyên tĩnh
```

## Kết nối API

Admin Web gọi API bằng JWT. Người dùng đăng nhập tại `/login`; token được sử dụng cho các request quản trị tiếp theo. API tương ứng nằm trong [apps/api](../api/).

Tài liệu endpoint chi tiết xem tại [API_DOCUMENTATION.md](../../docs/API_DOCUMENTATION.md).

## Triển khai

Có thể triển khai Next.js lên Vercel hoặc nền tảng Node.js tương thích:

1. Đặt `NEXT_PUBLIC_API_URL` trong environment variables.
2. Chạy `npm run build`.
3. Dùng `npm run start` cho server production.

Không commit `.env.local` hoặc bất kỳ secret nào vào repository.

## Lưu ý bản đồ

Các tính năng bản đồ cần dữ liệu GIS và API hoạt động. Khi chạy trên thiết bị hoặc trình duyệt khác máy phát triển, không dùng `localhost` trong `NEXT_PUBLIC_API_URL`; hãy dùng hostname/IP mà client có thể truy cập.

