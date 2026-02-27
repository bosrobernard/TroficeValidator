// customFetch.ts
export const unsafeFetch = async (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  console.log('⚠️ [Fetch] Making request:', url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers as Record<string, string>),
      },
    });

    clearTimeout(timeoutId);
    console.log('✅ [Fetch] Response received:', response.status);
    return response;

  } catch (error: any) {
    console.error('❌ [Fetch] Request failed:', error.message);
    throw error;
  }
};