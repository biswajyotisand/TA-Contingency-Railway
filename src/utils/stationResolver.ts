// Railway Station & Workshop Code Resolver for Google Maps Routing
// Source: Google Maps Platform Code Assist

export const POPULAR_RAILWAY_STATIONS: Record<string, string> = {
  // South Eastern Railway & Eastern India
  "KGP": "Kharagpur Junction Railway Station, Kharagpur, West Bengal",
  "KGPW": "Kharagpur Railway Workshop, Kharagpur, West Bengal",
  "HIJ": "Hijli Railway Station, Kharagpur, West Bengal",
  "HWH": "Howrah Junction Railway Station, Kolkata, West Bengal",
  "SDAH": "Sealdah Railway Station, Kolkata, West Bengal",
  "SRC": "Santragachi Junction Railway Station, Howrah, West Bengal",
  "SHM": "Shalimar Railway Station, Howrah, West Bengal",
  "TATA": "Tatanagar Junction Railway Station, Jamshedpur, Jharkhand",
  "ROU": "Rourkela Junction Railway Station, Odisha",
  "CKP": "Chakradharpur Railway Station, Jharkhand",
  "BBS": "Bhubaneswar Railway Station, Odisha",
  "CTC": "Cuttack Junction Railway Station, Odisha",
  "PURI": "Puri Railway Station, Odisha",
  "BLS": "Baleshwar Railway Station, Balasore, Odisha",
  "BQA": "Bankura Junction Railway Station, West Bengal",
  "ADRA": "Adra Junction Railway Station, Purulia, West Bengal",
  "ASN": "Asansol Junction Railway Station, West Bengal",
  "DGR": "Durgapur Railway Station, West Bengal",
  "MDN": "Midnapore Railway Station, West Bengal",
  "KGP STN": "Kharagpur Junction Railway Station, West Bengal",
  "KGP WORKSHOP": "Kharagpur Railway Workshop, West Bengal",
  
  // Northeast Frontier Railway
  "NBQ": "New Bongaigaon Junction Railway Station, Bongaigaon, Assam",
  "NBQ WS": "New Bongaigaon Railway Workshop, Bongaigaon, Assam",
  "GHY": "Guwahati Railway Station, Assam",
  "KYQ": "Kamakhya Junction Railway Station, Guwahati, Assam",
  "NJP": "New Jalpaiguri Junction Railway Station, Siliguri, West Bengal",
  "DBRG": "Dibrugarh Railway Station, Assam",
  "APDJ": "Alipurduar Junction Railway Station, West Bengal",

  // Central & Northern India
  "NDLS": "New Delhi Railway Station, Delhi",
  "DLI": "Old Delhi Railway Station, Delhi",
  "NZM": "Hazrat Nizamuddin Railway Station, Delhi",
  "ANVT": "Anand Vihar Terminal Railway Station, Delhi",
  "CNB": "Kanpur Central Railway Station, Uttar Pradesh",
  "LKO": "Lucknow Charbagh Railway Station, Uttar Pradesh",
  "BSB": "Varanasi Junction Railway Station, Uttar Pradesh",
  "PRYJ": "Prayagraj Junction Railway Station, Uttar Pradesh",
  "ALD": "Prayagraj Junction Railway Station, Uttar Pradesh",
  "GKP": "Gorakhpur Junction Railway Station, Uttar Pradesh",
  "AGC": "Agra Cantt Railway Station, Uttar Pradesh",
  "JHS": "Virangana Lakshmibai Jhansi Railway Station, Uttar Pradesh",
  "BPL": "Bhopal Junction Railway Station, Madhya Pradesh",
  "JBP": "Jabalpur Junction Railway Station, Madhya Pradesh",
  "NGP": "Nagpur Junction Railway Station, Maharashtra",
  "PNBE": "Patna Junction Railway Station, Bihar",
  "GAYA": "Gaya Junction Railway Station, Bihar",
  "RNC": "Ranchi Junction Railway Station, Jharkhand",
  "DHN": "Dhanbad Junction Railway Station, Jharkhand",
  
  // Western & Southern India
  "CSMT": "Chhatrapati Shivaji Maharaj Terminus, Mumbai, Maharashtra",
  "MMCT": "Mumbai Central Railway Station, Mumbai, Maharashtra",
  "LTT": "Lokmanya Tilak Terminus, Kurla, Mumbai",
  "BDTS": "Bandra Terminus, Mumbai, Maharashtra",
  "PUNE": "Pune Junction Railway Station, Maharashtra",
  "ADI": "Ahmedabad Junction Railway Station, Gujarat",
  "BRC": "Vadodara Junction Railway Station, Gujarat",
  "JP": "Jaipur Junction Railway Station, Rajasthan",
  "MAS": "MGR Chennai Central Railway Station, Chennai, Tamil Nadu",
  "MS": "Chennai Egmore Railway Station, Chennai, Tamil Nadu",
  "SBC": "KSR Bengaluru City Junction Railway Station, Bengaluru, Karnataka",
  "YPR": "Yesvantpur Junction Railway Station, Bengaluru, Karnataka",
  "SC": "Secunderabad Junction Railway Station, Telangana",
  "HYB": "Hyderabad Deccan Nampally Railway Station, Telangana",
  "BZA": "Vijayawada Junction Railway Station, Andhra Pradesh",
  "VSKP": "Visakhapatnam Junction Railway Station, Andhra Pradesh",
  "CBE": "Coimbatore Junction Railway Station, Tamil Nadu",
  "TVC": "Thiruvananthapuram Central Railway Station, Kerala",
  "ERS": "Ernakulam Junction South Railway Station, Kochi, Kerala",
};

export function resolveRailwayPlace(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase();

  // 1. Exact station code match from dictionary
  if (POPULAR_RAILWAY_STATIONS[upper]) {
    return POPULAR_RAILWAY_STATIONS[upper];
  }

  // 2. Already looks like a complete address or station name
  if (
    trimmed.toLowerCase().includes("station") || 
    trimmed.toLowerCase().includes("workshop") || 
    trimmed.toLowerCase().includes(",") ||
    trimmed.toLowerCase().includes("terminus") ||
    trimmed.toLowerCase().includes("junction")
  ) {
    return trimmed;
  }

  // 3. Common Railway Workshop code pattern (e.g. KGPW, NBQW, GHYW)
  if (upper.endsWith("W") && POPULAR_RAILWAY_STATIONS[upper.slice(0, -1)]) {
    const parentStation = POPULAR_RAILWAY_STATIONS[upper.slice(0, -1)];
    const city = parentStation.split(",")[1]?.trim() || "";
    return `${parentStation.split(" Junction")[0]} Railway Workshop${city ? `, ${city}` : ""}`;
  }

  // 4. Typical 3 or 4 uppercase character Indian Railways station code
  if (/^[A-Z]{3,4}$/.test(upper)) {
    return `${upper} Railway Station, India`;
  }

  return trimmed;
}
