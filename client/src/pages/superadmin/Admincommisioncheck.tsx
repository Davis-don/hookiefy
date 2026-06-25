import './admincommisioncheck.css'
import { useState } from 'react'
import Fetchalladmincoms from './Fetchalladmincoms'
import Searchadmin from './Searchadmin'
import Actualadminconedit from './Actualadminconedit'
import { useEditComModalStore } from "./store/admninmodaeditcom"

function Admincommisioncheck() {
   const { mounted } = useEditComModalStore();
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('name')

  const handleSearch = (term: string, type: string) => {
    setSearchTerm(term)
    setSearchType(type)
  }

  return (
   <div className="overall-adminin-commision-check">
    <div className="fetch-all-admins-com-main">
      <Searchadmin onSearch={handleSearch}/>
      <Fetchalladmincoms searchTerm={searchTerm} searchType={searchType}/>
    </div>
    {mounted && <div className="edit-com-modal">
  <Actualadminconedit/>
    </div>}
   </div>
  )
}

export default Admincommisioncheck