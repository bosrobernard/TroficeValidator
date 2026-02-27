export interface NetworkTestResult {
  success: boolean;
  message: string;
  details: {
    googleTest: TestResult;
    jsonPlaceholderTest: TestResult;
    doronpayDomainTest: TestResult;
    troficeDomainTest: TestResult;
    httpTest: TestResult;
    domainTest: TestResult;
    ipTest: TestResult;
    doronpayLoginTest: TestResult;
    dnsTest: TestResult;
    portTest: TestResult;
    doronpayIpTest: TestResult;
    httpDoronpayTest: TestResult;
    githubTest: TestResult;
    cloudflareTest: TestResult;
    donkomiTest: TestResult;
  };
}

export interface TestResult {
  success: boolean;
  status?: number;
  error?: string;
  responseData?: any;
  duration?: number;
}

async function runTest(
  name: string,
  fn: () => Promise<TestResult>,
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...result, duration: Date.now() - start };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
      duration: Date.now() - start,
    };
  }
}

export async function testNetworkConnection(): Promise<NetworkTestResult> {
  console.log('🌐 Starting comprehensive network diagnostics...');

  // ─── 1. Google ───────────────────────────────────────────────────────────────
  const googleTest = await runTest('Google', async () => {
    const res = await fetch('https://www.google.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('1️⃣  Google:', googleTest);

  // ─── 2. JSONPlaceholder ──────────────────────────────────────────────────────
  const jsonPlaceholderTest = await runTest('JSONPlaceholder', async () => {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return { success: res.ok, status: res.status, responseData: data };
  });
  console.log('2️⃣  JSONPlaceholder:', jsonPlaceholderTest);

  // ─── 3. Doronpay Domain ──────────────────────────────────────────────────────
  const doronpayDomainTest = await runTest('Doronpay Domain', async () => {
    const res = await fetch('https://doronpay.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('3️⃣  Doronpay Domain:', doronpayDomainTest);

  // ─── 4. Trofice Domain ───────────────────────────────────────────────────────
  const troficeDomainTest = await runTest('Trofice Domain', async () => {
    const res = await fetch('https://trofice.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('4️⃣  Trofice Domain:', troficeDomainTest);

  // ─── 5. HTTP Test ────────────────────────────────────────────────────────────
  const httpTest = await runTest('HTTP (port 80)', async () => {
    const res = await fetch('http://httpforever.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('5️⃣  HTTP Test:', httpTest);

  // ─── 6. HTTPS Domain (Trofice API) ───────────────────────────────────────────
  const domainTest = await runTest('Trofice API (HTTPS Domain)', async () => {
    const res = await fetch('https://trofice.com/api/validator/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('6️⃣  Trofice API HTTPS:', domainTest);

  // ─── 7. HTTPS IP Test ────────────────────────────────────────────────────────
  const ipTest = await runTest('Trofice IP (173.212.220.230)', async () => {
    const res = await fetch('http://173.212.220.230', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Host: 'trofice.com' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('7️⃣  Trofice IP:', ipTest);

  // ─── 8. Doronpay Login ───────────────────────────────────────────────────────
  const doronpayLoginTest = await runTest('Doronpay Login API', async () => {
    const res = await fetch('https://webapi.doronpay.com/customers/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'test1234' }),
    });
    let responseData: any = null;
    try {
      responseData = await res.json();
    } catch {
      responseData = { raw: await res.text().catch(() => 'unreadable') };
    }
    return { success: res.status < 500, status: res.status, responseData };
  });
  console.log('8️⃣  Doronpay Login:', doronpayLoginTest);

  // ─── 9. DNS Resolution ───────────────────────────────────────────────────────
  const dnsTest = await runTest('DNS Resolution (DoH)', async () => {
    const res = await fetch(
      'https://dns.google/resolve?name=doronpay.com&type=A',
      { method: 'GET', headers: { Accept: 'application/dns-json' } },
    );
    const data = await res.json();
    return { success: res.ok, status: res.status, responseData: data };
  });
  console.log('9️⃣  DNS Test:', dnsTest);

  // ─── 10. Direct Port 443 ─────────────────────────────────────────────────────
  const portTest = await runTest('Direct Port 443 (Doronpay)', async () => {
    const res = await fetch('https://webapi.doronpay.com/customers/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'test1234' }),
    });
    const data = await res.json().catch(() => null);
    return {
      success: res.status < 500,
      status: res.status,
      responseData: data,
    };
  });
  console.log('🔟  Port Test:', portTest);

  // ─── 11. Doronpay Direct IP ──────────────────────────────────────────────────
  const doronpayIpTest = await runTest(
    'Doronpay Direct IP (213.199.50.204)',
    async () => {
      const res = await fetch('https://213.199.50.204/customers/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Host: 'webapi.doronpay.com',
        },
        body: JSON.stringify({ email: 'test@test.com', password: 'test1234' }),
      });
      const data = await res.json().catch(() => null);
      return {
        success: res.status < 500,
        status: res.status,
        responseData: data,
      };
    },
  );
  console.log('1️⃣1️⃣ Doronpay IP Direct:', doronpayIpTest);

  // ─── 12. Doronpay HTTP (no SSL) ──────────────────────────────────────────────
  const httpDoronpayTest = await runTest('Doronpay HTTP (no SSL)', async () => {
    const res = await fetch('http://doronpay.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('1️⃣2️⃣ HTTP Doronpay:', httpDoronpayTest);

  // ─── 13. GitHub ──────────────────────────────────────────────────────────────
  const githubTest = await runTest('GitHub HTTPS', async () => {
    const res = await fetch('https://api.github.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('1️⃣3️⃣ GitHub:', githubTest);

  // ─── 14. Cloudflare ──────────────────────────────────────────────────────────
  const cloudflareTest = await runTest('Cloudflare (1.1.1.1)', async () => {
    const res = await fetch('https://1.1.1.1', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('1️⃣4️⃣ Cloudflare:', cloudflareTest);

  // ─── 15. Donkomi (Cloudflare Proxied) ────────────────────────────────────────
  const donkomiTest = await runTest('Donkomi (CF Proxied)', async () => {
    const res = await fetch('https://susu.thedonkomi.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('1️⃣5️⃣ Donkomi CF:', donkomiTest);

  // ─── 16. LazyLogic (Same VPS as Trofice) ──────────────────────────────────────
  const lazylogicTest = await runTest('LazyLogic (Same VPS)', async () => {
    const res = await fetch('https://lazylogiclimited.com', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return { success: res.ok || res.status < 500, status: res.status };
  });
  console.log('1️⃣6️⃣ LazyLogic:', lazylogicTest);

  // ─── 17. LazyLogic DNS Resolution ────────────────────────────────────────────
  const lazylogicDnsTest = await runTest('LazyLogic DNS', async () => {
    const res = await fetch(
      'https://dns.google/resolve?name=lazylogiclimited.com&type=A',
      { method: 'GET', headers: { Accept: 'application/dns-json' } },
    );
    const data = await res.json();
    return { success: res.ok, status: res.status, responseData: data };
  });
  console.log('1️⃣7️⃣ LazyLogic DNS:', lazylogicDnsTest);

  // ─── 18. Trofice API via LazyLogic Domain ─────────────────────────────────────
const troficeLazyTest = await runTest('Trofice via LazyLogic', async () => {
  // This assumes you set up the subdomain
  const res = await fetch('https://lazylogiclimited.com', {
    method: 'GET',
    headers: { 
      'Host': 'trofice.com', // Tell your server to route to trofice
      'Cache-Control': 'no-cache' 
    },
  });
  return { success: res.ok || res.status < 500, status: res.status };
});
console.log('1️⃣7️⃣ troficelazylogic DNS:', troficeLazyTest);

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const details = {
    googleTest,
    jsonPlaceholderTest,
    doronpayDomainTest,
    troficeDomainTest,
    httpTest,
    domainTest,
    ipTest,
    doronpayLoginTest,
    dnsTest,
    portTest,
    doronpayIpTest,
    httpDoronpayTest,
    githubTest,
    cloudflareTest,
    donkomiTest,
  };

  const passed = Object.values(details).filter(t => t.success).length;
  const total = Object.values(details).length;

  const criticalTests = [googleTest, jsonPlaceholderTest, doronpayLoginTest];
  const overallSuccess = criticalTests.some(t => t.success);

  const message = `${passed}/${total} tests passed. ${
    overallSuccess
      ? 'Basic internet works.'
      : 'No internet connectivity detected.'
  }`;

  console.log(`📊 Network Summary: ${message}`);

  return { success: overallSuccess, message, details };
}
