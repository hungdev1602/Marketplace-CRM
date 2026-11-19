"use client"

import { adminUrl } from "@/lib/admin"
import {
  CheckboxTree, Field, FileInput, FormButtons, PasswordInput, TextField,
  custom, isEmail, maxLength, minLength, required, toFormData, useAdminSubmit, type Rule
} from "../form"

// ===== Form nhóm quyền, tài khoản quản trị, đổi mật khẩu =====

// Mật khẩu mạnh: ít nhất 8 ký tự, có chữ in hoa, chữ thường, chữ số, ký tự đặc biệt
const passwordRules: Rule[] = [
  required("Vui lòng nhập mật khẩu!"),
  custom(value => value.length >= 8, "Mật khẩu phải chứa ít nhất 8 ký tự!"),
  custom(value => /[A-Z]/.test(value), "Mật khẩu phải chứa ít nhất một chữ cái in hoa!"),
  custom(value => /[a-z]/.test(value), "Mật khẩu phải chứa ít nhất một chữ cái thường!"),
  custom(value => /\d/.test(value), "Mật khẩu phải chứa ít nhất một chữ số!"),
  custom(value => /[@$!%*?&]/.test(value), "Mật khẩu phải chứa ít nhất một ký tự đặc biệt!")
]

// Form nhóm quyền: /admin/role/create, /admin/role/edit/:id
export function RoleForm({ role, permissionList }: { role?: any, permissionList: any[] }) {
  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: role ? `/role/edit/${role.id}` : "/role/create",
    method: role ? "PATCH" : "POST",
    rules: { name: [required("Vui lòng nhập tên nhóm quyền!")] },
    build: (values, raw) => toFormData({
      name: values.name,
      description: values.description,
      permissions: JSON.stringify(raw.getAll("permissions")),
      status: values.status
    })
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-md-6 col-lg-6">
          <TextField label="Tên nhóm quyền *" name="name" defaultValue={role?.name} error={errors.name} />
        </div>
        <div className="col-md-6 col-lg-6">
          <TextField label="Mô tả ngắn" name="description" defaultValue={role?.description} />
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Phân quyền">
            <div className="checkbox-list">
              <CheckboxTree list={permissionList} name="permissions" checked={role?.permissions || []} />
            </div>
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Trạng thái" htmlFor="status">
            <select className="form-select" id="status" name="status" defaultValue={role?.status || "active"}>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </Field>
        </div>
      </div>
      <FormButtons submitLabel={role ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/role/list")} isSending={isSending} />
    </form>
  )
}

// Form tài khoản quản trị: /admin/account-admin/create, /admin/account-admin/edit/:id
// (trang sửa không đổi mật khẩu, đổi ở trang "Đổi mật khẩu")
export function AccountAdminForm({ accountDetail, roleList }: { accountDetail?: any, roleList: any[] }) {
  const isEdit = !!accountDetail
  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: isEdit ? `/account-admin/edit/${accountDetail.id}` : "/account-admin/create",
    method: isEdit ? "PATCH" : "POST",
    rules: {
      fullName: [
        required("Vui lòng nhập họ tên!"),
        minLength(5, "Họ tên phải có ít nhất 5 ký tự!"),
        maxLength(50, "Họ tên không được vượt quá 50 ký tự!")
      ],
      email: [required("Vui lòng nhập email!"), isEmail("Email không đúng định dạng!")],
      ...(isEdit ? {} : { password: passwordRules })
    },
    build: (values, raw) => toFormData({
      fullName: values.fullName,
      email: values.email,
      ...(isEdit ? {} : { password: values.password }),
      status: values.status,
      avatar: values.avatar,
      roles: JSON.stringify(raw.getAll("roles"))
    })
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-md-6 col-lg-6">
          <TextField label="Họ tên *" name="fullName" defaultValue={accountDetail?.fullName} error={errors.fullName} />
        </div>
        <div className="col-md-6 col-lg-6">
          <TextField label="Email *" name="email" type="email" defaultValue={accountDetail?.email} error={errors.email} />
        </div>
        {!isEdit && (
          <div className="col-md-6 col-lg-6">
            <TextField label="Mật khẩu *" name="password" autoComplete="new-password" error={errors.password} />
          </div>
        )}
        <div className="col-md-6 col-lg-6">
          <Field label="Trạng thái" htmlFor="status">
            <select className="form-select" id="status" name="status" defaultValue={accountDetail?.status || "initial"}>
              <option value="initial">Khởi tạo</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <div className="mb-3">
            <FileInput label="Ảnh đại diện" name="avatar" defaultValue={accountDetail?.avatar} />
          </div>
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Nhóm quyền">
            <div className="checkbox-list">
              <CheckboxTree list={roleList} name="roles" checked={accountDetail?.roles || []} />
            </div>
          </Field>
        </div>
      </div>
      <FormButtons submitLabel={isEdit ? "Cập nhật" : "Tạo mới"} cancelHref={adminUrl("/account-admin/list")} isSending={isSending} />
    </form>
  )
}

// Đổi mật khẩu tài khoản quản trị: /admin/account-admin/change-password/:id
export function ChangePasswordForm({ accountDetail }: { accountDetail: any }) {
  const { errors, isSending, handleSubmit } = useAdminSubmit({
    api: `/account-admin/change-password/${accountDetail.id}`,
    method: "PATCH",
    rules: {
      password: passwordRules,
      confirmPassword: [
        required("Vui lòng xác nhận mật khẩu!"),
        custom((value, values) => value === values.password, "Mật khẩu xác nhận không khớp!")
      ]
    },
    build: (values) => toFormData({ password: values.password, confirmPassword: values.confirmPassword })
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div className="col-md-6 col-lg-6">
          <Field label="Họ tên" htmlFor="fullName">
            <input className="form-control" id="fullName" type="text" defaultValue={accountDetail.fullName} disabled />
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Email" htmlFor="email">
            <input className="form-control" id="email" type="email" defaultValue={accountDetail.email} disabled />
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Mật khẩu mới *" htmlFor="password">
            <PasswordInput name="password" autoComplete="new-password" error={errors.password} />
          </Field>
        </div>
        <div className="col-md-6 col-lg-6">
          <Field label="Xác nhận mật khẩu mới *" htmlFor="confirmPassword">
            <PasswordInput name="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} />
          </Field>
        </div>
      </div>
      <FormButtons submitLabel="Đổi mật khẩu" cancelHref={adminUrl("/account-admin/list")} isSending={isSending} />
    </form>
  )
}
