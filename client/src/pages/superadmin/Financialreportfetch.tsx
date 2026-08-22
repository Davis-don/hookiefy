import './financialreportfetch.css'
import { useState, useEffect, useRef } from 'react'
import { 
  FiCalendar, 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown,
  FiUsers,
  FiPrinter,
  FiFileText
} from 'react-icons/fi'
import { financialReports } from '../../data/financial'
import type {MonthlyFinancialReport, YearlyFinancialReport} from '../../data/financial'

interface FinancialreportfetchProps {
  year?: string
  month?: string
}

function Financialreportfetch({ year, month }: FinancialreportfetchProps) {
  const [selectedYearData, setSelectedYearData] = useState<YearlyFinancialReport | null>(null)
  const [filteredReports, setFilteredReports] = useState<MonthlyFinancialReport[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalHookups: 0,
    totalIncome: 0,
    totalAdminPayouts: 0,
    totalMarketingExpenses: 0,
    totalOperationalExpenses: 0,
    totalExpenses: 0,
    totalNetProfit: 0,
    averageProfit: 0
  })
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    
    setTimeout(() => {
      let yearData: YearlyFinancialReport | null = null
      
      if (year) {
        const found = financialReports.find(r => r.year === parseInt(year))
        if (found) {
          yearData = found
        }
      }
      
      setSelectedYearData(yearData)
      
      let reports: MonthlyFinancialReport[] = []
      
      if (yearData) {
        reports = yearData.reports
        if (month) {
          reports = reports.filter(r => {
            const monthNum = new Date(Date.parse(r.month + " 1, 2000")).getMonth() + 1
            return monthNum === parseInt(month)
          })
        }
      } else {
        const latestYear = financialReports[financialReports.length - 1]
        reports = latestYear.reports
        if (month) {
          reports = reports.filter(r => {
            const monthNum = new Date(Date.parse(r.month + " 1, 2000")).getMonth() + 1
            return monthNum === parseInt(month)
          })
        }
      }
      
      setFilteredReports(reports)
      
      const totals = reports.reduce((acc, report) => ({
        totalHookups: acc.totalHookups + report.totalHookups,
        totalIncome: acc.totalIncome + report.income,
        totalAdminPayouts: acc.totalAdminPayouts + report.adminPayouts,
        totalMarketingExpenses: acc.totalMarketingExpenses + report.marketingExpenses,
        totalOperationalExpenses: acc.totalOperationalExpenses + report.operationalExpenses,
        totalExpenses: acc.totalExpenses + report.totalExpenses,
        totalNetProfit: acc.totalNetProfit + report.netProfit,
      }), {
        totalHookups: 0,
        totalIncome: 0,
        totalAdminPayouts: 0,
        totalMarketingExpenses: 0,
        totalOperationalExpenses: 0,
        totalExpenses: 0,
        totalNetProfit: 0,
      })
      
      const count = reports.length || 1
      setSummary({
        ...totals,
        averageProfit: totals.totalNetProfit / count
      })
      
      setLoading(false)
    }, 500)
  }, [year, month])

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const content = printRef.current.innerHTML
        printWindow.document.write(`
          <html>
            <head>
              <title>Financial Report - ${selectedYearData?.year || financialReports[financialReports.length - 1].year}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: 'Times New Roman', Times, serif; 
                  padding: 50px 60px; 
                  background: white; 
                  color: #1a1a1a; 
                  line-height: 1.6;
                }
                
                /* Header */
                .print-header { 
                  text-align: center; 
                  border-bottom: 3px double #1a1a1a; 
                  padding-bottom: 25px; 
                  margin-bottom: 30px; 
                }
                .print-company { 
                  font-size: 14px; 
                  color: #555; 
                  letter-spacing: 3px; 
                  text-transform: uppercase;
                  font-weight: 600;
                }
                .print-title { 
                  font-size: 32px; 
                  font-weight: 700; 
                  color: #1a1a1a; 
                  margin: 8px 0 4px 0;
                  letter-spacing: 2px;
                }
                .print-subtitle { 
                  color: #666; 
                  font-size: 16px; 
                  font-weight: 400;
                }
                .print-date { 
                  color: #888; 
                  font-size: 13px; 
                  margin-top: 6px;
                }
                
                /* Summary Cards */
                .print-summary-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 15px;
                  margin-bottom: 30px;
                }
                .print-summary-item {
                  background: #f8f9fa;
                  padding: 14px 18px;
                  border-radius: 6px;
                  border: 1px solid #e9ecef;
                  text-align: center;
                }
                .print-summary-label {
                  color: #666;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-weight: 600;
                }
                .print-summary-value {
                  font-size: 20px;
                  font-weight: 700;
                  color: #1a1a1a;
                  margin-top: 4px;
                }
                .print-summary-value.positive { color: #2e7d32; }
                .print-summary-value.negative { color: #c62828; }
                
                /* Detail Summary */
                .print-detail-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 12px;
                  padding: 15px 18px;
                  background: #f8f9fa;
                  border-radius: 6px;
                  margin-bottom: 25px;
                  border: 1px solid #e9ecef;
                }
                .print-detail-item {
                  text-align: center;
                }
                .print-detail-label {
                  color: #888;
                  font-size: 10px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-weight: 600;
                }
                .print-detail-value {
                  font-size: 16px;
                  font-weight: 600;
                  color: #1a1a1a;
                  margin-top: 2px;
                }
                
                /* Table */
                .print-table-wrapper {
                  margin-top: 10px;
                  border: 1px solid #dee2e6;
                  border-radius: 6px;
                  overflow: hidden;
                }
                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 13px;
                }
                .print-table thead {
                  background: #1a1a1a;
                }
                .print-table thead th {
                  color: white;
                  padding: 12px 14px;
                  text-align: left;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-weight: 600;
                }
                .print-table tbody tr {
                  border-bottom: 1px solid #e9ecef;
                }
                .print-table tbody tr:last-child {
                  border-bottom: none;
                }
                .print-table tbody tr:nth-child(even) {
                  background: #fafafa;
                }
                .print-table tbody td {
                  padding: 10px 14px;
                  color: #333;
                }
                .print-table tbody tr:hover {
                  background: #f0f0f0;
                }
                
                /* Table Colors */
                .print-month { font-weight: 600; color: #1a1a1a; }
                .print-income { color: #2e7d32; }
                .print-expense { color: #c62828; }
                .print-profit-positive { color: #2e7d32; font-weight: 700; }
                .print-profit-negative { color: #c62828; font-weight: 700; }
                .print-hookup { color: #1565c0; font-weight: 600; }
                .print-payout { color: #6a1b9a; }
                .print-marketing { color: #e65100; }
                .print-operational { color: #00695c; }
                
                /* Total Row */
                .print-total-row {
                  background: #1a1a1a !important;
                }
                .print-total-row td {
                  color: white !important;
                  font-weight: 700;
                  padding: 12px 14px !important;
                  border-top: 2px solid #1a1a1a;
                }
                .print-total-row .print-income { color: #66bb6a !important; }
                .print-total-row .print-expense { color: #ef5350 !important; }
                .print-total-row .print-profit-positive { color: #66bb6a !important; }
                .print-total-row .print-profit-negative { color: #ef5350 !important; }
                
                /* Footer */
                .print-footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #dee2e6;
                  display: flex;
                  justify-content: space-between;
                  color: #999;
                  font-size: 12px;
                }
                .print-footer-left { text-align: left; }
                .print-footer-right { text-align: right; }
                .print-signature {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #dee2e6;
                  display: flex;
                  justify-content: space-between;
                }
                .print-signature-line {
                  width: 200px;
                  border-bottom: 1px solid #1a1a1a;
                  margin-top: 30px;
                  padding-bottom: 4px;
                  text-align: center;
                  font-size: 12px;
                  color: #888;
                }
                
                @media print {
                  body { padding: 30px 40px; }
                  .print-table tbody tr:nth-child(even) { background: #f5f5f5; }
                  .print-summary-item { background: #f0f0f0; }
                  .print-detail-grid { background: #f0f0f0; }
                }
              </style>
            </head>
            <body>
              ${content}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
        printWindow.close()
      }
    }
  }

  if (loading) {
    return (
      <div className="frf-loading-container">
        <div className="frf-spinner"></div>
        <p className="frf-loading-text">Loading financial data...</p>
      </div>
    )
  }

  const yearDisplay = selectedYearData ? selectedYearData.year : financialReports[financialReports.length - 1].year
  const monthDisplay = month ? new Date(2026, parseInt(month)-1).toLocaleString('default', { month: 'long' }) : 'All Months'

  return (
    <div className="frf-main-container">
      {/* Print Reference */}
      <div ref={printRef} className="frf-print-content">
        {/* Print Header */}
        <div className="frf-print-header">
          <div className="frf-print-company">Kinstry Systems</div>
          <h1 className="frf-print-title">Financial Report</h1>
          <p className="frf-print-subtitle">
            {yearDisplay} {monthDisplay !== 'All Months' ? `- ${monthDisplay}` : ''}
          </p>
          <p className="frf-print-date">Generated: {new Date().toLocaleString()}</p>
        </div>

        {/* Print Button */}
        <div className="frf-print-actions">
          <button className="frf-print-btn" onClick={handlePrint}>
            <FiPrinter className="frf-btn-icon" /> Print Report
          </button>
        </div>

        {/* Summary Cards */}
        <div className="frf-summary-grid">
          <div className="frf-summary-card frf-income-card">
            <div className="frf-summary-icon">
              <FiTrendingUp />
            </div>
            <div className="frf-summary-content">
              <span className="frf-summary-label">Total Income</span>
              <span className="frf-summary-value frf-income-value">{formatCurrency(summary.totalIncome)}</span>
            </div>
          </div>

          <div className="frf-summary-card frf-expense-card">
            <div className="frf-summary-icon">
              <FiTrendingDown />
            </div>
            <div className="frf-summary-content">
              <span className="frf-summary-label">Total Expenses</span>
              <span className="frf-summary-value frf-expense-value">{formatCurrency(summary.totalExpenses)}</span>
            </div>
          </div>

          <div className="frf-summary-card frf-profit-card">
            <div className="frf-summary-icon">
              <FiDollarSign />
            </div>
            <div className="frf-summary-content">
              <span className="frf-summary-label">Net Profit</span>
              <span className={`frf-summary-value ${summary.totalNetProfit >= 0 ? 'frf-profit-positive' : 'frf-profit-negative'}`}>
                {formatCurrency(summary.totalNetProfit)}
              </span>
            </div>
          </div>

          <div className="frf-summary-card frf-hookup-card">
            <div className="frf-summary-icon">
              <FiUsers />
            </div>
            <div className="frf-summary-content">
              <span className="frf-summary-label">Total Hookups</span>
              <span className="frf-summary-value">{summary.totalHookups.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Additional Summary Details */}
        <div className="frf-detail-summary">
          <div className="frf-detail-item">
            <span className="frf-detail-label">Admin Payouts</span>
            <span className="frf-detail-value">{formatCurrency(summary.totalAdminPayouts)}</span>
          </div>
          <div className="frf-detail-item">
            <span className="frf-detail-label">Marketing</span>
            <span className="frf-detail-value">{formatCurrency(summary.totalMarketingExpenses)}</span>
          </div>
          <div className="frf-detail-item">
            <span className="frf-detail-label">Operational</span>
            <span className="frf-detail-value">{formatCurrency(summary.totalOperationalExpenses)}</span>
          </div>
          <div className="frf-detail-item">
            <span className="frf-detail-label">Avg Monthly Profit</span>
            <span className="frf-detail-value" style={{ color: summary.averageProfit >= 0 ? '#00e676' : '#ff5252' }}>
              {formatCurrency(summary.averageProfit)}
            </span>
          </div>
        </div>

        {/* Filter Info */}
        {(year || month) && (
          <div className="frf-filter-info">
            <FiCalendar className="frf-filter-info-icon" />
            <span>
              Showing data for {month ? `Month: ${monthDisplay}` : ''}
              {year && month ? ' | ' : ''}
              {year ? `Year: ${yearDisplay}` : ''}
            </span>
          </div>
        )}

        {/* Transactions Table */}
        <div className="frf-table-wrapper">
          <table className="frf-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Hookups</th>
                <th>Income</th>
                <th>Admin Payouts</th>
                <th>Marketing</th>
                <th>Operational</th>
                <th>Total Expenses</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report, index) => (
                  <tr key={index}>
                    <td className="frf-month-cell">{report.month}</td>
                    <td className="frf-hookup-cell">{report.totalHookups.toLocaleString()}</td>
                    <td className="frf-income-cell">{formatCurrency(report.income)}</td>
                    <td className="frf-payout-cell">{formatCurrency(report.adminPayouts)}</td>
                    <td className="frf-marketing-cell">{formatCurrency(report.marketingExpenses)}</td>
                    <td className="frf-operational-cell">{formatCurrency(report.operationalExpenses)}</td>
                    <td className="frf-expense-cell">{formatCurrency(report.totalExpenses)}</td>
                    <td className={`frf-profit-cell ${report.netProfit >= 0 ? 'frf-profit-positive' : 'frf-profit-negative'}`}>
                      {formatCurrency(report.netProfit)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="frf-empty-cell">
                    <div className="frf-empty-state">
                      <FiFileText className="frf-empty-icon" />
                      <p>No financial data found</p>
                      <span>Try adjusting your filters</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredReports.length > 0 && (
              <tfoot>
                <tr className="frf-total-row">
                  <td><strong>TOTAL</strong></td>
                  <td><strong>{summary.totalHookups.toLocaleString()}</strong></td>
                  <td><strong>{formatCurrency(summary.totalIncome)}</strong></td>
                  <td><strong>{formatCurrency(summary.totalAdminPayouts)}</strong></td>
                  <td><strong>{formatCurrency(summary.totalMarketingExpenses)}</strong></td>
                  <td><strong>{formatCurrency(summary.totalOperationalExpenses)}</strong></td>
                  <td><strong>{formatCurrency(summary.totalExpenses)}</strong></td>
                  <td className={`frf-profit-cell ${summary.totalNetProfit >= 0 ? 'frf-profit-positive' : 'frf-profit-negative'}`}>
                    <strong>{formatCurrency(summary.totalNetProfit)}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

export default Financialreportfetch