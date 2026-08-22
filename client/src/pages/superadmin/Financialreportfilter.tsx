import './financialreportfilter.css'
import { useState } from 'react'
import { FiCalendar, FiFilter, FiSearch, FiX } from 'react-icons/fi'

interface FinancialreportfilterProps {
  onFilter: (year: string, month: string) => void
  onReset: () => void
}

function Financialreportfilter({ onFilter, onReset }: FinancialreportfilterProps) {
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = []
  for (let i = 0; i < 5; i++) {
    yearOptions.push(currentYear - i)
  }

  const monthOptions = [
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
    { value: '12', label: 'December' }
  ]

  const handleApplyFilter = () => {
    onFilter(selectedYear, selectedMonth)
  }

  const handleReset = () => {
    setSelectedYear('')
    setSelectedMonth('')
    onReset()
  }

  const isFilterApplied = selectedYear || selectedMonth

  return (
    <div className="frf-main-wrapper">
      <div className="frf-header">
        <div className="frf-title-section">
          <FiFilter className="frf-filter-icon" />
          <h3 className="frf-title">Financial Reports</h3>
          <span className="frf-badge">Filters</span>
        </div>
      </div>

      <div className="frf-filters-container">
        <div className="frf-filter-group">
          <label className="frf-label">
            <FiCalendar className="frf-label-icon" />
            Year
          </label>
          <select
            className="frf-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="frf-filter-group">
          <label className="frf-label">
            <FiCalendar className="frf-label-icon" />
            Month
          </label>
          <select
            className="frf-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="">All Months</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="frf-actions">
          <button 
            className="frf-apply-btn"
            onClick={handleApplyFilter}
            disabled={!isFilterApplied}
          >
            <FiSearch className="frf-btn-icon" />
            Apply Filter
          </button>
          
          {isFilterApplied && (
            <button 
              className="frf-reset-btn"
              onClick={handleReset}
            >
              <FiX className="frf-btn-icon" />
              Reset
            </button>
          )}
        </div>
      </div>

      {isFilterApplied && (
        <div className="frf-active-filters">
          <span className="frf-active-label">Active Filters:</span>
          {selectedYear && (
            <span className="frf-filter-tag">
              Year: {selectedYear}
            </span>
          )}
          {selectedMonth && (
            <span className="frf-filter-tag">
              Month: {monthOptions.find(m => m.value === selectedMonth)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Financialreportfilter