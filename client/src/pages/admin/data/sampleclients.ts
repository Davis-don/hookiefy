export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'client';
  status: 'active' | 'inactive';
}

export const sampleClients: Client[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Kariuki",
    email: "john.kariuki@techsolutions.com",
    phone: "+254712345678",
    role: "client",
    status: "active"
  },
  {
    id: 2,
    firstName: "Mary",
    lastName: "Wanjiru",
    email: "mary.wanjiru@greenenergy.co.ke",
    phone: "+254722456789",
    role: "client",
    status: "active"
  },
  {
    id: 3,
    firstName: "Peter",
    lastName: "Ochieng",
    email: "peter.ochieng@globallogistics.com",
    phone: "+254733567890",
    role: "client",
    status: "inactive"
  },
  {
    id: 4,
    firstName: "Sarah",
    lastName: "Akinyi",
    email: "sarah.akinyi@innovatehub.ke",
    phone: "+254744678901",
    role: "client",
    status: "active"
  },
  {
    id: 5,
    firstName: "James",
    lastName: "Mwangi",
    email: "james.mwangi@apexindustries.com",
    phone: "+254755789012",
    role: "client",
    status: "active"
  },
  {
    id: 6,
    firstName: "Grace",
    lastName: "Nekesa",
    email: "grace.nekesa@digitalagency.co.ke",
    phone: "+254766890123",
    role: "client",
    status: "inactive"
  },
  {
    id: 7,
    firstName: "Robert",
    lastName: "Kiprop",
    email: "robert.kiprop@financialpartners.com",
    phone: "+254777901234",
    role: "client",
    status: "active"
  },
  {
    id: 8,
    firstName: "Faith",
    lastName: "Chebet",
    email: "faith.chebet@healthplus.ke",
    phone: "+254788012345",
    role: "client",
    status: "active"
  },
  {
    id: 9,
    firstName: "Michael",
    lastName: "Odhiambo",
    email: "michael.odhiambo@agritech.com",
    phone: "+254799123456",
    role: "client",
    status: "active"
  },
  {
    id: 10,
    firstName: "Esther",
    lastName: "Njeri",
    email: "esther.njeri@edtech.ke",
    phone: "+254710234567",
    role: "client",
    status: "inactive"
  }
];