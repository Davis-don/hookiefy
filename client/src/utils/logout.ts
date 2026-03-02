import { toast } from '../store/Toaststore';



export const logoutUser = async (apiUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${apiUrl}/accounts/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Logout failed');
    }

    // Show success toast
    toast.romantic(data.message || 'See you soon! Love is waiting...', {
      title: 'Logged Out 💕',
      duration: 5000,
    });

    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);

    return true;
  } catch (error) {
    // Show error toast
    toast.error(error instanceof Error ? error.message : 'Logout failed', {
      title: 'Error',
      duration: 5000,
    });
    return false;
  }
};