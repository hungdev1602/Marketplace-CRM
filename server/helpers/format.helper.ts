export const formatFileSize = (bytes: number): string => {
  // Nếu < 1024 thì hiển thị đơn vị bytes
  if (bytes < 1024) return bytes + " B"

  // Nếu < 1024 * 1024 = 1048576 (1MB) thì hiển thị đơn vị KB
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"

  // Nếu >= 1MB thì hiển thị đơn bị MB
  return (bytes / 1048576).toFixed(2) + " MB"
}
