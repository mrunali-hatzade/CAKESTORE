export interface IndianCity {
  name: string;
  state: string;
  popularAreas: string[];
}

export interface IndianPlaceOption {
  label: string;
  city: string;
  area?: string;
  state: string;
  isNearby?: boolean;
}

export const INDIAN_POPULAR_PLACES: IndianPlaceOption[] = [
  { label: 'Near by Me (Current Location)', city: 'Near by Me', state: '', isNearby: true },
  { label: 'Pune, Maharashtra', city: 'Pune', state: 'Maharashtra' },
  { label: 'Akurdi, Pune', city: 'Pune', area: 'Akurdi', state: 'Maharashtra' },
  { label: 'Chinchwad, Pune', city: 'Pune', area: 'Chinchwad', state: 'Maharashtra' },
  { label: 'Pimpri, Pune', city: 'Pune', area: 'Pimpri', state: 'Maharashtra' },
  { label: 'Wakad, Pune', city: 'Pune', area: 'Wakad', state: 'Maharashtra' },
  { label: 'Koregaon Park, Pune', city: 'Pune', area: 'Koregaon Park', state: 'Maharashtra' },
  { label: 'Baner, Pune', city: 'Pune', area: 'Baner', state: 'Maharashtra' },
  { label: 'Hinjawadi, Pune', city: 'Pune', area: 'Hinjawadi', state: 'Maharashtra' },
  { label: 'Kothrud, Pune', city: 'Pune', area: 'Kothrud', state: 'Maharashtra' },
  { label: 'Mumbai, Maharashtra', city: 'Mumbai', state: 'Maharashtra' },
  { label: 'Bandra West, Mumbai', city: 'Mumbai', area: 'Bandra West', state: 'Maharashtra' },
  { label: 'Juhu, Mumbai', city: 'Mumbai', area: 'Juhu', state: 'Maharashtra' },
  { label: 'Andheri West, Mumbai', city: 'Mumbai', area: 'Andheri West', state: 'Maharashtra' },
  { label: 'Powai, Mumbai', city: 'Mumbai', area: 'Powai', state: 'Maharashtra' },
  { label: 'Bengaluru, Karnataka', city: 'Bengaluru', state: 'Karnataka' },
  { label: 'Indiranagar, Bengaluru', city: 'Bengaluru', area: 'Indiranagar', state: 'Karnataka' },
  { label: 'Koramangala, Bengaluru', city: 'Bengaluru', area: 'Koramangala', state: 'Karnataka' },
  { label: 'Whitefield, Bengaluru', city: 'Bengaluru', area: 'Whitefield', state: 'Karnataka' },
  { label: 'Delhi NCR', city: 'Delhi NCR', state: 'Delhi' },
  { label: 'Connaught Place, Delhi', city: 'Delhi NCR', area: 'Connaught Place', state: 'Delhi' },
  { label: 'Gurugram, Delhi NCR', city: 'Delhi NCR', area: 'Gurugram', state: 'Haryana' },
  { label: 'Noida, Delhi NCR', city: 'Delhi NCR', area: 'Noida', state: 'Uttar Pradesh' },
  { label: 'Hyderabad, Telangana', city: 'Hyderabad', state: 'Telangana' },
  { label: 'Jubilee Hills, Hyderabad', city: 'Hyderabad', area: 'Jubilee Hills', state: 'Telangana' },
  { label: 'Hitec City, Hyderabad', city: 'Hyderabad', area: 'Hitec City', state: 'Telangana' },
  { label: 'Chennai, Tamil Nadu', city: 'Chennai', state: 'Tamil Nadu' },
  { label: 'Kolkata, West Bengal', city: 'Kolkata', state: 'West Bengal' },
  { label: 'Ahmedabad, Gujarat', city: 'Ahmedabad', state: 'Gujarat' },
  { label: 'Jaipur, Rajasthan', city: 'Jaipur', state: 'Rajasthan' },
];

export const INDIAN_POPULAR_CITIES: IndianCity[] = [
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    popularAreas: ['Bandra West', 'Juhu', 'Powai', 'Andheri West', 'Colaba', 'Dadar', 'Lower Parel'],
  },
  {
    name: 'Pune',
    state: 'Maharashtra',
    popularAreas: ['Koregaon Park', 'Kothrud', 'Viman Nagar', 'Baner', 'Wakad', 'Aundh', 'Kalyani Nagar'],
  },
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    popularAreas: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'JP Nagar', 'Malleshwaram'],
  },
  {
    name: 'Delhi NCR',
    state: 'Delhi',
    popularAreas: ['Connaught Place', 'South Extension', 'Hauz Khas', 'Gurugram DLF Phase 5', 'Noida Sector 18'],
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    popularAreas: ['Jubilee Hills', 'Banjara Hills', 'Hitec City', 'Gachibowli', 'Madhapur', 'Kondapur'],
  },
  {
    name: 'Chennai',
    state: 'Tamil Nadu',
    popularAreas: ['T. Nagar', 'Anna Nagar', 'Adyar', 'Nungambakkam', 'Alwarpet', 'Besant Nagar'],
  },
  {
    name: 'Kolkata',
    state: 'West Bengal',
    popularAreas: ['Park Street', 'Salt Lake Sector 1', 'Ballygunge', 'New Town', 'Alipore', 'Southern Avenue'],
  },
  {
    name: 'Ahmedabad',
    state: 'Gujarat',
    popularAreas: ['Bodakdev', 'Satellite', 'Vastrapur', 'Navrangpura', 'SG Highway', 'Prahlad Nagar'],
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    popularAreas: ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Raja Park', 'Mansarovar', 'Civil Lines'],
  },
  {
    name: 'Chandigarh',
    state: 'Punjab',
    popularAreas: ['Sector 17', 'Sector 35', 'Sector 22', 'Sector 8', 'Sector 9', 'Mohali Phase 7'],
  },
  {
    name: 'Kochi',
    state: 'Kerala',
    popularAreas: ['Panampilly Nagar', 'Fort Kochi', 'Marine Drive', 'Kakkanad', 'Edappally'],
  },
  {
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    popularAreas: ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Indira Nagar', 'Mahanagar'],
  },
];

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi NCR',
  'Chandigarh',
];
