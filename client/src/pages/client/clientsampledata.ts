export interface Client {
  id: string
  first_name: string
  last_name: string
  age: number
  gender: 'male' | 'female' | 'other'
  country: string
  county: string
  location_desc: string
  uploaded_img: string
  info: string
}

const clientdata: Client[] = [
  {
    id: "9d8f1e6a-5c72-4a7e-b6a3-1d91c5d7f001",
    first_name: "Aisha",
    last_name: "Mwangi",
    age: 26,
    gender: "female",
    country: "Kenya",
    county: "Nairobi",
    location_desc: "Westlands near Sarit Centre",
    uploaded_img: "https://randomuser.me/api/portraits/women/44.jpg",
    info: "Looking for a gentleman from Nairobi who enjoys fine dining and can be my partner for weekend getaways. Must love traveling and trying new restaurants."
  },
  {
    id: "2b0c2f0e-14fa-4a73-8e2e-2b7e8d7a2002",
    first_name: "Kevin",
    last_name: "Otieno",
    age: 29,
    gender: "male",
    country: "Kenya",
    county: "Kisumu",
    location_desc: "Near Lake Basin Mall",
    uploaded_img: "https://randomuser.me/api/portraits/men/32.jpg",
    info: "Looking for a fun lady from Kisumu who can join me for road trips around Lake Victoria. I need someone who can be my adventure partner and possibly my designated driver for our escapades!"
  },
  {
    id: "8a4bba07-5e45-4f22-b0e3-7e4c5c103003",
    first_name: "Diana",
    last_name: "Njeri",
    age: 24,
    gender: "female",
    country: "Kenya",
    county: "Nakuru",
    location_desc: "Nakuru CBD area",
    uploaded_img: "https://randomuser.me/api/portraits/women/68.jpg",
    info: "Seeking a guy from Nakuru who loves photography and can model for my projects. Also need someone who can drive us to Lake Nakuru for sunset shoots on weekends."
  },
  {
    id: "c5e4df7b-31b1-4e0b-b4a7-89cfa2a94004",
    first_name: "Brian",
    last_name: "Kamau",
    age: 31,
    gender: "male",
    country: "Kenya",
    county: "Kiambu",
    location_desc: "Thika Road near Garden City",
    uploaded_img: "https://randomuser.me/api/portraits/men/51.jpg",
    info: "Looking for a gym partner from Kiambu who can spot me and also drive us to different fitness events around Nairobi. Must be motivated and have a valid license!"
  },
  {
    id: "41c3fd15-71a7-4c1b-a12f-4d5d6c9a5005",
    first_name: "Faith",
    last_name: "Achieng",
    age: 27,
    gender: "female",
    country: "Kenya",
    county: "Kisumu",
    location_desc: "Milimani estate",
    uploaded_img: "https://randomuser.me/api/portraits/women/12.jpg",
    info: "Searching for a music lover from Kisumu who can drive us to local concerts and music festivals. I need someone who enjoys live bands and can be my reliable ride to events."
  },
  {
    id: "bbab8f1c-8e7c-47a3-b01f-5f0e7f846006",
    first_name: "James",
    last_name: "Mutiso",
    age: 33,
    gender: "male",
    country: "Kenya",
    county: "Machakos",
    location_desc: "Machakos town center",
    uploaded_img: "https://randomuser.me/api/portraits/men/76.jpg",
    info: "Looking for a sports enthusiast from Machakos who can join me for weekend matches and also drive us to different venues. Must love football and have a reliable car."
  },
  {
    id: "1f32e9ab-40ad-4c2d-9a61-6b93b7c2c007",
    first_name: "Brenda",
    last_name: "Wanjiku",
    age: 25,
    gender: "female",
    country: "Kenya",
    county: "Nairobi",
    location_desc: "Kilimani near Yaya Centre",
    uploaded_img: "https://randomuser.me/api/portraits/women/25.jpg",
    info: "Seeking a fashion-forward guy from Nairobi who can be my shopping companion and chauffeur to different boutiques. Need someone who enjoys fashion and can carry my shopping bags!"
  },
  {
    id: "c0f9b6d4-9c4d-4f88-95e3-7c74f7b38008",
    first_name: "Daniel",
    last_name: "Kiptoo",
    age: 28,
    gender: "male",
    country: "Kenya",
    county: "Uasin Gishu",
    location_desc: "Eldoret town",
    uploaded_img: "https://randomuser.me/api/portraits/men/61.jpg",
    info: "Looking for an athletic lady from Eldoret who can train with me and drive us to different running events. Must love fitness and have a good sense of adventure."
  },
  {
    id: "0d3c5a6e-5e4b-4c4f-93c1-8c87a8a99009",
    first_name: "Lilian",
    last_name: "Atieno",
    age: 30,
    gender: "female",
    country: "Kenya",
    county: "Mombasa",
    location_desc: "Nyali beach area",
    uploaded_img: "https://randomuser.me/api/portraits/women/33.jpg",
    info: "Searching for a beach lover from Mombasa who can be my swimming buddy and drive us to different coastal spots. Need someone who enjoys sunset drives and beach parties."
  },
  {
    id: "6c8d5a2b-22d7-4e7f-a4d2-9e5b7d001010",
    first_name: "Eric",
    last_name: "Ndegwa",
    age: 34,
    gender: "male",
    country: "Kenya",
    county: "Nairobi",
    location_desc: "Runda estate",
    uploaded_img: "https://randomuser.me/api/portraits/men/45.jpg",
    info: "Looking for a sophisticated lady from Nairobi who can join me for business events and also be my driver for late-night meetings. Must be professional and have excellent navigation skills."
  }
]

export default clientdata