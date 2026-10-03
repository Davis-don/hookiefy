// src/features/businesses/data/kenyaLocations.ts

export type County = {
  name: string;
  towns: string[];
};

export const KENYA_COUNTIES: County[] = [
  { name: 'Nairobi',        towns: ['Nairobi CBD', 'Westlands', 'Karen', 'Kilimani', 'Parklands', 'Eastleigh', 'Embakasi', 'Kasarani', 'Rongai', 'Kawangware', 'Kibera', 'Ruaka', 'Runda', 'Langata'] },
  { name: 'Mombasa',        towns: ['Mombasa CBD', 'Nyali', 'Bamburi', 'Likoni', 'Mtwapa', 'Diani', 'Tudor', 'Changamwe'] },
  { name: 'Kisumu',         towns: ['Kisumu CBD', 'Milimani', 'Mamboleo', 'Nyamasaria', 'Ahero', 'Maseno', 'Kondele'] },
  { name: 'Nakuru',         towns: ['Nakuru CBD', 'Milimani', 'Kiamunyi', 'Naivasha', 'Gilgil', 'Njoro', 'Bahati'] },
  { name: 'Kiambu',         towns: ['Kiambu Town', 'Thika', 'Ruiru', 'Juja', 'Kikuyu', 'Limuru', 'Githurai', 'Kabete'] },
  { name: 'Machakos',       towns: ['Machakos Town', 'Athi River', 'Syokimau', 'Mlolongo', 'Kangundo', 'Wote'] },
  { name: 'Kajiado',        towns: ['Kajiado Town', 'Ngong', 'Kitengela', 'Rongai', 'Ongata Rongai', 'Athi River', 'Isinya'] },
  { name: 'Uasin Gishu',    towns: ['Eldoret', 'Iten (via)', 'Turbo', 'Kapsabet Road', 'Moiben', 'Soy'] },
  { name: 'Kakamega',       towns: ['Kakamega Town', 'Mumias', 'Butere', 'Khwisero', 'Lurambi', 'Shinyalu'] },
  { name: 'Bungoma',        towns: ['Bungoma Town', 'Webuye', 'Kimilili', 'Chwele', 'Malakisi'] },
  { name: 'Busia',          towns: ['Busia Town', 'Malaba', 'Port Victoria', 'Bumala', 'Nambale'] },
  { name: 'Siaya',          towns: ['Siaya Town', 'Bondo', 'Ugunja', 'Yala', 'Usenge'] },
  { name: 'Homa Bay',       towns: ['Homa Bay Town', 'Mbita', 'Oyugis', 'Rongo', 'Kendu Bay'] },
  { name: 'Migori',         towns: ['Migori Town', 'Kehancha', 'Awendo', 'Rongo', 'Suna'] },
  { name: 'Kisii',          towns: ['Kisii Town', 'Keroka', 'Suneka', 'Ogembo', 'Kilgoris Road'] },
  { name: 'Nyamira',        towns: ['Nyamira Town', 'Keroka', 'Miruka', 'Ekerenyo'] },
  { name: 'Narok',          towns: ['Narok Town', 'Kilgoris', 'Suswa', 'Ololulunga'] },
  { name: 'Bomet',          towns: ['Bomet Town', 'Sotik', 'Silbwet', 'Longisa'] },
  { name: 'Kericho',        towns: ['Kericho Town', 'Litein', 'Kipkelion', 'Londiani', 'Sondu'] },
  { name: 'Nandi',          towns: ['Kapsabet', 'Nandi Hills', 'Baraton', 'Kabiyet'] },
  { name: 'Trans Nzoia',    towns: ['Kitale', 'Kiminini', 'Endebess', 'Saboti'] },
  { name: 'West Pokot',     towns: ['Kapenguria', 'Makutano', 'Ortum', 'Chepareria'] },
  { name: 'Turkana',        towns: ['Lodwar', 'Kakuma', 'Lokichogio', 'Lokichar'] },
  { name: 'Samburu',        towns: ['Maralal', 'Baragoi', 'Wamba'] },
  { name: 'Isiolo',         towns: ['Isiolo Town', 'Merti', 'Garbatulla'] },
  { name: 'Meru',           towns: ['Meru Town', 'Maua', 'Nkubu', 'Timau', 'Chuka', 'Kianjai'] },
  { name: 'Tharaka-Nithi',  towns: ['Kathwana', 'Chuka', 'Chogoria', 'Marimanti'] },
  { name: 'Embu',           towns: ['Embu Town', 'Runyenjes', 'Manyatta', 'Siakago'] },
  { name: 'Kitui',          towns: ['Kitui Town', 'Mwingi', 'Mutomo', 'Kwa Vonza'] },
  { name: 'Machakos',       towns: ['Machakos Town', 'Athi River', 'Syokimau', 'Mlolongo', 'Kangundo', 'Wote'] },
  { name: 'Makueni',        towns: ['Wote', 'Makindu', 'Kibwezi', 'Mtito Andei', 'Tawa'] },
  { name: 'Nyandarua',      towns: ['Ol Kalou', 'Njabini', 'Engineer', 'Kinangop'] },
  { name: 'Nyeri',          towns: ['Nyeri Town', 'Karatina', 'Othaya', 'Mukurweini', 'Naro Moru'] },
  { name: 'Kirinyaga',      towns: ['Kerugoya', 'Kutus', 'Sagana', 'Kagio', 'Baricho'] },
  { name: 'Murang\'a',      towns: ['Murang\'a Town', 'Kenol', 'Kangema', 'Kandara', 'Kigumo'] },
  { name: 'Laikipia',       towns: ['Nanyuki', 'Nyahururu', 'Rumuruti', 'Doldol'] },
  { name: 'Baringo',        towns: ['Kabarnet', 'Eldama Ravine', 'Marigat', 'Mogotio'] },
  { name: 'Elgeyo-Marakwet',towns: ['Iten', 'Kapsowar', 'Chepkorio', 'Tambach'] },
  { name: 'Tana River',     towns: ['Hola', 'Bura', 'Madogo', 'Garsen'] },
  { name: 'Lamu',           towns: ['Lamu Town', 'Mokowe', 'Mpeketoni', 'Hindi'] },
  { name: 'Taita-Taveta',   towns: ['Voi', 'Wundanyi', 'Mwatate', 'Taveta'] },
  { name: 'Kwale',          towns: ['Kwale Town', 'Ukunda', 'Diani', 'Lungalunga', 'Kinango'] },
  { name: 'Kilifi',         towns: ['Kilifi Town', 'Malindi', 'Mtwapa', 'Watamu', 'Mariakani', 'Kaloleni'] },
  { name: 'Tana River',     towns: ['Hola', 'Bura', 'Madogo', 'Garsen'] },
  { name: 'Garissa',        towns: ['Garissa Town', 'Dadaab', 'Masalani', 'Balambala'] },
  { name: 'Wajir',          towns: ['Wajir Town', 'Habaswein', 'Griftu', 'Buna'] },
  { name: 'Mandera',        towns: ['Mandera Town', 'El Wak', 'Rhamu', 'Takaba'] },
  { name: 'Marsabit',       towns: ['Marsabit Town', 'Moyale', 'Laisamis', 'North Horr'] },
];

// Deduplicate by name just in case — keeps the dropdown clean.
const seen = new Set<string>();
export const UNIQUE_COUNTIES = KENYA_COUNTIES.filter((c) => {
  if (seen.has(c.name)) return false;
  seen.add(c.name);
  return true;
});