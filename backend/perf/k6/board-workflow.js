import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080';
const USER_EMAIL = __ENV.K6_USER_EMAIL || `loadtest+${Date.now()}@example.com`;
const USER_PASSWORD = __ENV.K6_USER_PASSWORD || 'P@ssw0rd!';
const USER_NAME = __ENV.K6_USER_NAME || 'Load Tester';
const FAIL_ON_SEED_ERROR = (__ENV.K6_FAIL_ON_SEED_ERROR || 'false').toLowerCase() === 'true';

const boardLifecycleDuration = new Trend('board_lifecycle_duration', true);
const seededUsers = new Counter('seeded_users');
const MAX_VUS = Math.max(1, Number(__ENV.K6_MAX_VUS || 20));
const RAMP_UP_TARGET = Math.max(1, Math.ceil(MAX_VUS / 2));

export const options = {
  scenarios: {
    standard_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: RAMP_UP_TARGET },
        { duration: '1m', target: MAX_VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
      exec: 'boardLifecycle',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    checks: ['rate>0.95'],
    board_lifecycle_duration: ['p(95)<1500'],
  },
};

function authenticateUser(email, password) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'auth' },
  };

  const payload = JSON.stringify({
    name: USER_NAME,
    email,
    password,
  });

  const registerResponse = http.post(`${BASE_URL}/auth/register`, payload, params);

  if (registerResponse.status === 200) {
    seededUsers.add(1);
    return registerResponse.json('token');
  }

  if (registerResponse.status !== 400) {
    const message = `unexpected status during registration: ${registerResponse.status}`;
    if (FAIL_ON_SEED_ERROR) {
      throw new Error(message);
    }
    console.warn(message);
  }

  const loginPayload = JSON.stringify({ email, password });
  const loginResponse = http.post(`${BASE_URL}/auth/login`, loginPayload, params);

  check(loginResponse, {
    'login succeeded': (res) => res.status === 200 && Boolean(res.json('token')),
  });

  return loginResponse.json('token');
}

export function setup() {
  const token = authenticateUser(USER_EMAIL, USER_PASSWORD);

  if (!token) {
    throw new Error('failed to obtain auth token for load testing user');
  }

  return {
    baseUrl: BASE_URL,
    token,
  };
}

export function boardLifecycle(data) {
  const start = Date.now();
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  const boardName = `Load Board ${uuidv4()}`;
  const createResponse = group('create board', () => {
    const res = http.post(
      `${data.baseUrl}/api/boards`,
      JSON.stringify({ name: boardName }),
      { ...authHeaders, tags: { endpoint: 'boards.create' } },
    );

    check(res, {
      'create board success': (r) => r.status === 201 && Boolean(r.json('ID') || r.json('id')),
    });

    return res;
  });

  const createdBoard = createResponse.json();
  const boardId = createdBoard?.ID || createdBoard?.id;

  if (!boardId) {
    throw new Error('board ID not returned from create response');
  }

  group('list boards', () => {
    const res = http.get(`${data.baseUrl}/api/boards`, { ...authHeaders, tags: { endpoint: 'boards.list' } });
    check(res, {
      'list boards success': (r) => r.status === 200,
    });
  });

  group('get board', () => {
    const res = http.get(
      `${data.baseUrl}/api/boards/${boardId}`,
      { ...authHeaders, tags: { endpoint: 'boards.get' } },
    );
    check(res, {
      'get board success': (r) => r.status === 200,
    });
  });

  group('update board', () => {
    const res = http.put(
      `${data.baseUrl}/api/boards/${boardId}`,
      JSON.stringify({ name: `${boardName} (updated)` }),
      { ...authHeaders, tags: { endpoint: 'boards.update' } },
    );
    check(res, {
      'update board success': (r) => r.status === 200,
    });
  });

  group('delete board', () => {
    const res = http.del(
      `${data.baseUrl}/api/boards/${boardId}`,
      null,
      { ...authHeaders, tags: { endpoint: 'boards.delete' } },
    );
    check(res, {
      'delete board success': (r) => r.status === 200,
    });
  });

  const duration = Date.now() - start;
  boardLifecycleDuration.add(duration);

  sleep(Number(__ENV.K6_ITERATION_SLEEP || 1));
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'backend/perf/k6/summary.json': JSON.stringify(data, null, 2),
  };
}
