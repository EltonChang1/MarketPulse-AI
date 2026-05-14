import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ---------- Portfolio ----------

export async function fetchPortfolio(token) {
  const { data } = await axios.get(`${API_BASE_URL}/api/portfolio`, authHeaders(token));
  return data; // { transactions: [...] }
}

export async function addTransactionApi(token, tx) {
  const { data } = await axios.post(
    `${API_BASE_URL}/api/portfolio/transactions`,
    tx,
    authHeaders(token)
  );
  return data;
}

export async function deleteTransactionApi(token, id) {
  const { data } = await axios.delete(
    `${API_BASE_URL}/api/portfolio/transactions/${id}`,
    authHeaders(token)
  );
  return data;
}

// ---------- Groups ----------

export async function listMyGroups(token) {
  const { data } = await axios.get(`${API_BASE_URL}/api/groups`, authHeaders(token));
  return data.groups;
}

export async function createGroup(token, payload) {
  const { data } = await axios.post(`${API_BASE_URL}/api/groups`, payload, authHeaders(token));
  return data.group;
}

export async function joinGroup(token, inviteCode) {
  const { data } = await axios.post(
    `${API_BASE_URL}/api/groups/join`,
    { inviteCode },
    authHeaders(token)
  );
  return data.group;
}

export async function getGroup(token, groupId) {
  const { data } = await axios.get(`${API_BASE_URL}/api/groups/${groupId}`, authHeaders(token));
  return data.group;
}

export async function getGroupLeaderboard(token, groupId) {
  const { data } = await axios.get(
    `${API_BASE_URL}/api/groups/${groupId}/leaderboard`,
    authHeaders(token)
  );
  return data; // { groupId, groupName, generatedAt, leaderboard: [...] }
}

export async function leaveGroup(token, groupId) {
  const { data } = await axios.post(
    `${API_BASE_URL}/api/groups/${groupId}/leave`,
    {},
    authHeaders(token)
  );
  return data.group;
}
