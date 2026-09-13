import './mainlayout.css'
import Header from '../components/Header/Header'
import Footer from '../components/footer/Footer'
function Mainlayout({children}: {children: React.ReactNode}) {
  return (
    <div className="mainlayout">
      <Header />
      {children}
      <Footer />
    </div>
  )
}

export default Mainlayout