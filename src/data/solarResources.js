// NASA POWER climatology API v2.9.7, retrieved 2026-09-04. Values are GHI,
// not roof-plane irradiation or measured PV output. See DATA_SOURCES.md.
export const SOLAR_RESOURCE_PROFILES = [
  { id: 'sacramento', label: 'Sacramento, CA', latitude: 38.5816, longitude: -121.4944, monthlyGhi: [2.1994, 3.3156, 4.6404, 6.155, 7.4681, 8.2903, 8.238, 7.362, 5.9539, 4.2835, 2.7619, 1.9733] },
  { id: 'phoenix', label: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.074, monthlyGhi: [3.432, 4.4314, 5.8872, 7.2782, 8.1689, 8.4958, 7.4866, 6.9103, 6.1613, 5.0069, 3.78, 3.0816] },
  { id: 'boston', label: 'Boston, MA', latitude: 42.3601, longitude: -71.0589, monthlyGhi: [1.8353, 2.6558, 3.6905, 4.7172, 5.2956, 5.7214, 5.9633, 5.3086, 4.2658, 2.7946, 1.9675, 1.4868] },
  { id: 'boone', label: 'Boone, NC', latitude: 36.2168, longitude: -81.6746, monthlyGhi: [2.3794, 3.0187, 4.1141, 5.2238, 5.6638, 6.1277, 5.7886, 5.3477, 4.561, 3.5983, 2.7828, 2.0935] },
  { id: 'tallahassee', label: 'Tallahassee, FL', latitude: 30.4383, longitude: -84.2807, monthlyGhi: [3.1534, 3.7303, 4.9354, 5.9676, 6.5244, 6.0089, 5.8759, 5.405, 5.005, 4.3711, 3.541, 2.7943] },
].map(profile => ({
  ...profile,
  version: 1,
  period: '2001–2020',
  resolution: '1° latitude × 1° longitude, representative city grid cell',
  units: 'kWh/m²/day',
  reviewedAt: '2026-09-04',
  sourceUrl: `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${profile.longitude}&latitude=${profile.latitude}&format=JSON`,
}));
