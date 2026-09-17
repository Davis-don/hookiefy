// AddService.tsx
import { useState } from 'react'
import {
  FiSave,
  FiXCircle,
  FiTool,
  FiDollarSign,
  FiMapPin,
} from 'react-icons/fi'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '../../../store/authtokenstore'
import './addservice.css'

interface ServiceCategory {
  id: number
  name: string
}

interface AddServiceProps {
  onCreated?: () => void
  onCancel?: () => void
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP']
const PRICING_UNITS = [
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_week', label: 'Per Week' },
  { value: 'per_month', label: 'Per Month' },
  { value: 'per_job', label: 'Per Job' },
]

const AddService = ({ onCreated, onCancel }: AddServiceProps) => {
  const { access } = useAuthStore()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '' as number | '',
    price: '',
    currency: 'KES',
    pricing_unit: 'per_job',
    location: '',
  })

  const { data: categories } = useQuery({
    queryKey: ['service-categories-public', access],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/services/service-categories/`,
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      )
      const d = await res.json()
      return (d?.categories ?? []) as ServiceCategory[]
    },
    enabled: !!access,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/services/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...form,
            category_id: Number(form.category_id),
            price: Number(form.price),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to create')
      return data
    },
    onSuccess: () => {
      toast.success('Service created.', { icon: '✅' })
      queryClient.invalidateQueries({ queryKey: ['my-services'] })
      onCreated?.()
    },
    onError: (err: Error) => {
      toast.error('Failed to create service', {
        description: err.message,
      })
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.category_id) {
      toast.error('Title and category are required.')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="ads-wrapper">
      <div className="ads-form-container">
        <form className="ads-form" onSubmit={handleSubmit} noValidate>
          <div className="ads-form-group">
            <label className="ads-form-label">
              <FiTool className="ads-label-icon" /> Service Title *
            </label>
            <input
              name="title"
              type="text"
              className="ads-form-input"
              placeholder="e.g. Private Math Tutoring"
              value={form.title}
              onChange={handleChange}
              disabled={mutation.isPending}
              maxLength={200}
            />
          </div>

          <div className="ads-form-group">
            <label className="ads-form-label">Category *</label>
            <select
              name="category_id"
              className="ads-form-input"
              value={form.category_id}
              onChange={handleChange}
              disabled={mutation.isPending}
            >
              <option value="">Select category…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ads-form-group">
            <label className="ads-form-label">Description</label>
            <textarea
              name="description"
              className="ads-form-input ads-form-textarea"
              placeholder="Describe what your service includes…"
              value={form.description}
              onChange={handleChange}
              disabled={mutation.isPending}
              rows={4}
            />
          </div>

          <div className="ads-form-row">
            <div className="ads-form-group">
              <label className="ads-form-label">
                <FiDollarSign className="ads-label-icon" /> Price
              </label>
              <input
                name="price"
                type="number"
                min="0"
                className="ads-form-input"
                placeholder="0"
                value={form.price}
                onChange={handleChange}
                disabled={mutation.isPending}
              />
            </div>

            <div className="ads-form-group">
              <label className="ads-form-label">Currency</label>
              <select
                name="currency"
                className="ads-form-input"
                value={form.currency}
                onChange={handleChange}
                disabled={mutation.isPending}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ads-form-row">
            <div className="ads-form-group">
              <label className="ads-form-label">Pricing Unit</label>
              <select
                name="pricing_unit"
                className="ads-form-input"
                value={form.pricing_unit}
                onChange={handleChange}
                disabled={mutation.isPending}
              >
                {PRICING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ads-form-group">
              <label className="ads-form-label">
                <FiMapPin className="ads-label-icon" /> Location
              </label>
              <input
                name="location"
                type="text"
                className="ads-form-input"
                placeholder="e.g. Nairobi"
                value={form.location}
                onChange={handleChange}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div className="ads-form-actions">
            <button
              type="submit"
              className="ads-save-btn"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <span className="ads-spinner-small" />
                  Creating…
                </>
              ) : (
                <>
                  <FiSave className="ads-btn-icon" /> Create Service
                </>
              )}
            </button>

            <button
              type="button"
              className="ads-cancel-btn"
              onClick={onCancel}
              disabled={mutation.isPending}
            >
              <FiXCircle className="ads-btn-icon" /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddService