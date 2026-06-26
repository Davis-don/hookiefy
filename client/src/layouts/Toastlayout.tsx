// layouts/Toastlayout.tsx
import type { ReactNode } from 'react'

interface ToastlayoutProps {
  children: ReactNode
}

function Toastlayout({ children }: ToastlayoutProps) {
  return (
    <div className="toast-layout-container">
      {children}
    </div>
  )
}

export default Toastlayout