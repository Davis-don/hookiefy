// adminData.ts

export interface Admin {
  adminId: string;
  name: string;
  email: string;
  phone: string;
  companyCommissionPercentage: number;
}

export const adminData: Admin[] = [
  {
    adminId: "ADM001",
    name: "David Mwangi",
    email: "david.mwangi@example.com",
    phone: "+254712345678",
    companyCommissionPercentage: 15,
  },
  {
    adminId: "ADM002",
    name: "Grace Wanjiru",
    email: "grace.wanjiru@example.com",
    phone: "+254722456789",
    companyCommissionPercentage: 20,
  },
  {
    adminId: "ADM003",
    name: "Brian Otieno",
    email: "brian.otieno@example.com",
    phone: "+254733567890",
    companyCommissionPercentage: 10,
  },
  {
    adminId: "ADM004",
    name: "Mercy Njeri",
    email: "mercy.njeri@example.com",
    phone: "+254744678901",
    companyCommissionPercentage: 25,
  },
  {
    adminId: "ADM005",
    name: "Kevin Kiptoo",
    email: "kevin.kiptoo@example.com",
    phone: "+254755789012",
    companyCommissionPercentage: 12,
  },
  {
    adminId: "ADM006",
    name: "Faith Achieng",
    email: "faith.achieng@example.com",
    phone: "+254766890123",
    companyCommissionPercentage: 18,
  },
  {
    adminId: "ADM007",
    name: "John Kamau",
    email: "john.kamau@example.com",
    phone: "+254777901234",
    companyCommissionPercentage: 15,
  },
  {
    adminId: "ADM008",
    name: "Purity Chebet",
    email: "purity.chebet@example.com",
    phone: "+254788012345",
    companyCommissionPercentage: 22,
  },
];