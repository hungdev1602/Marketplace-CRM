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
      // Các rule dành cho React Compiler (dự án không bật React Compiler). Nhiều component ở đây điều khiển
      // thư viện / API của trình duyệt theo kiểu ra lệnh (bản đồ Leaflet, giọng nói, camera, trình soạn thảo)
      // nên cần giữ "giá trị mới nhất" trong ref và gọi setState trong effect
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
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
