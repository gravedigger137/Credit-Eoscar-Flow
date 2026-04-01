import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

let plaidClient: PlaidApi | null = null;

function getPlaidClient(): PlaidApi | null {
  if (plaidClient) return plaidClient;
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) return null;

  const config = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  plaidClient = new PlaidApi(config);
  return plaidClient;
}

export async function createLinkToken(clientUserId: string) {
  const client = getPlaidClient();
  if (!client) return { error: "Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET." };

  const response = await client.linkTokenCreate({
    user: { client_user_id: clientUserId },
    client_name: "CreditRepair Pro",
    products: [Products.Auth, Products.Transactions, Products.Identity, Products.Liabilities],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return { linkToken: response.data.link_token };
}

export async function exchangePublicToken(publicToken: string) {
  const client = getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.itemPublicTokenExchange({ public_token: publicToken });
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function getAccounts(accessToken: string) {
  const client = getPlaidClient();
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
  const client = getPlaidClient();
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
  const client = getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.identityGet({ access_token: accessToken });
  return { accounts: response.data.accounts };
}

export async function getLiabilities(accessToken: string) {
  const client = getPlaidClient();
  if (!client) return { error: "Plaid not configured" };

  const response = await client.liabilitiesGet({ access_token: accessToken });
  return {
    credit: response.data.liabilities.credit,
    mortgage: response.data.liabilities.mortgage,
    student: response.data.liabilities.student,
  };
}

export function isPlaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}
