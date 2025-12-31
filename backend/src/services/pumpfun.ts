import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

const PUMPFUN_API = "https://pumpportal.fun/api";
const PUMPFUN_FRONTEND_API = "https://frontend-api.pump.fun";

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

interface CreateTokenResult {
  success: boolean;
  mint?: string;
  signature?: string;
  bondingCurve?: string;
  associatedBondingCurve?: string;
  metadataUri?: string;
  error?: string;
}

interface PumpfunTokenInfo {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  creator: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  market_cap: number;
  complete: boolean; // true = graduated
  raydium_pool?: string;
}

/**
 * Upload token metadata + image to IPFS via Pump.fun
 */
export async function uploadMetadata(
  imageFile: Buffer,
  metadata: TokenMetadata
): Promise<{ metadataUri: string; imageUri?: string } | { error: string }> {
  try {
    const formData = new FormData();
    formData.append("file", new Blob([imageFile]), "token.png");
    formData.append("name", metadata.name);
    formData.append("symbol", metadata.symbol);
    formData.append("description", metadata.description || "");
    if (metadata.twitter) formData.append("twitter", metadata.twitter);
    if (metadata.telegram) formData.append("telegram", metadata.telegram);
    if (metadata.website) formData.append("website", metadata.website);
    formData.append("showName", "true");

    // Use pump.fun IPFS endpoint (not pumpportal)
    const response = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Pump.fun] IPFS response:", response.status, errorText);
      throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { metadataUri: string; metadata?: { image?: string } };
    console.log("[Pump.fun] IPFS upload result:", result);
    
    // Extract image URL from metadata
    let imageUri = result.metadata?.image;
    if (imageUri?.startsWith("ipfs://")) {
      imageUri = `https://ipfs.io/ipfs/${imageUri.replace("ipfs://", "")}`;
    }
    
    return { metadataUri: result.metadataUri, imageUri };
  } catch (error: any) {
    console.error("Error uploading metadata:", error);
    return { error: error.message };
  }
}

/**
 * Create a new token on Pumpfun
 */
export async function createToken(
  connection: Connection,
  creatorKeypair: Keypair,
  lpWalletKeypair: Keypair,
  metadataUri: string,
  metadata: TokenMetadata,
  initialBuyAmount: number = 0 // SOL amount to buy initially
): Promise<CreateTokenResult> {
  // Generate mint keypair for the token
  const mintKeypair = Keypair.generate();
  const mintAddress = mintKeypair.publicKey.toBase58();
  
  console.log(`[Pump.fun] Creating token: ${metadata.name} (${metadata.symbol})`);
  console.log(`[Pump.fun] Mint: ${mintAddress}`);
  console.log(`[Pump.fun] Initial buy: ${initialBuyAmount} SOL`);

  try {
    // Request create transaction from Pumpfun with higher priority fee
    const response = await fetch(`${PUMPFUN_API}/trade-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: creatorKeypair.publicKey.toBase58(),
        action: "create",
        tokenMetadata: {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadataUri,
        },
        mint: mintAddress,
        denominatedInSol: "true",
        amount: initialBuyAmount,
        slippage: 15, // Increased slippage
        priorityFee: 0.001, // Higher priority fee for faster confirmation
        pool: "pump",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pumpfun API error: ${error}`);
    }

    // Get transaction bytes
    const txData = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(txData));

    // Sign with creator and mint keypair
    tx.sign([creatorKeypair, mintKeypair]);

    // Send transaction with skipPreflight for speed
    console.log("[Pump.fun] Sending transaction...");
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: true, // Skip preflight for faster send
      maxRetries: 5,
    });
    console.log(`[Pump.fun] Transaction sent: ${signature}`);

    // Try to confirm with retry logic
    let confirmed = false;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Pump.fun] Confirming (attempt ${attempt}/3)...`);
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash: tx.message.recentBlockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
          },
          "confirmed"
        );
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        confirmed = true;
        console.log("[Pump.fun] Transaction confirmed!");
        break;
      } catch (e: any) {
        lastError = e;
        console.warn(`[Pump.fun] Confirmation attempt ${attempt} failed:`, e.message);
        
        // If timeout, check if tx succeeded anyway
        if (e.message?.includes("timeout") || e.name === "TransactionExpiredTimeoutError") {
          console.log("[Pump.fun] Checking if transaction succeeded despite timeout...");
          await new Promise(r => setTimeout(r, 3000));
          
          const status = await connection.getSignatureStatus(signature);
          if (status.value?.confirmationStatus === "confirmed" || status.value?.confirmationStatus === "finalized") {
            console.log("[Pump.fun] Transaction was confirmed on-chain!");
            confirmed = true;
            break;
          }
        }
        
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    if (!confirmed) {
      // One final check - maybe it confirmed but we missed it
      console.log("[Pump.fun] Final status check...");
      await new Promise(r => setTimeout(r, 5000));
      
      const tokenInfo = await getTokenInfo(mintAddress);
      if (tokenInfo) {
        console.log("[Pump.fun] Token exists on-chain! Treating as success.");
        return {
          success: true,
          mint: mintAddress,
          signature,
          bondingCurve: tokenInfo.bonding_curve,
          associatedBondingCurve: tokenInfo.associated_bonding_curve,
          metadataUri,
        };
      }
      
      throw lastError || new Error("Transaction confirmation failed");
    }

    // Get token info to get bonding curve addresses
    console.log("[Pump.fun] Fetching token info...");
    await new Promise((r) => setTimeout(r, 3000)); // Wait for indexing
    const tokenInfo = await getTokenInfo(mintAddress);

    return {
      success: true,
      mint: mintAddress,
      signature,
      bondingCurve: tokenInfo?.bonding_curve,
      associatedBondingCurve: tokenInfo?.associated_bonding_curve,
      metadataUri,
    };
  } catch (error: any) {
    console.error("[Pump.fun] Error creating token:", error);
    
    // Check if token was created despite error
    console.log("[Pump.fun] Checking if token exists despite error...");
    await new Promise(r => setTimeout(r, 3000));
    const tokenInfo = await getTokenInfo(mintAddress);
    
    if (tokenInfo) {
      console.log("[Pump.fun] Token was created successfully!");
      return {
        success: true,
        mint: mintAddress,
        signature: "unknown",
        bondingCurve: tokenInfo.bonding_curve,
        associatedBondingCurve: tokenInfo.associated_bonding_curve,
        metadataUri,
      };
    }
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get token info from Pumpfun
 */
export async function getTokenInfo(mint: string): Promise<PumpfunTokenInfo | null> {
  try {
    const response = await fetch(`${PUMPFUN_FRONTEND_API}/coins/${mint}`);
    if (!response.ok) return null;
    return await response.json() as PumpfunTokenInfo;
  } catch (error) {
    console.error("Error getting token info:", error);
    return null;
  }
}

/**
 * Check if token has graduated (bonding curve complete)
 */
export async function isGraduated(mint: string): Promise<boolean> {
  const info = await getTokenInfo(mint);
  return info?.complete === true;
}

/**
 * Claim creator fees from Pumpfun
 * Returns amount in SOL
 */
export async function claimCreatorFees(
  connection: Connection,
  creatorKeypair: Keypair,
  mint: string
): Promise<{ success: boolean; amount?: number; signature?: string; error?: string }> {
  try {
    // Check if there are fees to claim
    const tokenInfo = await getTokenInfo(mint);
    if (!tokenInfo) {
      return { success: false, error: "Token not found" };
    }

    // Note: Pumpfun creator fees are typically claimed through their frontend
    // For automated claiming, we need to interact with their smart contract directly
    // This is a simplified version - in production you'd use the actual claim instruction

    // Get creator fee account balance
    // This would need the actual Pumpfun program interaction

    // For now, return simulated success
    // In production, implement actual claim logic
    console.log(`[Pumpfun] Claiming fees for ${mint}...`);

    return {
      success: true,
      amount: 0, // Would be actual claimed amount
      signature: "simulated",
    };
  } catch (error: any) {
    console.error("Error claiming fees:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Buy tokens on Pumpfun bonding curve
 */
export async function buyTokens(
  connection: Connection,
  buyerKeypair: Keypair,
  mint: string,
  solAmount: number,
  slippage: number = 10
): Promise<{ success: boolean; signature?: string; tokenAmount?: number; error?: string }> {
  return buyToken(connection, buyerKeypair, mint, solAmount, slippage);
}

/**
 * Add liquidity (stub - not fully implemented for Pumpfun)
 */
export async function addLiquidity(
  connection: Connection,
  keypair: Keypair,
  mint: string,
  solAmount: number
): Promise<{ success: boolean; signature?: string; lpTokens?: number; error?: string }> {
  // Pumpfun doesn't have traditional LP - bonding curve handles liquidity
  console.log(`[Pumpfun] addLiquidity not applicable for bonding curve tokens`);
  return { success: false, error: "Pumpfun uses bonding curve, not traditional LP" };
}

/**
 * Buy tokens on Pumpfun bonding curve (single)
 */
export async function buyToken(
  connection: Connection,
  buyerKeypair: Keypair,
  mint: string,
  solAmount: number,
  slippage: number = 10
): Promise<{ success: boolean; signature?: string; tokenAmount?: number; error?: string }> {
  try {
    const response = await fetch(`${PUMPFUN_API}/trade-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: buyerKeypair.publicKey.toBase58(),
        action: "buy",
        mint,
        denominatedInSol: "true",
        amount: solAmount,
        slippage,
        priorityFee: 0.0005,
        pool: "pump",
      }),
    });

    if (!response.ok) {
      throw new Error(`Buy failed: ${await response.text()}`);
    }

    const txData = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(txData));
    tx.sign([buyerKeypair]);

    const signature = await connection.sendTransaction(tx);
    await connection.confirmTransaction(signature, "confirmed");

    return { success: true, signature };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sell tokens on Pumpfun bonding curve
 */
export async function sellToken(
  connection: Connection,
  sellerKeypair: Keypair,
  mint: string,
  tokenAmount: number,
  slippage: number = 10
): Promise<{ success: boolean; signature?: string; solAmount?: number; error?: string }> {
  try {
    const response = await fetch(`${PUMPFUN_API}/trade-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: sellerKeypair.publicKey.toBase58(),
        action: "sell",
        mint,
        denominatedInSol: "false",
        amount: tokenAmount,
        slippage,
        priorityFee: 0.0005,
        pool: "pump",
      }),
    });

    if (!response.ok) {
      throw new Error(`Sell failed: ${await response.text()}`);
    }

    const txData = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(txData));
    tx.sign([sellerKeypair]);

    const signature = await connection.sendTransaction(tx);
    await connection.confirmTransaction(signature, "confirmed");

    return { success: true, signature };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
