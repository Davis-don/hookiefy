// Generalinfoedit.tsx
import './generalinfoedit.css'
import { useState, useEffect } from 'react'
import { IoMdClose } from 'react-icons/io'
import {
  FiUser,
  FiMail,
  FiPhone,
  FiSave,
  FiEdit2,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */
interface UserData {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number: string | null
  gender: string | null
  role: string
  profile_image_url: string | null
  has_profile_image: boolean
  auth_provider: string
}

interface FieldErrors {
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  gender?: string
}

interface GeneralinfoeditProps {
  onClose?: () => void
}

/* ────────────────────────────────────────────────────────
   Fetch current user
   Backend: GET /account/auth-check/
   ──────────────────────────────────────────────────────── */
async function fetchCurrentUser(
  accessToken: string | null
): Promise<UserData> {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.')
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/auth-check/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.')
    }
    throw new Error(
      (data && data.message) || 'Failed to fetch user data'
    )
  }

  // auth-check returns { authenticated: true, user: {...} }
  if (!data?.authenticated || !data?.user) {
    throw new Error('Not authenticated.')
  }

  return data.user as UserData
}

/* ────────────────────────────────────────────────────────
   Update current user
   Backend: PUT /account/update-user/
   ──────────────────────────────────────────────────────── */
async function updateCurrentUser(
  accessToken: string | null,
  payload: Partial<UserData>
): Promise<UserData> {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.')
  }

  // Strip read-only / non-updatable fields before sending.
  const allowed: (keyof UserData)[] = [
    'first_name',
    'last_name',
    'email',
    'phone_number',
    'gender',
  ]

  const body: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in payload) body[key] = payload[key]
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/account/update-user/`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // Attach field errors to the thrown Error so the
    // component can render them inline.
    const err = new Error(
      (data && data.message) || 'Failed to update profile'
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

  return data.user as UserData
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */
function Generalinfoedit({ onClose }: GeneralinfoeditProps) {
  const { access: accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserData>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  /* ── Fetch ─────────────────────────────────────────── */
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['currentUser', accessToken],
    queryFn: () => fetchCurrentUser(accessToken),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  })

  /* ── Update mutation ──────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<UserData>) =>
      updateCurrentUser(accessToken, payload),
    onSuccess: (updatedUser) => {
      toast.success('Profile updated successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      setFormData(updatedUser)
      setFieldErrors({})
      setIsEditing(false)

      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      refetch()
    },
    onError: (err: Error) => {
      const errWithFields = err as Error & {
        fieldErrors?: FieldErrors
      }

      if (errWithFields.fieldErrors) {
        setFieldErrors(errWithFields.fieldErrors)
      }

      toast.error('Failed to update profile', {
        description: err.message,
        duration: 5000,
        icon: '⚠️',
        style: {
          background: '#1a1a2e',
          border: '1px solid #ef4444',
          color: '#ffffff',
        },
      })
    },
  })

  /* ── Sync form with fetched data ──────────────────── */
  useEffect(() => {
    if (data) setFormData(data)
  }, [data])

  /* ── Handlers ─────────────────────────────────────── */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear inline error for the field being edited
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Please fill in all required fields', {
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

    const loadingToast = toast.loading('Updating profile...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    })

    updateMutation.mutate(formData, {
      onSettled: () => toast.dismiss(loadingToast),
    })
  }

  const handleCancel = () => {
    if (data) setFormData(data)
    setFieldErrors({})
    setIsEditing(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
    toast.info('Profile data refreshed', {
      duration: 2000,
      icon: '🔄',
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    })
  }

  const handleClose = () => {
    if (updateMutation.isPending) return
    onClose?.()
  }

  /* ── Loading / error states ───────────────────────── */
  if (isLoading) {
    return (
      <div className="gei-main-wrapper">
        <div className="gei-loading-container">
          <div className="gei-loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="gei-main-wrapper">
        <div className="gei-error-container">
          <div className="gei-error-icon">😅</div>
          <p className="gei-error-text">
            {error instanceof Error
              ? error.message
              : 'Failed to load profile'}
          </p>
          <button onClick={() => refetch()} className="gei-retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="gei-main-wrapper">
        <div className="gei-error-container">
          <p>No user data available</p>
        </div>
      </div>
    )
  }

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="gei-main-wrapper">
      {/* Header */}
      <div className="gei-header-section">
        <div className="gei-header-left">
          <div className="gei-title-wrapper">
            <h2 className="gei-page-title">General Details</h2>
            <p className="gei-page-subtitle">
              Update your personal information
            </p>
          </div>
        </div>

        <div className="gei-header-right">
          <button
            className="gei-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isFetching}
            title="Refresh profile data"
            type="button"
          >
            <FiRefreshCw
              className={`gei-refresh-icon ${
                isRefreshing || isFetching ? 'gei-spinning' : ''
              }`}
            />
          </button>

          {!isEditing && (
            <button
              className="gei-edit-btn"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <FiEdit2 className="gei-btn-icon" /> Edit Profile
            </button>
          )}

          {onClose && (
            <IoMdClose
              onClick={handleClose}
              className={`gei-close-icon ${
                updateMutation.isPending ? 'gei-disabled' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Form */}
      <div className="gei-form-container">
        <form className="gei-form" onSubmit={handleSubmit} noValidate>
          <div className="gei-form-grid">
            {/* First Name */}
            <div className="gei-form-group">
              <label className="gei-form-label" htmlFor="first_name">
                <FiUser className="gei-label-icon" /> First Name{' '}
                <span className="gei-required">*</span>
              </label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleInputChange}
                className={`gei-form-input ${
                  fieldErrors.first_name ? 'gei-input-error' : ''
                }`}
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter first name"
              />
              {fieldErrors.first_name && (
                <span className="gei-field-error">
                  {fieldErrors.first_name}
                </span>
              )}
            </div>

            {/* Last Name */}
            <div className="gei-form-group">
              <label className="gei-form-label" htmlFor="last_name">
                <FiUser className="gei-label-icon" /> Last Name{' '}
                <span className="gei-required">*</span>
              </label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleInputChange}
                className={`gei-form-input ${
                  fieldErrors.last_name ? 'gei-input-error' : ''
                }`}
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter last name"
              />
              {fieldErrors.last_name && (
                <span className="gei-field-error">
                  {fieldErrors.last_name}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="gei-form-group">
              <label className="gei-form-label" htmlFor="email">
                <FiMail className="gei-label-icon" /> Email Address{' '}
                <span className="gei-required">*</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={`gei-form-input ${
                  fieldErrors.email ? 'gei-input-error' : ''
                }`}
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter email address"
              />
              {fieldErrors.email && (
                <span className="gei-field-error">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Phone Number */}
            <div className="gei-form-group">
              <label className="gei-form-label" htmlFor="phone_number">
                <FiPhone className="gei-label-icon" /> Phone Number
              </label>
              <input
                id="phone_number"
                type="tel"
                name="phone_number"
                value={formData.phone_number || ''}
                onChange={handleInputChange}
                className={`gei-form-input ${
                  fieldErrors.phone_number ? 'gei-input-error' : ''
                }`}
                disabled={!isEditing || updateMutation.isPending}
                placeholder="Enter phone number"
              />
              {fieldErrors.phone_number && (
                <span className="gei-field-error">
                  {fieldErrors.phone_number}
                </span>
              )}
            </div>

            {/* Gender */}
            <div className="gei-form-group">
              <label className="gei-form-label" htmlFor="gender">
                <FiUser className="gei-label-icon" /> Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender || ''}
                onChange={handleInputChange}
                className={`gei-form-input gei-form-select ${
                  fieldErrors.gender ? 'gei-input-error' : ''
                }`}
                disabled={!isEditing || updateMutation.isPending}
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
              {fieldErrors.gender && (
                <span className="gei-field-error">
                  {fieldErrors.gender}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="gei-form-actions">
              <button
                type="submit"
                className="gei-save-btn"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <span className="gei-spinner-small"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="gei-btn-icon" /> Save Changes
                  </>
                )}
              </button>

              <button
                type="button"
                className="gei-cancel-btn"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <FiXCircle className="gei-btn-icon" /> Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Generalinfoedit