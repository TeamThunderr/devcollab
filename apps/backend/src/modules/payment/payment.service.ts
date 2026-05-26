export async function getPlans() {
  return [
    { id: 'free', name: 'Free', price: 0, currency: 'INR' },
    { id: 'pro', name: 'Pro', price: 999, currency: 'INR' },
  ];
}
