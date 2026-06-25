import './superadminfinances.css'
import { useState } from 'react'
import Financialreportfilter from './Financialreportfilter'
import Financialreportfetch from './Financialreportfetch'

function Superadminfinances() {
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const handleFilter = (year: string, month: string) => {
    setFilterYear(year)
    setFilterMonth(month)
  }

  const handleReset = () => {
    setFilterYear('')
    setFilterMonth('')
  }

  return (
    <div className="overall-super-admin-finances-container">
      <div className="financial-report-filter-main">
        <Financialreportfilter onFilter={handleFilter} onReset={handleReset} />
      </div>
      <div className="financial-report-fetch">
        <Financialreportfetch year={filterYear} month={filterMonth} />
      </div>
    </div>
  )
}

export default Superadminfinances