export function buildCategoryTree(categories: any, parentId: string = "") {
  // Bước 1: Lọc ra các danh mục có parent khớp với parentId hiện tại
  const currentLevelCategories = categories.filter(
    (category: any) => category.parent === parentId
  );

  // Bước 2: Duyệt qua từng danh mục và đệ quy để tìm các danh mục con
  const tree = currentLevelCategories.map((category: any) => {
    const children = buildCategoryTree(categories, category.id);

    return {
      id: category.id,
      name: category.name,
      nameRu: category.nameRu, // trang khách hàng: tên tiếng Nga, đường dẫn, ảnh của danh mục
      slug: category.slug,
      avatar: category.avatar,
      children: children,
    };
  });

  // Bước 3: Trả về cây danh mục của cấp hiện tại
  return tree;
}

// Lấy id của tất cả danh mục con, cháu,... của 1 danh mục (không gồm chính nó)
// Dùng để: lọc sản phẩm theo danh mục cha (lấy cả sản phẩm ở danh mục con),
// và không cho chọn danh mục con làm danh mục cha (tránh vòng lặp)
export function getDescendantIds(categories: any, parentId: string): string[] {
  const result: string[] = [];

  const children = categories.filter((category: any) => category.parent === parentId);
  for (const child of children) {
    result.push(child.id);
    result.push(...getDescendantIds(categories, child.id));
  }

  return result;
}
