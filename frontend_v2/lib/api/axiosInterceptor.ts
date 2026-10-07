/** Clear authentication data stored in sessionStorage. */
export const clearAuthSession = () => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('cakeStoreGuestToken');
    sessionStorage.removeItem('cakeStoreGuestPhone');
  }
};

