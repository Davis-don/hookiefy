import './mainlayout.css'
import Header from '../components/header/Header'
import Footer from '../components/footer/Footer'

function Mainlayout({children}: {children: React.ReactNode}) {
  return (
    <div className="">
      <Header />
      {children}
      <Footer />
    </div>
  )
}

export default Mainlayout