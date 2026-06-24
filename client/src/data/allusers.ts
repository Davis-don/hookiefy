export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'superadmin';
  profileImage: string | null;
  status: 'active' | 'inactive';
  joinDate: string;
}

export const sampleUsers: User[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Mwangi",
    email: "john.mwangi@company.com",
    phone: "+254712345678",
    role: "admin",
    profileImage: null,
    status: "active",
    joinDate: "2025-01-15"
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Achieng",
    email: "sarah.achieng@company.com",
    phone: "+254723456789",
    role: "user",
    profileImage: null,
    status: "active",
    joinDate: "2024-11-02"
  },
  {
    id: 3,
    firstName: "David",
    lastName: "Kimani",
    email: "david.kimani@company.com",
    phone: "+254734567890",
    role: "admin",
    profileImage: null,
    status: "inactive",
    joinDate: "2025-03-08"
  },
  {
    id: 4,
    firstName: "Grace",
    lastName: "Wanjiru",
    email: "grace.wanjiru@company.com",
    phone: "+254745678901",
    role: "user",
    profileImage: null,
    status: "active",
    joinDate: "2024-08-12"
  },
  {
    id: 5,
    firstName: "Mary",
    lastName: "Njeri",
    email: "mary.njeri@company.com",
    phone: "+254767890123",
    role: "user",
    profileImage: null,
    status: "active",
    joinDate: "2025-04-10"
  },
  {
    id: 6,
    firstName: "Peter",
    lastName: "Ochieng",
    email: "peter.ochieng@company.com",
    phone: "+254778901234",
    role: "admin",
    profileImage: null,
    status: "inactive",
    joinDate: "2024-09-25"
  },
  {
    id: 7,
    firstName: "Lucy",
    lastName: "Wambui",
    email: "lucy.wambui@company.com",
    phone: "+254789012345",
    role: "user",
    profileImage: null,
    status: "active",
    joinDate: "2025-05-15"
  },
  {
    id: 8,
    firstName: "James",
    lastName: "Kariuki",
    email: "james.kariuki@company.com",
    phone: "+254790123456",
    role: "admin",
    profileImage: null,
    status: "active",
    joinDate: "2024-12-01"
  },
  {
    id: 9,
    firstName: "Super",
    lastName: "Admin",
    email: "super.admin@company.com",
    phone: "+254701234567",
    role: "superadmin",
    profileImage: null,
    status: "active",
    joinDate: "2024-01-01"
  }
];