export interface CurrentUser {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  gender: string | null;
}

export const currentUser: CurrentUser = {
  id: 7,
  email: "davismugoikou@gmail.com",
  role: "superadmin",
  first_name: "Davis",
  last_name: "Mugo",
  phone_number: "+254712345678",
  gender: "M"
};