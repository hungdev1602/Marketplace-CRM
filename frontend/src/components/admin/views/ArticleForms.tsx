"use client"

import { useRef } from "react"
import { adminUrl } from "@/lib/admin"
import {
  CheckboxTree, Editor, Field, FileInput, FormButtons, SlugField, TextField, TreeOptions,
  required, toFormData, useAdminSubmit, type EditorHandle
} from "../form"

// ===== Form bài viết và danh mục bài viết (tạo mới / chỉnh sửa) =====
// Có article / category là đang sửa, không có là tạo mới

// Form bài viết: /admin/article/create, /admin/article/edit/:id
export function ArticleForm({ article, categoryList }: { article?: any, categoryList: any[] }) {
  const descriptionRef = useRef<EditorHandle>(null)
  const contentRef = useRef<EditorHandle>(null)

  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: article ? `/article/edit/${article.id}` : "/article/create",
    method: article ? "PATCH" : "POST",
    rules: {
      name: [required("Vui lòng nhập tên bài viết!")],
      slug: [required("Vui lòng nhập đường dẫn!")]
    },
    build: (values, raw) => toFormData({
      name: values.name,
      slug: values.slug,
      category: JSON.stringify(raw.getAll("category")),
      status: values.status,
      avatar: values.avatar,
      description: descriptionRef.current?.getContent(),
      content: contentRef.current?.getContent()
    })
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-md-6 col-lg-6">
          <TextField label="Tên bài viết *" name="name" defaultValue={article?.name} error={errors.name} />
        </div>
        <div className="col-md-6 col-lg-6">
          <SlugField model="Blog" defaultValue={article?.slug} error={errors.slug} />
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Danh mục">
            <div className="checkbox-list">
              <CheckboxTree list={categoryList} name="category" checked={article?.category || []} />
            </div>
          </Field>
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Trạng thái" htmlFor="status">
            <select className="form-select" id="status" name="status" defaultValue={article?.status || "draft"}>
              <option value="draft">Bản nháp</option>
              <option value="published">Xuất bản</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <div className="mb-3">
            <FileInput label="Ảnh đại diện" name="avatar" defaultValue={article?.avatar} />
          </div>
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Mô tả ngắn">
            <Editor ref={descriptionRef} defaultValue={article?.description} />
          </Field>
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Nội dung chi tiết">
            <Editor ref={contentRef} defaultValue={article?.content} />
          </Field>
        </div>
      </div>
      <FormButtons submitLabel={article ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/article/list")} isSending={isSending} />
    </form>
  )
}

// Form danh mục bài viết: /admin/article/category/create, /admin/article/category/edit/:id
export function ArticleCategoryForm({ category, categoryTree }: { category?: any, categoryTree: any[] }) {
  const descriptionRef = useRef<EditorHandle>(null)

  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: category ? `/article/category/edit/${category.id}` : "/article/category/create",
    method: category ? "PATCH" : "POST",
    rules: {
      name: [required("Vui lòng nhập tên danh mục")],
      slug: [required("Vui lòng nhập đường dẫn")],
      // Tạo mới bắt buộc có ảnh đại diện
      ...(category ? {} : { avatar: [required("Vui lòng nhập đường dẫn ảnh")] })
    },
    build: (values) => toFormData({
      name: values.name,
      slug: values.slug,
      avatar: values.avatar,
      parent: values.parent,
      description: descriptionRef.current?.getContent(),
      status: values.status
    })
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-md-6 col-lg-6">
          <TextField label="Tên danh mục *" name="name" defaultValue={category?.name} error={errors.name} />
        </div>
        <div className="col-md-6 col-lg-6">
          <SlugField model="CategoryBlog" defaultValue={category?.slug} error={errors.slug} />
        </div>
        <div className="col-md-6 col-lg-6">
          <div className="mb-3">
            <FileInput label="Ảnh đại diện" name="avatar" defaultValue={category?.avatar} placeholder="Đường dẫn file..." error={errors.avatar} />
          </div>
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Danh mục cha" htmlFor="parent">
            <select className="form-select" id="parent" name="parent" defaultValue={category?.parent || ""}>
              <option value="">---</option>
              <TreeOptions list={categoryTree} />
            </select>
          </Field>
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Mô tả">
            <Editor ref={descriptionRef} defaultValue={category?.description} />
          </Field>
        </div>
        <div className="col-md-12 col-lg-12">
          <Field label="Trạng thái" htmlFor="status">
            <select className="form-select" id="status" name="status" defaultValue={category?.status || "active"}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </Field>
        </div>
      </div>
      <FormButtons submitLabel={category ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/article/category")} isSending={isSending} />
    </form>
  )
}
