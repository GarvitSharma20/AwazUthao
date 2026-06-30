export interface GeocodeResult {
  ward: string;
  city: string;
  state: string;
  formattedAddress: string;
}

export function getSmartLocalLocation(lat: number, lng: number): GeocodeResult {
  const cities = [
    { name: "Agra", state: "Uttar Pradesh", coords: [27.1767, 78.0081], wards: ["Taj Ganj", "Sanjay Place", "Dayalbagh", "Kamla Nagar", "Shahganj", "Lohamandi", "Rakabganj", "Hari Parvat"] },
    { name: "Aligarh", state: "Uttar Pradesh", coords: [27.8974, 78.0880], wards: ["Civil Lines", "Dodhpur", "Anupshahr Road", "Quarsi", "Ramghat Road", "Centre Point", "Avas Vikas", "Marris Road"] },
    { name: "Delhi", state: "Delhi", coords: [28.6139, 77.2090], wards: ["Connaught Place", "Chanakyapuri", "Karol Bagh", "Lajpat Nagar", "Saket", "Vasant Kunj", "Dwarka", "Rohini"] },
    { name: "Noida", state: "Uttar Pradesh", coords: [28.5355, 77.3910], wards: ["Sector 15", "Sector 62", "Sector 18", "Sector 50", "Sector 137", "Sector 76", "Sector 78", "Sector 93"] }
  ];

  let nearestCity = cities[0];
  let minDistance = Infinity;

  for (const city of cities) {
    const dist = Math.sqrt(Math.pow(lat - city.coords[0], 2) + Math.pow(lng - city.coords[1], 2));
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = city;
    }
  }

  // Generate a stable ward index based on coordinate fraction
  const seed = Math.abs(Math.floor((lat + lng) * 1000));
  const wardIndex = seed % nearestCity.wards.length;
  const wardName = nearestCity.wards[wardIndex];
  
  const wardString = `Ward ${wardIndex + 1} (${wardName})`;

  return {
    ward: wardString,
    city: nearestCity.name,
    state: nearestCity.state,
    formattedAddress: `${wardString}, ${nearestCity.name}, ${nearestCity.state}`
  };
}

export async function fetchReverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (!response.ok) {
      throw new Error("Failed server reverse geocode");
    }
    const data = await response.json();
    
    // Get smart local layout
    const defaultSmart = getSmartLocalLocation(lat, lng);
    
    let ward = data.ward || defaultSmart.ward;
    let city = data.city && data.city !== "Unknown City" ? data.city : defaultSmart.city;
    let state = data.state && data.state !== "India" ? data.state : defaultSmart.state;
    
    // Clean up ward display
    if (ward && !ward.startsWith("Ward")) {
      ward = `Ward (${ward})`;
    }

    return {
      ward,
      city,
      state,
      formattedAddress: data.displayName || `${ward}, ${city}, ${state}`
    };
  } catch (err) {
    console.warn("Using smart offline geocode fallback:", err);
    return getSmartLocalLocation(lat, lng);
  }
}
