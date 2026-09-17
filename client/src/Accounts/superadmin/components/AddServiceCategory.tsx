// AddServiceCategory.tsx
import { useState } from 'react'
import {
  FiSave,
  FiXCircle,
  FiStar,
  FiEye,
  FiImage,
} from 'react-icons/fi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './addservicecategory.css'

interface FormState {
  name: string
  description: string
  image_url: string
  is_active: boolean
  is_featured: boolean
}

interface FieldErrors {
  name?: string
  description?: string
  image_url?: string
}

interface AddServiceCategoryProps {
  onCreated?: () => void
  onCancel?: () => void
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  image_url: '',
  is_active: true,
  is_featured: false,
}

async function createCategory(
  access: string | null,
  payload: FormState
) {
  if (!access) throw new Error('No access token found.')

  const body = {
    name: payload.name.trim(),
    description: payload.description.trim(),
    image_url: payload.image_url.trim() || null,
    is_active: payload.is_active,
    is_featured: payload.is_featured,
  }

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/services/service-categories/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(
      (data && data.message) || 'Failed to create category'
    ) as Error & { fieldErrors?: FieldErrors }

    if (data?.errors && typeof data.errors === 'object') {
      const flat: FieldErrors = {}
      for (const [field, val] of Object.entries(data.errors)) {
        flat[field as keyof FieldErrors] = Array.isArray(val)
          ? val.join(', ')
          : String(val)
      }
      err.fieldErrors = flat
    }

    throw err
  }

  return data
}

const AddServiceCategory = ({
  onCreated,
  onCancel,
}: AddServiceCategoryProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const mutation = useMutation({
    mutationFn: () => createCategory(access, form),
    onSuccess: () => {
      toast.success('Category created successfully.', {
        duration: 2500,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      queryClient.invalidateQueries({
        queryKey: ['service-categories'],
      })

      setForm(EMPTY_FORM)
      setFieldErrors({})
      onCreated?.()
    },
    onError: (err: Error) => {
      const e = err as Error & { fieldErrors?: FieldErrors }

      if (e.fieldErrors) setFieldErrors(e.fieldErrors)

      toast.error('Failed to create category', {
        description: err.message,
        duration: 4500,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Name is required.' })
      toast.error('Please fill in the name field.', {
        duration: 3000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
      return
    }

    mutation.mutate()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    onCancel?.()
  }

  return (
    <div className="asc-wrapper">
      <div className="asc-form-container">
        <form className="asc-form" onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className="asc-form-group">
            <label className="asc-form-label" htmlFor="name">
              Category Name <span className="asc-required">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className={`asc-form-input ${
                fieldErrors.name ? 'asc-input-error' : ''
              }`}
              placeholder="e.g. Massage Therapy"
              value={form.name}
              onChange={handleChange}
              disabled={mutation.isPending}
              maxLength={100}
            />
            {fieldErrors.name && (
              <span className="asc-field-error">{fieldErrors.name}</span>
            )}
          </div>

          {/* Description */}
          <div className="asc-form-group">
            <label className="asc-form-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className={`asc-form-input asc-form-textarea ${
                fieldErrors.description ? 'asc-input-error' : ''
              }`}
              placeholder="Short description shown to providers when picking a category."
              value={form.description}
              onChange={handleChange}
              disabled={mutation.isPending}
              maxLength={500}
              rows={4}
            />
            {fieldErrors.description && (
              <span className="asc-field-error">
                {fieldErrors.description}
              </span>
            )}
          </div>

          {/* Image URL */}
          <div className="asc-form-group">
            <label className="asc-form-label" htmlFor="image_url">
              <FiImage className="asc-label-icon" /> Image URL
            </label>
            <input
              id="image_url"
              name="image_url"
              type="url"
              className={`asc-form-input ${
                fieldErrors.image_url ? 'asc-input-error' : ''
              }`}
              placeholder="https://res.cloudinary.com/…/category.jpg"
              value={form.image_url}
              onChange={handleChange}
              disabled={mutation.isPending}
              maxLength={500}
            />
            <span className="asc-hint">
              Optional. Must start with http:// or https://
            </span>
            {fieldErrors.image_url && (
              <span className="asc-field-error">
                {fieldErrors.image_url}
              </span>
            )}
          </div>

          {/* Toggles */}
          <div className="asc-form-group">
            <span className="asc-form-label">Status</span>
            <div className="asc-toggles">
              <label className="asc-toggle">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  disabled={mutation.isPending}
                />
                <span className="asc-toggle-box" aria-hidden="true" />
                <span className="asc-toggle-text">
                  <FiEye className="asc-toggle-icon" />
                  Active
                </span>
              </label>

              <label className="asc-toggle">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={form.is_featured}
                  onChange={handleChange}
                  disabled={mutation.isPending}
                />
                <span className="asc-toggle-box" aria-hidden="true" />
                <span className="asc-toggle-text">
                  <FiStar className="asc-toggle-icon" />
                  Featured
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="asc-form-actions">
            <button
              type="submit"
              className="asc-save-btn"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <span className="asc-spinner-small" />
                  Creating…
                </>
              ) : (
                <>
                  <FiSave className="asc-btn-icon" /> Create Category
                </>
              )}
            </button>

            <button
              type="button"
              className="asc-cancel-btn"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              <FiXCircle className="asc-btn-icon" /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddServiceCategory