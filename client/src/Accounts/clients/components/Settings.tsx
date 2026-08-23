import './settings.css'
import { IoArrowBack } from "react-icons/io5";

interface SettingsProps {
  onBack: () => void;
}

function Settings({ onBack }: SettingsProps) {
  return (
    <div className="overall-client-settings-container">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onBack}>
          <IoArrowBack />
        </button>
        <h1>Settings</h1>
      </div>
    </div>
  )
}

export default Settings