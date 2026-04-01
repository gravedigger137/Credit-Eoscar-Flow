import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, Trash2, Copy, ExternalLink, Coins, Shield, RefreshCw, ArrowUpRight, ArrowDownLeft, Globe } from "lucide-react";

const CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH", color: "text-blue-500" },
  { id: 137, name: "Polygon", symbol: "MATIC", color: "text-purple-500" },
  { id: 56, name: "BNB Chain", symbol: "BNB", color: "text-yellow-500" },
  { id: 42161, name: "Arbitrum", symbol: "ETH", color: "text-cyan-500" },
  { id: 10, name: "Optimism", symbol: "ETH", color: "text-red-500" },
  { id: 43114, name: "Avalanche", symbol: "AVAX", color: "text-red-600" },
  { id: 8453, name: "Base", symbol: "ETH", color: "text-blue-600" },
];

const DEFI_PROTOCOLS = [
  { name: "Uniswap", category: "DEX", tvl: "$4.2B", apy: "2-50%", chains: ["Ethereum", "Polygon", "Arbitrum"], url: "https://app.uniswap.org" },
  { name: "Aave", category: "Lending", tvl: "$12.1B", apy: "1-8%", chains: ["Ethereum", "Polygon", "Avalanche"], url: "https://app.aave.com" },
  { name: "Compound", category: "Lending", tvl: "$2.8B", apy: "1-6%", chains: ["Ethereum", "Polygon"], url: "https://app.compound.finance" },
  { name: "Curve", category: "DEX", tvl: "$2.1B", apy: "3-20%", chains: ["Ethereum", "Polygon", "Arbitrum"], url: "https://curve.fi" },
  { name: "Lido", category: "Staking", tvl: "$14.5B", apy: "3.5-4%", chains: ["Ethereum"], url: "https://lido.fi" },
  { name: "MakerDAO", category: "Stablecoin", tvl: "$8.2B", apy: "5-8% DSR", chains: ["Ethereum"], url: "https://app.spark.fi" },
  { name: "1inch", category: "Aggregator", tvl: "N/A", apy: "Best swap rates", chains: ["Ethereum", "Polygon", "BNB Chain", "Arbitrum"], url: "https://app.1inch.io" },
  { name: "Yearn Finance", category: "Yield", tvl: "$400M", apy: "5-30%", chains: ["Ethereum"], url: "https://yearn.fi" },
];

export default function Crypto() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: wallets = [] } = useQuery<any[]>({ queryKey: ["/api/crypto-wallets"] });
  const [newWallet, setNewWallet] = useState({ walletAddress: "", walletType: "metamask", label: "", chainId: 1 });
  const [showAdd, setShowAdd] = useState(false);

  const addWallet = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/crypto-wallets", data); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crypto-wallets"] }); setShowAdd(false); setNewWallet({ walletAddress: "", walletType: "metamask", label: "", chainId: 1 }); toast({ title: "Wallet Added" }); },
  });

  const deleteWallet = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/crypto-wallets/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crypto-wallets"] }); toast({ title: "Wallet Removed" }); },
  });

  const connectMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts[0]) {
          addWallet.mutate({ walletAddress: accounts[0], walletType: "metamask", label: "MetaMask Wallet", chainId: 1 });
        }
      } catch { toast({ title: "MetaMask connection failed", variant: "destructive" }); }
    } else {
      toast({ title: "MetaMask not detected", description: "Install MetaMask browser extension to connect.", variant: "destructive" });
    }
  };

  return (
    <Shell title="Crypto & DeFi" subtitle="Wallet connections, DeFi protocols, multi-chain support">
      <Tabs defaultValue="wallets" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="wallets" data-testid="tab-crypto-wallets">Wallets</TabsTrigger>
          <TabsTrigger value="defi" data-testid="tab-defi">DeFi Protocols</TabsTrigger>
          <TabsTrigger value="chains" data-testid="tab-chains">Chains</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-6">
          <div className="flex gap-3">
            <Button onClick={connectMetaMask} className="bg-orange-500 hover:bg-orange-600" data-testid="button-connect-metamask">
              <Wallet className="w-4 h-4 mr-2" /> Connect MetaMask
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(!showAdd)} data-testid="button-add-wallet">
              <Plus className="w-4 h-4 mr-2" /> Add Wallet Manually
            </Button>
          </div>

          {showAdd && (
            <Card>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input placeholder="0x... wallet address" value={newWallet.walletAddress} onChange={e => setNewWallet(w => ({ ...w, walletAddress: e.target.value }))} data-testid="input-wallet-address" />
                <Input placeholder="Label (optional)" value={newWallet.label} onChange={e => setNewWallet(w => ({ ...w, label: e.target.value }))} data-testid="input-wallet-label" />
                <select className="border rounded-md px-3 py-2 text-sm" value={newWallet.walletType} onChange={e => setNewWallet(w => ({ ...w, walletType: e.target.value }))}>
                  <option value="metamask">MetaMask</option>
                  <option value="coinbase">Coinbase Wallet</option>
                  <option value="walletconnect">WalletConnect</option>
                  <option value="ledger">Ledger</option>
                  <option value="trezor">Trezor</option>
                  <option value="phantom">Phantom</option>
                  <option value="trust">Trust Wallet</option>
                </select>
                <Button onClick={() => addWallet.mutate(newWallet)} disabled={!newWallet.walletAddress} data-testid="button-save-wallet">Save Wallet</Button>
              </CardContent>
            </Card>
          )}

          {wallets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Wallets Connected</h3>
                <p className="text-muted-foreground">Connect MetaMask, Coinbase Wallet, Ledger, or add any EVM address to track on-chain activity.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {wallets.map((w: any) => {
                const chain = CHAINS.find(c => c.id === w.chainId);
                return (
                  <Card key={w.id} data-testid={`card-wallet-${w.id}`}>
                    <CardContent className="pt-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{w.label || w.walletType}</p>
                          <p className="text-xs text-muted-foreground font-mono">{w.walletAddress?.slice(0, 6)}...{w.walletAddress?.slice(-4)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">{w.walletType}</Badge>
                            {chain && <Badge variant="outline" className={`text-xs ${chain.color}`}>{chain.name}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(w.walletAddress); toast({ title: "Address copied" }); }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.open(`https://etherscan.io/address/${w.walletAddress}`, "_blank")}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteWallet.mutate(w.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="defi" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEFI_PROTOCOLS.map((p, i) => (
              <Card key={i} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => window.open(p.url, "_blank")} data-testid={`card-defi-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">TVL:</span><span className="font-medium">{p.tvl}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">APY:</span><span className="font-medium text-green-600">{p.apy}</span></div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.chains.map(c => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chains" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CHAINS.map(chain => (
              <Card key={chain.id} data-testid={`card-chain-${chain.id}`}>
                <CardContent className="pt-6 text-center">
                  <Globe className={`w-8 h-8 mx-auto mb-2 ${chain.color}`} />
                  <p className="font-semibold">{chain.name}</p>
                  <p className="text-xs text-muted-foreground">Chain ID: {chain.id}</p>
                  <Badge variant="outline" className="mt-2 text-xs">{chain.symbol}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
