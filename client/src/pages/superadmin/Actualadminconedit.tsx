import './actualadmincomedit.css'
import { IoClose } from "react-icons/io5";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useEditComModalStore } from "./store/admninmodaeditcom";

function Actualadminconedit() {
    const { toggleModal, id} =useEditComModalStore();
  return (
    <div className="overall-actiual-admin-form-edit">
        <div className="form-actual-header-com-edit">
            <h2>Edit</h2>
        <IoClose style={{cursor:"pointer"}} onClick={()=>toggleModal()}/>
        </div>
        <div className="form-actual-body-form">
            <h3>User Id:{id}</h3>
            <form  className='mt-3'>
                <input className='form-control p2 fs-3' type="number" placeholder='Eg 20'/>
                <button className='btn fs-3 btn-outline-info mt-2'>Save</button>
            </form>
        </div>
    </div>
  )
}

export default Actualadminconedit