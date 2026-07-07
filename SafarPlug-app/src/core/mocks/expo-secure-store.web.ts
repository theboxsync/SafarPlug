export async function getItemAsync(key: string): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  } catch (error) {
    console.warn(`SecureStore.getItemAsync failed for key: ${key}`, error);
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn(`SecureStore.setItemAsync failed for key: ${key}`, error);
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn(`SecureStore.deleteItemAsync failed for key: ${key}`, error);
  }
}
