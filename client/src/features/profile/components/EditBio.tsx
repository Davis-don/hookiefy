// src/pages/accounts/profile/components/EditBio.tsx

import AccountInfo from './AccountInfo';
import AccountPassword from './AccountPassword';

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

type Props = {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string;
  initialEmail: string;
  initialGender: 'M' | 'F' | 'O' | '' | null;
  onClose?: () => void;
  onSaved?: () => void;
};

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

function EditBio({
  initialFirstName,
  initialLastName,
  initialPhone,
  initialEmail,
  initialGender,
  onSaved,
}: Props) {
  return (
    <div className="overall-container-edit">
      {/* 1. General account details */}
      <AccountInfo
        initial={{
          email: initialEmail,
          firstName: initialFirstName,
          lastName: initialLastName,
          gender: initialGender,
          phoneNumber: initialPhone || null,
        }}
        onSaved={onSaved}
      />

      {/* 2. Password change */}
      <AccountPassword onSaved={onSaved} />
    </div>
  );
}

export default EditBio;