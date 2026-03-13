
import './clientdatacards.css'
import Clientdatacard from './Clientdatacard'
import clientdata from './clientsampledata'

function Clientdatacards() {
  return (
    <div className="cds-container">
      <div className="cds-grid">
        {clientdata.map((client) => (
          <Clientdatacard
            key={client.id}
            id={client.id}
            name={`${client.first_name} ${client.last_name}`}
            age={client.age}
            gender={client.gender}
            country={client.country}
            county={client.county}
            location={client.location_desc}
            image={client.uploaded_img}
            info={client.info}
          />
        ))}
      </div>
    </div>
  )
}

export default Clientdatacards