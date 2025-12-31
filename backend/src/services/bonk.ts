/**
 * Bonk Token Launcher Service
 * Based on: https://github.com/jonaskristensen2/bonklaun
 * 
 * Creates tokens on Bonk.fun (Raydium Launchpad) with USD1 as quote currency
 */

import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import BN from "bn.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const USD1_MINT = new PublicKey("USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB");
const USD1_CONFIG = new PublicKey("EPiZbnrThjyLnoQ6QQzkxeFqyL5uyg9RzNHHAudUPxBz");
const BONK_PLATFORM_ID = new PublicKey("FfYek5vEz23cMkWsdJwG2oa6EphsvXSHrGpdALN4g6W1");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const JUP_API = "https://lite-api.jup.ag/swap/v1";

// ============================================================================
// TYPES
// ============================================================================

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image?: Buffer | string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface CreateTokenResult {
  success: boolean;
  mint?: string;
  signature?: string;
  poolAddress?: string;
  error?: string;
}

// ============================================================================
// METADATA UPLOAD
// ============================================================================

/**
 * Upload token metadata to IPFS
 * Uses Pump.fun's public IPFS endpoint (works for any Raydium launchpad token)
 */
export async function uploadMetadata(
  metadata: TokenMetadata,
  imageBuffer?: Buffer
): Promise<{ metadataUri: string; imageUri: string } | { error: string }> {
  try {
    console.log(`[Bonk] Uploading metadata for ${metadata.name}...`);
    
    const formData = new FormData();
    
    if (imageBuffer) {
      formData.append("file", new Blob([imageBuffer]), "token.png");
    }
    
    formData.append("name", metadata.name);
    formData.append("symbol", metadata.symbol);
    formData.append("description", metadata.description || "");
    if (metadata.twitter) formData.append("twitter", metadata.twitter);
    if (metadata.telegram) formData.append("telegram", metadata.telegram);
    if (metadata.website) formData.append("website", metadata.website);
    formData.append("showName", "true");

    // Use Pump.fun's public IPFS endpoint
    const response = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`IPFS upload failed: ${response.statusText}`);
    }
    
    const result = await response.json() as { metadataUri: string; metadata?: { image?: string } };
    
    console.log(`[Bonk] Metadata: ${result.metadataUri}`);
    
    return {
      metadataUri: result.metadataUri,
      imageUri: result.metadata?.image || "",
    };
  } catch (error: any) {
    console.error("[Bonk] Upload error:", error);
    return { error: error.message };
  }
}

// ============================================================================
// TOKEN CREATION
// ============================================================================

/**
 * Create a new token on Bonk.fun (Raydium Launchpad)
 * Based on: https://github.com/jonaskristensen2/bonklaun
 */
export async function createToken(
  connection: Connection,
  creatorKeypair: Keypair,
  metadata: TokenMetadata,
  metadataUri: string,
  initialBuyUSD1: number = 1
): Promise<CreateTokenResult> {
  try {
    console.log(`[Bonk] Creating token: ${metadata.name} (${metadata.symbol})`);
    console.log(`[Bonk] Creator: ${creatorKeypair.publicKey.toBase58()}`);
    console.log(`[Bonk] Initial buy: ${initialBuyUSD1} USD1`);
    
    // Dynamic import Raydium SDK
    const { Raydium, TxVersion, LaunchpadConfig, LAUNCHPAD_PROGRAM } = await import("@raydium-io/raydium-sdk-v2");
    
    // Initialize SDK
    console.log("[Bonk] Initializing Raydium SDK...");
    const raydium = await Raydium.load({
      connection,
      owner: creatorKeypair,
      disableLoadToken: false,
    });
    
    // Generate mint
    const mintKeypair = Keypair.generate();
    console.log(`[Bonk] Mint: ${mintKeypair.publicKey.toBase58()}`);
    
    // Fetch USD1 config from chain
    console.log("[Bonk] Fetching USD1 config...");
    const configData = await connection.getAccountInfo(USD1_CONFIG);
    if (!configData) throw new Error("USD1 Config not found");
    
    const configInfo = LaunchpadConfig.decode(configData.data);
    
    // Get USD1 decimals
    const mintBInfo = await raydium.token.getTokenInfo(USD1_MINT);
    const mintBDecimals = mintBInfo?.decimals || 6;
    
    // Check USD1 balance and swap if needed
    const slippage = new BN(10);
    let buyAmount = new BN(0);
    let createOnly = true;
    
    if (initialBuyUSD1 > 0) {
      let usd1Balance = await getUsd1Balance(connection, creatorKeypair.publicKey, mintBDecimals);
        console.log(`[Bonk] USD1 balance: ${usd1Balance}`);

        if (usd1Balance < initialBuyUSD1) {
        const missing = initialBuyUSD1 - usd1Balance;
        console.log(`[Bonk] Swapping ${missing} USD1 from SOL...`);

        await swapSolToUsd1(connection, creatorKeypair, missing, mintBDecimals);

        usd1Balance = await getUsd1Balance(connection, creatorKeypair.publicKey, mintBDecimals);
          console.log(`[Bonk] USD1 balance after swap: ${usd1Balance}`);
        }

        if (usd1Balance >= initialBuyUSD1) {
          buyAmount = new BN(Math.round(initialBuyUSD1 * Math.pow(10, mintBDecimals)));
          createOnly = false;
      }
    }
    
    // Create launchpad token
    console.log(`[Bonk] Creating launchpad token (createOnly: ${createOnly})...`);
    const { transactions, extInfo } = await raydium.launchpad.createLaunchpad({
      programId: LAUNCHPAD_PROGRAM,
      mintA: mintKeypair.publicKey,
      decimals: 6,
      name: metadata.name,
      symbol: metadata.symbol,
      migrateType: "amm",
      uri: metadataUri,
      configId: USD1_CONFIG,
      configInfo,
      mintBDecimals,
      slippage,
      platformId: BONK_PLATFORM_ID,
      txVersion: TxVersion.LEGACY,
      buyAmount,
      feePayer: creatorKeypair.publicKey,
      createOnly,
      extraSigners: [mintKeypair],
      computeBudgetConfig: {
        units: 600_000,
        microLamports: 50_000,
      },
    });
    
    // Send transactions
    console.log("[Bonk] Sending transaction...");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    let signature = "";
    for (const tx of transactions) {
      const messageV0 = new TransactionMessage({
        payerKey: creatorKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions: tx.instructions,
      }).compileToV0Message();
      
      const vtx = new VersionedTransaction(messageV0);
      vtx.sign([creatorKeypair, mintKeypair]);
      
      signature = await connection.sendTransaction(vtx, {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      console.log(`[Bonk] Tx: ${signature}`);
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, "confirmed");
    }
    
    const poolAddress = extInfo?.address?.poolId?.toBase58();
    
    console.log(`[Bonk] Token created!`);
    console.log(`[Bonk] Mint: ${mintKeypair.publicKey.toBase58()}`);
    console.log(`[Bonk] Pool: ${poolAddress}`);
    
    return {
      success: true,
      mint: mintKeypair.publicKey.toBase58(),
      signature,
      poolAddress,
    };
  } catch (error: any) {
    console.error("[Bonk] Error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getUsd1Balance(
  connection: Connection,
  owner: PublicKey,
  decimals: number
): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(USD1_MINT, owner);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

async function swapSolToUsd1(
  connection: Connection,
  user: Keypair,
  amount: number,
  decimals: number
): Promise<string> {
  if (amount <= 0) return "";
  
  const outAmount = Math.ceil(amount * Math.pow(10, decimals));
  
  // Get quote from Jupiter (new v1 API)
  const quoteRes = await fetch(
    `${JUP_API}/quote?inputMint=${WSOL_MINT}&outputMint=${USD1_MINT}&amount=${outAmount}&swapMode=ExactOut&slippageBps=150`
  );
  if (!quoteRes.ok) throw new Error(`Jupiter quote failed: ${quoteRes.statusText}`);
  const quote = await quoteRes.json();
  
  // Get swap transaction
  const swapRes = await fetch(`${JUP_API}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: user.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap failed: ${swapRes.statusText}`);
  
  const swap = await swapRes.json() as { swapTransaction?: string };
  if (!swap.swapTransaction) throw new Error("No swap transaction");
  
  // Sign and send
  const vtx = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, "base64"));
  vtx.sign([user]);
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const sig = await connection.sendRawTransaction(vtx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  
  await connection.confirmTransaction({
    signature: sig,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");
  
  console.log(`[Bonk] Jupiter swap: ${sig}`);
  return sig;
}

// ============================================================================
// TOKEN INFO
// ============================================================================

export interface BonkTokenInfo {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  creator: string;
  bonding_curve?: string;
  pool_address?: string;
  complete: boolean;
}

/**
 * Get token info from Bonk.fun API
 */
export async function getTokenInfo(mint: string): Promise<BonkTokenInfo | null> {
  try {
    const res = await fetch(`https://bonk.fun/api/coins/${mint}`);
    if (res.ok) return await res.json() as BonkTokenInfo;
    
    // Fallback
    const res2 = await fetch(`https://letsbonk.fun/api/coins/${mint}`);
    if (res2.ok) return await res2.json() as BonkTokenInfo;
    
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// FEE CLAIMING
// ============================================================================

export interface ClaimFeesResult {
  success: boolean;
  amount?: number;
  signature?: string;
  error?: string;
  message?: string; // For non-error status messages like "waiting for migration"
}

/**
 * Claim creator fees from Bonk/Raydium pool
 * Handles both launchpad (bonding curve) and graduated CPMM pools
 */
export async function claimCreatorFees(
  connection: Connection,
  creatorKeypair: Keypair,
  poolIdOrMint: string
): Promise<ClaimFeesResult> {
  try {
    console.log(`[Bonk] Claiming fees for: ${poolIdOrMint}`);
    
    const { Raydium } = await import("@raydium-io/raydium-sdk-v2");
    
    const raydium = await Raydium.load({
      connection,
      owner: creatorKeypair,
      disableLoadToken: true,
    });
    
    // First try: Check if it's a launchpad pool ID (from our DB)
    try {
      console.log(`[Bonk] Checking launchpad pool...`);
      const launchpadInfo = await raydium.launchpad.getRpcPoolInfo({
        poolId: new PublicKey(poolIdOrMint),
      });
      
      if (launchpadInfo) {
        // Check if token has migrated (graduated)
        if (launchpadInfo.status === 2) { // Status 2 = migrated/graduated
          console.log(`[Bonk] Token graduated, looking for CPMM pool...`);
          // Try to find the CPMM pool via API
          const tokenInfo = await getTokenInfo(poolIdOrMint);
          if (tokenInfo?.pool_address) {
            const poolInfo = await raydium.api.fetchPoolById({ ids: tokenInfo.pool_address });
            if (poolInfo && poolInfo.length > 0 && poolInfo[0]) {
              const { execute } = await raydium.cpmm.collectCreatorFees({
                poolInfo: poolInfo[0] as any,
              });
              const { txId } = await execute({ sendAndConfirm: true });
              console.log(`[Bonk] CPMM fees claimed: ${txId}`);
              return { success: true, signature: txId };
            }
          }
        }
        
        // Token still on launchpad - fees accumulate but can't be claimed until graduation
        console.log(`[Bonk] Token still on launchpad (status: ${launchpadInfo.status})`);
        return { 
          success: true, 
          amount: 0, 
          error: "Token still on bonding curve - fees claimable after graduation" 
        };
    }
    } catch (e) {
      // Not a launchpad pool, continue to other checks
      console.log(`[Bonk] Not a launchpad pool, trying other methods...`);
    }
    
    // Second try: Check Bonk.fun API for token info
    const tokenInfo = await getTokenInfo(poolIdOrMint);
    
    if (tokenInfo?.complete && tokenInfo?.pool_address) {
      console.log(`[Bonk] Token graduated, claiming from CPMM pool...`);
      const poolInfo = await raydium.api.fetchPoolById({ ids: tokenInfo.pool_address });
      if (poolInfo && poolInfo.length > 0 && poolInfo[0]) {
        const { execute } = await raydium.cpmm.collectCreatorFees({
          poolInfo: poolInfo[0] as any,
        });
        const { txId } = await execute({ sendAndConfirm: true });
        console.log(`[Bonk] CPMM fees claimed: ${txId}`);
        return { success: true, signature: txId };
      }
    }
    
    // Third try: Direct CPMM pool lookup (for already graduated tokens)
    console.log(`[Bonk] Trying direct CPMM pool lookup...`);
    try {
      const poolInfo = await raydium.api.fetchPoolById({ ids: poolIdOrMint });
      if (poolInfo && poolInfo.length > 0 && poolInfo[0]) {
    const { execute } = await raydium.cpmm.collectCreatorFees({
          poolInfo: poolInfo[0] as any,
    });
    const { txId } = await execute({ sendAndConfirm: true });
        console.log(`[Bonk] Fees claimed: ${txId}`);
        return { success: true, signature: txId };
      }
    } catch (e) {
      // Pool lookup failed - token probably still on bonding curve
      console.log(`[Bonk] CPMM lookup failed, token likely still on bonding curve`);
    }
    
    // Token is still on bonding curve - this is normal, not an error
    // Fees can only be claimed after migration to CPMM
    console.log(`[Bonk] Token awaiting migration - fees will be claimable after graduation`);
    return {
      success: true,
      amount: 0,
      message: "Waiting for migration - fees claimable after graduation" 
    };
  } catch (error: any) {
    console.error("[Bonk] Claim error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TRADING
// ============================================================================

/**
 * Buy tokens (for tokenFeeder compatibility)
 */
export async function buyTokens(
  connection: Connection,
  buyerKeypair: Keypair,
  mint: string,
  solAmount: number
): Promise<{ success: boolean; tokenAmount?: number; signature?: string; error?: string }> {
  try {
    console.log(`[Bonk] Buying tokens for ${solAmount} SOL`);
    
    // Convert SOL to USD1 (rough estimate ~150 USD1 per SOL)
    const usd1Amount = solAmount * 150;
    
    const { Raydium } = await import("@raydium-io/raydium-sdk-v2");
    
    const raydium = await Raydium.load({
      connection,
      owner: buyerKeypair,
      disableLoadToken: true,
    });
    
    // Get token info
      const tokenInfo = await getTokenInfo(mint);
      if (!tokenInfo?.bonding_curve) {
      return { success: false, error: "Token not found" };
      }
      
      const launchpadInfo = await raydium.launchpad.getRpcPoolInfo({
        poolId: new PublicKey(tokenInfo.bonding_curve),
      });
      
      if (!launchpadInfo) {
      return { success: false, error: "Pool not found" };
      }
      
      const { execute } = await raydium.launchpad.buyToken({
        mintA: new PublicKey(mint),
        poolInfo: launchpadInfo,
      buyAmount: new BN(usd1Amount * 1_000_000),
    });
    
    const { txId } = await execute({ sendAndConfirm: true });
    
    console.log(`[Bonk] Buy tx: ${txId}`);
    return { success: true, signature: txId };
  } catch (error: any) {
    console.error("[Bonk] Buy error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Add liquidity to pool
 */
export async function addLiquidity(
  connection: Connection,
  creatorKeypair: Keypair,
  mint: string,
  solAmount: number
): Promise<{ success: boolean; lpTokens?: number; signature?: string; error?: string }> {
  try {
    console.log(`[Bonk] Adding liquidity: ${solAmount} SOL`);
    
    const tokenInfo = await getTokenInfo(mint);
    if (!tokenInfo?.pool_address) {
      return { success: false, error: "Token not graduated" };
    }
    
    const { Raydium, Percent } = await import("@raydium-io/raydium-sdk-v2");
    
    const raydium = await Raydium.load({
      connection,
      owner: creatorKeypair,
      disableLoadToken: true,
    });
    
    const poolInfo = await raydium.api.fetchPoolByMints({
      mint1: mint,
      mint2: USD1_MINT.toBase58(),
    });
    
    if (!poolInfo?.data?.length) {
      return { success: false, error: "Pool not found" };
      }
      
    const usd1Amount = new BN(solAmount * 150 * 1_000_000);
      
    const { execute } = await raydium.cpmm.addLiquidity({
      poolInfo: poolInfo.data[0] as any,
      inputAmount: usd1Amount,
      baseIn: false,
      slippage: new Percent(10, 100),
    });
    
    const { txId } = await execute({ sendAndConfirm: true });
    
    console.log(`[Bonk] Liquidity added: ${txId}`);
    return { success: true, signature: txId };
  } catch (error: any) {
    console.error("[Bonk] Liquidity error:", error);
    return { success: false, error: error.message };
  }
}
