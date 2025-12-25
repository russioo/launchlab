import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OnlinePumpAmmSdk } from "@pump-fun/pump-swap-sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function check() {
  const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, "confirmed");
  const onlineSdk = new OnlinePumpAmmSdk(connection);
  
  const poolKey = new PublicKey("5R7bXE9CtNvGnH6kTexjWceHzbiTKXTJZJWBsR7gixwP");
  const wallet = new PublicKey("4QzHxCCWvFk47ZwF13frKCzzZzwaCYpt1uSnvC3E7HBe");
  
  console.log("\n=== LIQUIDIFY LP Token Check ===\n");
  
  // Get pool state to find LP mint
  const pool = await onlineSdk.fetchPool(poolKey);
  const lpMint = pool.lpMint;
  
  console.log("Pool:", poolKey.toBase58());
  console.log("LP Mint:", lpMint.toBase58());
  console.log("Wallet:", wallet.toBase58());
  
  try {
    const lpAta = await getAssociatedTokenAddress(lpMint, wallet, false, TOKEN_PROGRAM_ID);
    console.log("LP ATA:", lpAta.toBase58());
    
    const account = await getAccount(connection, lpAta, undefined, TOKEN_PROGRAM_ID);
    const balance = Number(account.amount) / 1e6;
    
    console.log("\nLP Token Balance:", balance.toLocaleString());
    
    if (balance > 0) {
      console.log("\n✅ Du har LP tokens der kan withdrawes!");
    } else {
      console.log("\n❌ Ingen LP tokens - alt er burned");
    }
  } catch (e: any) {
    console.log("\n❌ Ingen LP token account fundet - alt er burned");
  }
}

check().catch(console.error);









