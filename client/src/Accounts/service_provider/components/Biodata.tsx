// Biodata.tsx
import './biodata.css'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { IoMdClose } from 'react-icons/io'
import {
  FiMapPin,
  FiCalendar,
  FiEdit2,
  FiSave,
  FiXCircle,
  FiRefreshCw,
  FiFileText,
} from 'react-icons/fi'
import 'bootstrap/dist/css/bootstrap.min.css'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuthStore } from '../../../store/authtokenstore'
import { toast } from 'sonner'

/* ────────────────────────────────────────────────────────
   Kenya counties + cities data
   ──────────────────────────────────────────────────────── */
const KENYA_COUNTIES: string[] = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
]

const KENYA_CITIES: Record<string, string[]> = {
  Nairobi: [
    'Nairobi CBD', 'Westlands', 'Karen', 'Kilimani', 'Kasarani',
    'Embakasi', 'Langata', 'Roysambu', 'Dagoretti', 'Njiru',
  ],
  Mombasa: [
    'Mombasa CBD', 'Nyali', 'Bamburi', 'Likoni', 'Kisauni',
    'Changamwe', 'Jomvu', 'Mvita',
  ],
  Kisumu: ['Kisumu CBD', 'Milimani', 'Nyalenda', 'Mamboleo', 'Kondele'],
  Nakuru: ['Nakuru CBD', 'Milimani', 'Lanet', 'Njoro', 'Naivasha'],
  Kiambu: ['Thika', 'Ruiru', 'Juja', 'Kikuyu', 'Limuru', 'Gatundu'],
  Machakos: ['Machakos Town', 'Athi River', 'Kangundo', 'Mlolongo'],
  Kajiado: ['Kajiado Town', 'Ngong', 'Kitengela', 'Rongai'],
  'Uasin Gishu': ['Eldoret CBD', 'Langas', 'Kapsoya', 'Kapsabet Road'],
  Nyeri: ['Nyeri Town', 'Karatina', 'Othaya', 'Mukurweini'],
  Meru: ['Meru Town', 'Maua', 'Nkubu', 'Timau'],
  Kakamega: ['Kakamega Town', 'Mumias', 'Butere', 'Khwisero'],
  Bungoma: ['Bungoma Town', 'Webuye', 'Kimilili', 'Chwele'],
  Kilifi: ['Kilifi Town', 'Malindi', 'Watamu', 'Mtwapa'],
  Kericho: ['Kericho Town', 'Litein', 'Kipkelion', 'Londiani'],
  Bomet: ['Bomet Town', 'Sotik', 'Silibwet'],
  Narok: ['Narok Town', 'Kilgoris', 'Suswa'],
  Kisii: ['Kisii Town', 'Ogembo', 'Keroka', 'Suneka'],
  Nyamira: ['Nyamira Town', 'Keroka', 'Ekerenyo'],
  'Homa Bay': ['Homa Bay Town', 'Oyugis', 'Mbita', 'Kendu Bay'],
  Migori: ['Migori Town', 'Rongo', 'Awendo', 'Kehancha'],
  Siaya: ['Siaya Town', 'Bondo', 'Ugunja', 'Yala'],
  Busia: ['Busia Town', 'Malaba', 'Port Victoria'],
  Vihiga: ['Vihiga Town', 'Mbale', 'Chavakali'],
  'Trans Nzoia': ['Kitale', 'Kiminini', 'Endebess'],
  'West Pokot': ['Kapenguria', 'Makutano', 'Ortum'],
  Turkana: ['Lodwar', 'Kakuma', 'Lokichogio'],
  Samburu: ['Maralal', 'Baragoi', 'Wamba'],
  'Tana River': ['Hola', 'Bura', 'Madogo'],
  Garissa: ['Garissa Town', 'Dadaab', 'Masalani'],
  Wajir: ['Wajir Town', 'Habaswein', 'Griftu'],
  Mandera: ['Mandera Town', 'El Wak', 'Rhamu'],
  Marsabit: ['Marsabit Town', 'Moyale', 'Laisamis'],
  Isiolo: ['Isiolo Town', 'Merti', 'Garbatulla'],
  'Taita-Taveta': ['Voi', 'Wundanyi', 'Taveta', 'Mwatate'],
  Kwale: ['Kwale Town', 'Ukunda', 'Diani', 'Lungalunga'],
  Lamu: ['Lamu Town', 'Mpeketoni', 'Hindi'],
  'Tharaka-Nithi': ['Kathwana', 'Chuka', 'Chogoria'],
  Embu: ['Embu Town', 'Runyenjes', 'Siakago'],
  Kitui: ['Kitui Town', 'Mwingi', 'Mutomo'],
  Makueni: ['Wote', 'Makindu', 'Kibwezi', 'Tawa'],
  Nyandarua: ['Ol Kalou', 'Njabini', 'Engineer'],
  Laikipia: ['Nanyuki', 'Nyahururu', 'Rumuruti'],
  Baringo: ['Kabarnet', 'Eldama Ravine', 'Marigat'],
  'Elgeyo-Marakwet': ['Iten', 'Kapsowar', 'Chepkorio'],
  Nandi: ['Kapsabet', 'Nandi Hills', 'Mosoriot'],
  Kirinyaga: ['Kerugoya', 'Kutus', 'Sagana'],
  "Murang'a": ["Murang'a Town", 'Kenol', 'Kangema'],
}

/* ────────────────────────────────────────────────────────
   Date-of-birth helpers
   ──────────────────────────────────────────────────────── */
const MONTHS: { value: string; label: string }[] = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

// Years from current year (inclusive) down to 1900
function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= 1900; y--) {
    years.push(y)
  }
  return years
}

const YEAR_OPTIONS = buildYearOptions()

// Days for a given month/year (accounts for leap years)
function daysInMonth(year: number, month: string): number {
  if (!year || !month) return 31
  return new Date(year, parseInt(month, 10), 0).getDate()
}

// Parse "1995-06-12" → { year: "1995", month: "06", day: "12" }
function parseDob(dob: string | null | undefined) {
  if (!dob) return { year: '', month: '', day: '' }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob)
  if (!match) return { year: '', month: '', day: '' }
  return { year: match[1], month: match[2], day: match[3] }
}

// Combine parts into "YYYY-MM-DD" or return null if incomplete
function combineDob(year: string, month: string, day: string): string | null {
  if (!year || !month || !day) return null
  return `${year}-${month}-${day}`
}

/* ────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────── */
interface UserProfileData {
  user: number
  user_email: string
  user_full_name: string
  user_role: string
  bio: string | null
  country: string | null
  county: string | null
  city: string | null
  date_of_birth: string | null
  age: number | null
  created_at: string
  updated_at: string
}

type EditableField =
  | 'bio'
  | 'country'
  | 'county'
  | 'city'
  | 'date_of_birth'

const EDITABLE_FIELDS: EditableField[] = [
  'bio',
  'country',
  'county',
  'city',
  'date_of_birth',
]

interface FieldErrors {
  bio?: string
  country?: string
  county?: string
  city?: string
  date_of_birth?: string
}

interface BiodataProps {
  onClose?: () => void
}

const PROFILE_QUERY_KEY = 'userProfile'

/* ────────────────────────────────────────────────────────
   API
   ──────────────────────────────────────────────────────── */
async function fetchProfile(
  accessToken: string | null
): Promise<UserProfileData | null> {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.')
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/profile/me/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (response.status === 404) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please login again.')
    }
    throw new Error(
      (data && data.message) || 'Failed to load profile'
    )
  }

  return data.data as UserProfileData
}

async function saveProfile(
  accessToken: string | null,
  payload: Partial<UserProfileData>
): Promise<UserProfileData> {
  if (!accessToken) {
    throw new Error('No access token found. Please login again.')
  }

  const body: Partial<Record<EditableField, string | null>> = {}

  for (const key of EDITABLE_FIELDS) {
    if (!(key in payload)) continue

    const raw = payload[key]
    const value =
      typeof raw === 'string' ? raw.trim() : raw

    // Empty string → null (DRF rejects "" for DateField
    // and prefers null for optional CharField).
    body[key] =
      value === '' || value === undefined ? null : (value as string)
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/profile/create-or-update/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const err = new Error(
      (data && data.message) || 'Failed to save profile'
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

    if (import.meta.env.DEV) {
      console.error('❌ Save profile failed:', {
        sentBody: body,
        responseStatus: response.status,
        responseBody: data,
      })
    }

    throw err
  }

  return data.data as UserProfileData
}

/* ────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────── */
function Biodata({ onClose }: BiodataProps) {
  const { access: accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [formData, setFormData] = useState<Partial<UserProfileData>>({
    bio: '',
    country: 'Kenya',
    county: '',
    city: '',
    date_of_birth: '',
  })

  // Split DOB into three controlled values
  const [dobYear, setDobYear] = useState<string>('')
  const [dobMonth, setDobMonth] = useState<string>('')
  const [dobDay, setDobDay] = useState<string>('')

  /* ── Query ────────────────────────────────────────── */
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<UserProfileData | null, Error>({
    queryKey: [PROFILE_QUERY_KEY, accessToken],
    queryFn: () => fetchProfile(accessToken),
    enabled: !!accessToken,
    placeholderData: (previous) => previous,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1500,
  })

  /* ── Prefetch helper ──────────────────────────────── */
  const prefetchProfile = useCallback(() => {
    if (!accessToken) return
    queryClient.prefetchQuery({
      queryKey: [PROFILE_QUERY_KEY, accessToken],
      queryFn: () => fetchProfile(accessToken),
      staleTime: 10 * 60 * 1000,
    })
  }, [accessToken, queryClient])

  /* ── Sync form + DOB splits with fetched data ─────── */
  useEffect(() => {
    if (data) {
      setFormData({
        bio: data.bio || '',
        country: data.country || 'Kenya',
        county: data.county || '',
        city: data.city || '',
        date_of_birth: data.date_of_birth || '',
      })

      const parsed = parseDob(data.date_of_birth)
      setDobYear(parsed.year)
      setDobMonth(parsed.month)
      setDobDay(parsed.day)
    }
  }, [data])

  /* ── Cities for the selected county ───────────────── */
  const availableCities = useMemo(() => {
    const county = formData.county || ''
    return KENYA_CITIES[county] || []
  }, [formData.county])

  /* ── Days available for the selected month/year ───── */
  const availableDays = useMemo(() => {
    const max = daysInMonth(
      dobYear ? parseInt(dobYear, 10) : 0,
      dobMonth
    )
    const days: string[] = []
    for (let d = 1; d <= max; d++) {
      days.push(String(d).padStart(2, '0'))
    }
    return days
  }, [dobYear, dobMonth])

  // If the user changes month/year and the previously
  // selected day is no longer valid (e.g. Feb 30), clear it.
  useEffect(() => {
    if (dobDay && !availableDays.includes(dobDay)) {
      setDobDay('')
    }
  }, [availableDays, dobDay])

  /* ── Save mutation ────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<UserProfileData>) =>
      saveProfile(accessToken, payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: [PROFILE_QUERY_KEY, accessToken],
      })

      const previous =
        queryClient.getQueryData<UserProfileData | null>([
          PROFILE_QUERY_KEY,
          accessToken,
        ])

      if (previous) {
        queryClient.setQueryData(
          [PROFILE_QUERY_KEY, accessToken],
          { ...previous, ...payload }
        )
      }

      return { previous }
    },

    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [PROFILE_QUERY_KEY, accessToken],
          context.previous
        )
      }

      const errWithFields = err as Error & {
        fieldErrors?: FieldErrors
      }
      if (errWithFields.fieldErrors) {
        setFieldErrors(errWithFields.fieldErrors)
      }

      toast.error('Failed to save biodata', {
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

    onSuccess: (saved) => {
      toast.success('Biodata saved successfully!', {
        duration: 3000,
        icon: '✅',
        style: {
          background: '#1a1a2e',
          border: '1px solid #22c55e',
          color: '#ffffff',
        },
      })

      queryClient.setQueryData(
        [PROFILE_QUERY_KEY, accessToken],
        saved
      )

      setFormData({
        bio: saved.bio || '',
        country: saved.country || 'Kenya',
        county: saved.county || '',
        city: saved.city || '',
        date_of_birth: saved.date_of_birth || '',
      })

      const parsed = parseDob(saved.date_of_birth)
      setDobYear(parsed.year)
      setDobMonth(parsed.month)
      setDobDay(parsed.day)

      setFieldErrors({})
      setIsEditing(false)
    },
  })

  /* ── Handlers ─────────────────────────────────────── */
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target

    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'county') {
        const validCities = KENYA_CITIES[value] || []
        if (!validCities.includes(prev.city || '')) {
          next.city = ''
        }
      }
      return next
    })

    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleEnterEdit = () => {
    prefetchProfile()
    setIsEditing(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Combine the split DOB into YYYY-MM-DD (or null)
    const combined = combineDob(dobYear, dobMonth, dobDay)

    const payload: Partial<UserProfileData> = {
      ...formData,
      date_of_birth: combined,
    }

    const loadingToast = toast.loading('Saving biodata...', {
      style: {
        background: '#1a1a2e',
        border: '1px solid #3b82f6',
        color: '#ffffff',
      },
    })

    saveMutation.mutate(payload, {
      onSettled: () => toast.dismiss(loadingToast),
    })
  }

  const handleCancel = () => {
    if (data) {
      setFormData({
        bio: data.bio || '',
        country: data.country || 'Kenya',
        county: data.county || '',
        city: data.city || '',
        date_of_birth: data.date_of_birth || '',
      })

      const parsed = parseDob(data.date_of_birth)
      setDobYear(parsed.year)
      setDobMonth(parsed.month)
      setDobDay(parsed.day)
    }
    setFieldErrors({})
    setIsEditing(false)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
    toast.info('Biodata refreshed', {
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
    if (saveMutation.isPending) return
    onClose?.()
  }

  /* ── Loading ──────────────────────────────────────── */
  if (isLoading && data === undefined) {
    return (
      <div className="bio-main-wrapper">
        <div className="bio-loading-container">
          <div className="bio-loading-spinner"></div>
          <p className="bio-loading-text">Loading biodata...</p>
        </div>
      </div>
    )
  }

  /* ── Error ────────────────────────────────────────── */
  if (isError && !data) {
    return (
      <div className="bio-main-wrapper">
        <div className="bio-error-container">
          <div className="bio-error-icon">😅</div>
          <p className="bio-error-text">
            {error?.message || 'Failed to load biodata'}
          </p>
          <button
            onClick={() => refetch()}
            className="bio-retry-btn"
            type="button"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    )
  }

  const hasProfile = data !== null && data !== undefined

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="bio-main-wrapper">
      {/* Header */}
      <div className="bio-header-section">
        <div className="bio-header-left">
          <div className="bio-title-wrapper">
            <h2 className="bio-page-title">Bio Data</h2>
            <p className="bio-page-subtitle">
              {hasProfile
                ? 'Your personal details and location'
                : 'Set up your profile to get started'}
            </p>
          </div>
        </div>

        <div className="bio-header-right">
          <button
            className="bio-refresh-btn"
            onClick={handleRefresh}
            onMouseEnter={prefetchProfile}
            disabled={isRefreshing || isFetching}
            title="Refresh biodata"
            type="button"
          >
            <FiRefreshCw
              className={`bio-refresh-icon ${
                isRefreshing || isFetching ? 'bio-spinning' : ''
              }`}
            />
          </button>

          {!isEditing && (
            <button
              className="bio-edit-btn"
              onClick={handleEnterEdit}
              onMouseEnter={prefetchProfile}
              onTouchStart={prefetchProfile}
              type="button"
            >
              <FiEdit2 className="bio-btn-icon" />
              {hasProfile ? 'Edit Bio' : 'Create Bio'}
            </button>
          )}

          {onClose && (
            <IoMdClose
              onClick={handleClose}
              className={`bio-close-icon ${
                saveMutation.isPending ? 'bio-disabled' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bio-form-container">
        <form className="bio-form" onSubmit={handleSubmit} noValidate>
          <div className="bio-form-grid">
            {/* Bio */}
            <div className="bio-form-group bio-full-width">
              <label className="bio-form-label" htmlFor="bio">
                <FiFileText className="bio-label-icon" /> Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio || ''}
                onChange={handleInputChange}
                onFocus={prefetchProfile}
                className={`bio-form-input bio-form-textarea ${
                  fieldErrors.bio ? 'bio-input-error' : ''
                }`}
                disabled={!isEditing || saveMutation.isPending}
                placeholder="Tell others a little about yourself..."
                rows={4}
                maxLength={500}
              />
              {fieldErrors.bio ? (
                <span className="bio-field-error">{fieldErrors.bio}</span>
              ) : (
                <small className="bio-field-hint">
                  A short description shown on your public profile.
                </small>
              )}
            </div>

            {/* Country */}
            <div className="bio-form-group">
              <label className="bio-form-label" htmlFor="country">
                <FiMapPin className="bio-label-icon" /> Country
              </label>
              <input
                id="country"
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleInputChange}
                onFocus={prefetchProfile}
                className={`bio-form-input ${
                  fieldErrors.country ? 'bio-input-error' : ''
                }`}
                disabled={!isEditing || saveMutation.isPending}
                placeholder="e.g. Kenya"
              />
              {fieldErrors.country && (
                <span className="bio-field-error">
                  {fieldErrors.country}
                </span>
              )}
            </div>

            {/* County */}
            <div className="bio-form-group">
              <label className="bio-form-label" htmlFor="county">
                <FiMapPin className="bio-label-icon" /> County
              </label>
              <div className="bio-select-wrap">
                <select
                  id="county"
                  name="county"
                  value={formData.county || ''}
                  onChange={handleInputChange}
                  onFocus={prefetchProfile}
                  className={`bio-form-input bio-form-select ${
                    fieldErrors.county ? 'bio-input-error' : ''
                  }`}
                  disabled={!isEditing || saveMutation.isPending}
                >
                  <option value="">Select county</option>
                  {KENYA_COUNTIES.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
                <span className="bio-select-arrow" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
              {fieldErrors.county && (
                <span className="bio-field-error">
                  {fieldErrors.county}
                </span>
              )}
            </div>

            {/* City */}
            <div className="bio-form-group">
              <label className="bio-form-label" htmlFor="city">
                <FiMapPin className="bio-label-icon" /> City / Town
              </label>
              <div className="bio-select-wrap">
                <select
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  onFocus={prefetchProfile}
                  className={`bio-form-input bio-form-select ${
                    fieldErrors.city ? 'bio-input-error' : ''
                  }`}
                  disabled={
                    !isEditing ||
                    saveMutation.isPending ||
                    !formData.county
                  }
                >
                  <option value="">
                    {!formData.county
                      ? 'Select county first'
                      : availableCities.length === 0
                      ? 'No cities listed'
                      : 'Select city'}
                  </option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <span className="bio-select-arrow" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
              {fieldErrors.city && (
                <span className="bio-field-error">
                  {fieldErrors.city}
                </span>
              )}
            </div>

            {/* Date of Birth — Year / Month / Day */}
            <div className="bio-form-group bio-full-width">
              <label className="bio-form-label">
                <FiCalendar className="bio-label-icon" /> Date of Birth
              </label>

              <div className="bio-dob-row">
                {/* Year */}
                <div className="bio-select-wrap">
                  <select
                    aria-label="Year"
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    onFocus={prefetchProfile}
                    className={`bio-form-input bio-form-select ${
                      fieldErrors.date_of_birth ? 'bio-input-error' : ''
                    }`}
                    disabled={!isEditing || saveMutation.isPending}
                  >
                    <option value="">Year</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <span className="bio-select-arrow" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>

                {/* Month */}
                <div className="bio-select-wrap">
                  <select
                    aria-label="Month"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    onFocus={prefetchProfile}
                    className={`bio-form-input bio-form-select ${
                      fieldErrors.date_of_birth ? 'bio-input-error' : ''
                    }`}
                    disabled={!isEditing || saveMutation.isPending}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <span className="bio-select-arrow" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>

                {/* Day */}
                <div className="bio-select-wrap">
                  <select
                    aria-label="Day"
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    onFocus={prefetchProfile}
                    className={`bio-form-input bio-form-select ${
                      fieldErrors.date_of_birth ? 'bio-input-error' : ''
                    }`}
                    disabled={!isEditing || saveMutation.isPending}
                  >
                    <option value="">Day</option>
                    {availableDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span className="bio-select-arrow" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              </div>

              {fieldErrors.date_of_birth ? (
                <span className="bio-field-error">
                  {fieldErrors.date_of_birth}
                </span>
              ) : (
                <small className="bio-field-hint">
                  Pick year, month and day of birth.
                </small>
              )}
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="bio-form-actions">
              <button
                type="submit"
                className="bio-save-btn"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <span className="bio-spinner-small"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave className="bio-btn-icon" /> Save Changes
                  </>
                )}
              </button>

              <button
                type="button"
                className="bio-cancel-btn"
                onClick={handleCancel}
                disabled={saveMutation.isPending}
              >
                <FiXCircle className="bio-btn-icon" /> Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Biodata