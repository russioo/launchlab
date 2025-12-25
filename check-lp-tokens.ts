import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

async function checkLPTokens() {
  const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, "confirmed");
  
  // LIQUIDIFY pool LP mint
  const lpMint = new PublicKey("EPkFg8VvzBriC7MFqQHVrNLzoMFsDrqQJ4fM9xaCynT6");
  
  // Dev wallet for LIQUIDIFY
  const wallet = new PublicKey("4QzHxCCWvFk47ZwF13frKCzzZzwaCYpt1uSnvC3E7HBe");
  
  console.log("\n=== Checking LP Tokens ===\n");
  console.log("LP Mint:", lpMint.toBase58());
  console.log("Wallet:", wallet.toBase58());
  
  try {
    const lpAta = await getAssociatedTokenAddress(lpMint, wallet, false, TOKEN_PROGRAM_ID);
    console.log("LP Token Account:", lpAta.toBase58());
    
    const account = await getAccount(connection, lpAta, undefined, TOKEN_PROGRAM_ID);
    const balance = Number(account.amount) / 1e6;
    
    console.log("\nLP Token Balance:", balance.toLocaleString());
    
    if (balance > 0) {
      console.log("\n✅ Du har LP tokens der kan withdrawes!");
    } else {
      console.log("\n❌ Ingen LP tokens - alt er burned");
    }
  } catch (e: any) {
    console.log("\n❌ Ingen LP token account fundet:", e.message);
  }
}

checkLPTokens().catch(console.error);









