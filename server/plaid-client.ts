import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";
import { storage } from "./storage";
import { getPlaidRuntimeConfig } from "./provider-config";

let plaidClient: PlaidApi | null = null;
let plaidClientCacheKey: string | null = null;

function normalizeProducts(products: string[]) {
  const supported = new Set(Object.values(Products) as string[]);
  const normalized = products
    .map((product) => product.trim().toLowerCase())
    .filter((product) => supported.has(product));

  return normalized.length > 0
    ? normalized.map((product) => product as Products)
    : [Products.Auth, Products.Transactions, Products.Identity, Products.Liabilities];
}

async function getPlaidClient(): Promise<PlaidApi | null> {
  const runtimeConfig = await getPlaidRuntimeConfig(storage);
  if (!runtimeConfig || !runtimeConfig.enabled || ["disabled", "inactive"].includes(runtimeConfig.status)) return null;

  const cacheKey = [
    runtimeConfig.source,
    runtimeConfig.environment,
    runtimeConfig.clientId,
    runtimeConfig.secret,
  ].join(":");
  if (plaidClient && plaidClientCacheKey === cacheKey) return plaidClient;

  const config = new Configuration({
    basePath: PlaidEnvironments[runtimeConfig.environment],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": runtimeConfig.clientId,
        "PLAID-SECRET": runtimeConfig.secret,
      },
    },
  });
  plaidClient = new PlaidApi(config);
  plaidClientCacheKey = cacheKey;
  return plaidClient;
}

export async function createLinkToken(clientUserId: string) {
  const client = await getPlaidClient();
  if (!client) return { error: "Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET." };
  const runtimeConfig = await getPlaidRuntimeConfig(storage);

  const response = await client.linkTokenCreate({
    user: { client_user_id: clientUserId },
    client_name: "CreditRepair Pro",
    products: normalizeProducts(runtimeConfig?.products || []),
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return { linkToken: response.data.link_token };
}

export async function exchangePublicToken(publicToken: string) {
  const client = await getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.itemPublicTokenExchange({ public_token: publicToken });
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function getAccounts(accessToken: string) {
  const client = await getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.accountsGet({ access_token: accessToken });
  return {
    accounts: response.data.accounts.map(a => ({
      accountId: a.account_id,
      name: a.name,
      officialName: a.official_name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
      balanceCurrent: a.balances.current ? Math.round(a.balances.current * 100) : null,
      balanceAvailable: a.balances.available ? Math.round(a.balances.available * 100) : null,
      balanceLimit: a.balances.limit ? Math.round(a.balances.limit * 100) : null,
    })),
    institution: response.data.item,
  };
}

export async function getTransactions(accessToken: string, startDate: string, endDate: string) {
  const client = await getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 100, offset: 0 },
  });
  return { transactions: response.data.transactions, total: response.data.total_transactions };
}

export async function getIdentity(accessToken: string) {
  const client = await getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.identityGet({ access_token: accessToken });
  return { accounts: response.data.accounts };
}

export async function getLiabilities(accessToken: string) {
  const client = await getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.liabilitiesGet({ access_token: accessToken });
  return {
    credit: response.data.liabilities.credit,
    mortgage: response.data.liabilities.mortgage,
    student: response.data.liabilities.student,
  };
}

export async function isPlaidConfigured(): Promise<boolean> {
  const status = await getPlaidRuntimeConfig(storage);
  return !!status && status.enabled && !["disabled", "inactive"].includes(status.status);
}
