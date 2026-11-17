import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Ảnh sản phẩm nằm ở server quản lý file (file-manager-microservice), server này chỉ cho tải ảnh
      // khi trình duyệt của khách gửi kèm địa chỉ website (Referer), nên dùng thẻ <img> thường thay cho next/image
      "@next/next/no-img-element": "off",
      // Dữ liệu trang lấy từ server Express chưa khai báo kiểu chi tiết
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
