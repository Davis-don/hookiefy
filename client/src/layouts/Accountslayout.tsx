// Accountslayout.tsx
import React from 'react'
import './accountslayout.css'
import { usePostActionStore } from '../Accounts/common/store/usepaymentstore'
import Getcontactmodal from '../Accounts/common/components/Getcontactmodal'

interface AccountslayoutProps {
  children: React.ReactNode
}

function Accountslayout({ children }: AccountslayoutProps) {
  const isOpen = usePostActionStore((s) => s.isOpen)
  const clear = usePostActionStore((s) => s.clear)

  return (
    <div className="overall-account-layout-container">
      {children}

      {/* Global post-action modal — rendered once for the
          entire app, driven by the store. */}
      {isOpen && <Getcontactmodal onClose={clear} />}
    </div>
  )
}

export default Accountslayout