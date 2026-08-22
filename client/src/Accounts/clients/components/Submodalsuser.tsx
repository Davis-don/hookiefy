import './submodaluser.css'
import { usePaymentModalStore } from '../store/modalstore'
import Paymentmodal from './Paymentmodal';
import Successpayment from './Successpayment';
import Failedpayment from './Failedpayment';
import Isloadingpayment from './Isloadingpayment';

function Submodalsuser() {
  const { 
    isMount, 
    isSuccessPayment, 
    isFailedPayment, 
    isLoadingPayment 
  } = usePaymentModalStore();

  // Show the appropriate modal based on state
  const showModal = isMount || isSuccessPayment || isFailedPayment || isLoadingPayment;

  // Only render when any modal is active
  if (!showModal) {
    return null;
  }

  return (
    <div className="submodal-overlay">
      {/* Loading - Show first */}
      {isLoadingPayment && <Isloadingpayment />}
      
      {/* Success - Show when successful */}
      {isSuccessPayment && <Successpayment />}
      
      {/* Failed - Show when failed */}
      {isFailedPayment && <Failedpayment />}
      
      {/* Main Payment Modal - Show when isMount is true and no other state is active */}
      {isMount && !isLoadingPayment && !isSuccessPayment && !isFailedPayment && <Paymentmodal />}
    </div>
  )
}

export default Submodalsuser