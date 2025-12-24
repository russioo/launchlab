import { Connection, PublicKey } from "@solana/web3.js";
import { OnlinePumpAmmSdk } from "@pump-fun/pump-swap-sdk";

async function checkPool() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const onlineSdk = new OnlinePumpAmmSdk(connection);
  const poolKey = new PublicKey("5R7bXE9CtNvGnH6kTexjWceHzbiTKXTJZJWBsR7gixwP");
  
  console.log("\n=== LIQUIDIFY Pool Stats ===\n");
  
  const state = await onlineSdk.fetchPool(poolKey);
  
  // Log all properties to see what's available
  console.log("Pool:", poolKey.toBase58());
  console.log("LP Mint:", state.lpMint.toBase58());
  console.log("Base Mint:", state.baseMint.toBase58());
  console.log("Quote Mint:", state.quoteMint.toBase58());
  console.log("");
  console.log("Raw pool data:", JSON.stringify(state, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

checkPool().catch(console.error);
