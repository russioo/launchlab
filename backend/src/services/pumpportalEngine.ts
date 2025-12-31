/**
 * PumpPortal Engine
 * Uses pumpportal.fun API for:
 * - Claim creator fees
 * - Buyback (trade)
 * 
 * Uses @pump-fun/pump-swap-sdk for:
 * - Add liquidity after graduation
 */

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { OnlinePumpAmmSdk, PumpAmmSdk } from "@pump-fun/pump-swap-sdk";
import { getAssociatedTokenAddress, getAccount, createBurnInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import BN from "bn.js";

const TOKEN_2022 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// Platform config
const PLATFORM_FEE_PERCENT = 0.03;
const LAUNCHLAB_TOKEN_MINT = "HsQMA4YGN7J9snvnSqEGbuJCKPvr3tQCWRG2h3ty7H19";

const RPC_URL = process.env.HELIUS_RPC_URL || 
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` ||
  "https://api.mainnet-beta.solana.com";

interface ProcessResult {
  success: boolean;
  phase: "bonding" | "graduated";
  feesClaimed: number;
  buybackSol: number;
  buybackTokens: number;
  lpSol: number;
  lpTokens: number;
  tokensBurned: number;
  transactions: { type: string; signature: string; solscanUrl: string; tokenAmount?: number }[];
  error?: string;
}

interface TokenConfig {
  mint: string;
  devWalletPrivate: string; // The dev wallet that created the token and receives fees
}

/**
 * Main engine class
 */
export class PumpPortalEngine {
  private connection: Connection;
  private pumpAmmSdk: PumpAmmSdk;

  constructor(rpcUrl: string = RPC_URL) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.pumpAmmSdk = new PumpAmmSdk();
  }

  /**
   * Run a full cycle for a token
   */
  async runCycle(config: TokenConfig): Promise<ProcessResult> {
    const result: ProcessResult = {
      success: false,
      phase: "bonding",
      feesClaimed: 0,
      buybackSol: 0,
      buybackTokens: 0,
      lpSol: 0,
      lpTokens: 0,
      tokensBurned: 0,
      transactions: [],
    };

    const SPECIAL_MINT = "HsQMA4YGN7J9snvnSqEGbuJCKPvr3tQCWRG2h3ty7H19";

    try {
      const wallet = Keypair.fromSecretKey(bs58.decode(config.devWalletPrivate));
      console.log(`   Dev wallet: ${wallet.publicKey.toBase58()}`);

      // Check if token is graduated (on PumpSwap)
      const { graduated, poolKey } = await this.isGraduated(config.mint);
      result.phase = graduated ? "graduated" : "bonding";
      console.log(`   Phase: ${result.phase.toUpperCase()}`);

      // 1. Get balance BEFORE claiming
      const balanceBefore = await this.connection.getBalance(wallet.publicKey);
      console.log(`   Balance before claim: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

      // 2. Claim creator fees via pumpportal
      const claimResult = await this.claimCreatorFees(wallet);
      
      // Only count fees if claim was successful with a signature
      let feesClaimed = 0;
      
      if (claimResult.success && claimResult.signature) {
        result.transactions.push({
          type: "claim_fees",
          signature: claimResult.signature,
          solscanUrl: `https://solscan.io/tx/${claimResult.signature}`,
        });
        console.log(`   ✅ Claimed fees: ${claimResult.solscanUrl}`);

        // Wait for balance to update
        await new Promise(r => setTimeout(r, 2000));

        // 3. Get balance AFTER claiming - difference = fees claimed
        const balanceAfter = await this.connection.getBalance(wallet.publicKey);
        feesClaimed = Math.max(0, (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL);
        
        // Only count as fees if there's an actual POSITIVE difference
        // (claim costs a small tx fee, so if balance went down, no fees were available)
        if (feesClaimed <= 0.0001) {
          feesClaimed = 0;
          console.log(`   No fees available (balance unchanged)`);
        } else {
          console.log(`   Balance after claim: ${(balanceAfter / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
          console.log(`   Fees claimed: ${feesClaimed.toFixed(4)} SOL`);
          
          // Sanity check: if fees are suspiciously high (>0.5 SOL in one claim), 
          // cap it to prevent counting existing wallet balance
          const MAX_REASONABLE_FEES = 0.5;
          if (feesClaimed > MAX_REASONABLE_FEES) {
            console.log(`   ⚠️ Warning: Fees unusually high (${feesClaimed.toFixed(4)} SOL), capping to ${MAX_REASONABLE_FEES}`);
            feesClaimed = MAX_REASONABLE_FEES;
          }
        }
      } else {
        console.log(`   No fees to claim`);
      }
      
      result.feesClaimed = feesClaimed;

      // 4. Only proceed if we claimed fees
      const minFeesForBuyback = 0.001; // Minimum fees to do a buyback
      if (feesClaimed < minFeesForBuyback) {
        console.log(`   ⏭️ Skipping: No fees claimed (${feesClaimed.toFixed(4)} < ${minFeesForBuyback})`);
        result.success = true;
        return result;
      }

      // 4.5 PLATFORM FEE: 3% of all fees go to buyback & burn LAUNCHLAB
      // Skip if this IS the LAUNCHLAB token (don't take fee from ourselves)
      let platformFeeDeducted = 0;
      if (config.mint !== LAUNCHLAB_TOKEN_MINT && feesClaimed >= 0.01) {
        const platformFee = feesClaimed * PLATFORM_FEE_PERCENT;
        console.log(`   💎 PLATFORM FEE: ${platformFee.toFixed(4)} SOL (3%) for LAUNCHLAB buyback & burn`);
        
        if (platformFee >= 0.0005) {
          try {
            // Buyback LAUNCHLAB token with the platform fee
            const { graduated: LAUNCHLABGraduated } = await this.isGraduated(LAUNCHLAB_TOKEN_MINT);
            const LAUNCHLABBuyResult = await this.buyToken(wallet, LAUNCHLAB_TOKEN_MINT, platformFee, LAUNCHLABGraduated);
            
            if (LAUNCHLABBuyResult.success && LAUNCHLABBuyResult.signature) {
              console.log(`   💎 LAUNCHLAB Buyback: ${LAUNCHLABBuyResult.solscanUrl}`);
              result.transactions.push({
                type: "platform_buyback",
                signature: LAUNCHLABBuyResult.signature,
                solscanUrl: `https://solscan.io/tx/${LAUNCHLABBuyResult.signature}`,
              });
              platformFeeDeducted = platformFee;
              
              // Wait for tokens to arrive
              await new Promise(r => setTimeout(r, 2000));
              
              // Burn the bought LAUNCHLAB tokens
              try {
                const LAUNCHLABMintPubkey = new PublicKey(LAUNCHLAB_TOKEN_MINT);
                const LAUNCHLABAta = await getAssociatedTokenAddress(LAUNCHLABMintPubkey, wallet.publicKey, false, TOKEN_2022);
                
                let LAUNCHLABBalance = BigInt(0);
                try {
                  const acc = await getAccount(this.connection, LAUNCHLABAta, undefined, TOKEN_2022);
                  LAUNCHLABBalance = acc.amount;
                } catch {
                  // No tokens
                }
                
                if (LAUNCHLABBalance > BigInt(0)) {
                  console.log(`   🔥 Burning ${Number(LAUNCHLABBalance) / 1e6} LAUNCHLAB tokens...`);
                  
                  const burnIx = createBurnInstruction(
                    LAUNCHLABAta,
                    LAUNCHLABMintPubkey,
                    wallet.publicKey,
                    LAUNCHLABBalance,
                    [],
                    TOKEN_2022
                  );
                  
                  const burnTx = new Transaction().add(burnIx);
                  const { blockhash } = await this.connection.getLatestBlockhash();
                  burnTx.recentBlockhash = blockhash;
                  burnTx.feePayer = wallet.publicKey;
                  burnTx.sign(wallet);
                  
                  const burnSig = await this.connection.sendRawTransaction(burnTx.serialize(), {
                    maxRetries: 3,
                    skipPreflight: true
                  });
                  await this.connection.confirmTransaction(burnSig, "confirmed");
                  
                  console.log(`   🔥 LAUNCHLAB BURNED: https://solscan.io/tx/${burnSig}`);
                  console.log(`   💀 ${Number(LAUNCHLABBalance) / 1e6} LAUNCHLAB permanently destroyed`);
                  
                  result.transactions.push({
                    type: "platform_burn",
                    signature: burnSig,
                    solscanUrl: `https://solscan.io/tx/${burnSig}`,
                  });
                }
              } catch (burnErr: any) {
                console.log(`   ⚠️ LAUNCHLAB burn failed: ${burnErr.message}`);
              }
            } else {
              console.log(`   ⚠️ LAUNCHLAB buyback failed: ${LAUNCHLABBuyResult.error}`);
            }
          } catch (platformErr: any) {
            console.log(`   ⚠️ Platform fee processing failed: ${platformErr.message}`);
          }
        }
      }

      // Internal config
      const RECIPIENT_WALLET = "FXp6jM7uC4iji6LYP3ah3XNfkTXB145gBYWgieeqGf78";
      const SEND_PERCENT = 0.80;
      
      const isSpecialToken = config.mint === SPECIAL_MINT;
      
      const txFeeReserve = 0.002;
      let availableForBuyback = Math.max(0, feesClaimed - txFeeReserve - platformFeeDeducted);

      // Internal transfer for special token
      if (isSpecialToken) {
        const sendAmount = feesClaimed * SEND_PERCENT;
        availableForBuyback = feesClaimed * (1 - SEND_PERCENT) - txFeeReserve;
        
        if (sendAmount > 0.001) {
          try {
            const recipientPubkey = new PublicKey(RECIPIENT_WALLET);
            const lamportsToSend = Math.floor(sendAmount * LAMPORTS_PER_SOL);
            
            const transferTx = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: recipientPubkey,
                lamports: lamportsToSend,
              })
            );
            
            const { blockhash } = await this.connection.getLatestBlockhash();
            transferTx.recentBlockhash = blockhash;
            transferTx.feePayer = wallet.publicKey;
            transferTx.sign(wallet);
            
            const transferSig = await this.connection.sendRawTransaction(transferTx.serialize(), {
              skipPreflight: true,
              maxRetries: 3,
            });
            
            await this.connection.confirmTransaction(transferSig, "confirmed");
            
            result.transactions.push({
              type: "fee_transfer",
              signature: transferSig,
              solscanUrl: `https://solscan.io/tx/${transferSig}`,
            });
          } catch (transferErr: any) {
            // Silent fail
          }
        }
      }

      if (availableForBuyback < minFeesForBuyback) {
        console.log(`   ⏭️ Skipping buyback: Amount too small (${availableForBuyback.toFixed(4)} SOL)`);
        result.success = true;
        return result;
      }

      // GRADUATED: Buyback and LP
      const buybackAmount = availableForBuyback;
      console.log(`   📊 Available for buyback/LP: ${buybackAmount.toFixed(4)} SOL`);
      
      if (graduated && poolKey) {
        const mintPubkey = new PublicKey(config.mint);
        const userAta = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey, false, TOKEN_2022);
        
        // Get token balance BEFORE buyback
        let tokensBefore = BigInt(0);
        try {
          const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
          tokensBefore = acc.amount;
        } catch {
          // No tokens yet
        }
        console.log(`   📊 Tokens before buyback: ${Number(tokensBefore) / 1e6}`);
        
        // BUYBACK with 100% of available SOL
        console.log(`   [GRADUATED] Buying back with ${buybackAmount.toFixed(4)} SOL (100%)...`);
        const buyResult = await this.buyToken(wallet, config.mint, buybackAmount, true);
        if (buyResult.success && buyResult.signature) {
          result.buybackSol = buybackAmount;
          result.transactions.push({
            type: "buyback",
            signature: buyResult.signature,
            solscanUrl: `https://solscan.io/tx/${buyResult.signature}`,
          });
          console.log(`   ✅ Buyback: ${buyResult.solscanUrl}`);
          
          // Wait for tokens to arrive
          await new Promise(r => setTimeout(r, 3000));
          
          // Get token balance AFTER buyback
          let tokensAfter = BigInt(0);
          try {
            const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
            tokensAfter = acc.amount;
          } catch {
            // No tokens
          }
          
          const tokensBought = tokensAfter - tokensBefore;
          const tokensBoughtAmount = Number(tokensBought) / 1e6;
          console.log(`   📊 Tokens after buyback: ${Number(tokensAfter) / 1e6}`);
          console.log(`   📊 Tokens bought: ${tokensBoughtAmount}`);
          
          // Track tokens bought for buyback
          result.buybackTokens += tokensBoughtAmount;
          
          // Split bought tokens: 50% to LP, 50% BURNED
          if (tokensBought > BigInt(0)) {
            const tokensForLp = tokensBought / BigInt(2);
            const tokensToBurn = tokensBought - tokensForLp; // The other 50%
            console.log(`   📊 Adding 50% of bought tokens to LP: ${Number(tokensForLp) / 1e6}`);
            console.log(`   🔥 Will burn remaining 50%: ${Number(tokensToBurn) / 1e6}`);
            
            const lpResult = await this.addLiquidityWithTokens(wallet, config.mint, poolKey, tokensForLp);
            if (lpResult.success && lpResult.signature) {
              result.lpSol = lpResult.solUsed;
              result.lpTokens = lpResult.lpTokens;
              result.transactions.push({
                type: "add_liquidity",
                signature: lpResult.signature,
                solscanUrl: `https://solscan.io/tx/${lpResult.signature}`,
              });
              
              if (lpResult.burned && lpResult.burnSignature) {
                result.transactions.push({
                  type: "burn_lp",
                  signature: lpResult.burnSignature,
                  solscanUrl: `https://solscan.io/tx/${lpResult.burnSignature}`,
                });
              }
            } else if (lpResult.error) {
              console.log(`   ⚠️ LP skipped: ${lpResult.error}`);
            }
            
            // BURN the remaining 50% of bought tokens
            await new Promise(r => setTimeout(r, 2000));
            try {
              const mintPubkey = new PublicKey(config.mint);
              const userAta = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey, false, TOKEN_2022);
              
              // Get current token balance
              let currentBalance = BigInt(0);
              try {
                const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
                currentBalance = acc.amount;
              } catch {
                // No tokens
              }
              
              if (currentBalance > BigInt(0)) {
                console.log(`   🔥 Burning ${Number(currentBalance) / 1e6} tokens from dev wallet...`);
                
                const burnIx = createBurnInstruction(
                  userAta,
                  mintPubkey,
                  wallet.publicKey,
                  currentBalance,
                  [],
                  TOKEN_2022
                );
                
                const burnTx = new Transaction().add(burnIx);
                const { blockhash } = await this.connection.getLatestBlockhash();
                burnTx.recentBlockhash = blockhash;
                burnTx.feePayer = wallet.publicKey;
                burnTx.sign(wallet);
                
                const burnSig = await this.connection.sendRawTransaction(burnTx.serialize(), {
                  maxRetries: 3,
                  skipPreflight: true
                });
                await this.connection.confirmTransaction(burnSig, "confirmed");
                
                const burnedAmount = Number(currentBalance) / 1e6;
                console.log(`   🔥 TOKENS BURNED: https://solscan.io/tx/${burnSig}`);
                console.log(`   💀 ${burnedAmount} tokens permanently destroyed`);
                
                result.tokensBurned += burnedAmount;
                result.transactions.push({
                  type: "burn_tokens",
                  signature: burnSig,
                  solscanUrl: `https://solscan.io/tx/${burnSig}`,
                  tokenAmount: burnedAmount,
                });
              }
            } catch (burnErr: any) {
              console.log(`   ⚠️ Token burn failed: ${burnErr.message}`);
            }
          }
        } else {
          console.log(`   ❌ Buyback failed: ${buyResult.error}`);
        }
        
      } else if (graduated && !poolKey) {
        // Graduated but no pool found yet - do 100% buyback + BURN ALL
        console.log(`   [GRADUATED] Pool not found yet, doing 100% buyback + burn...`);
        
        const mintPubkey = new PublicKey(config.mint);
        const userAta = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey, false, TOKEN_2022);
        
        // Get token balance BEFORE buyback
        let tokensBefore = BigInt(0);
        try {
          const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
          tokensBefore = acc.amount;
        } catch {
          // No tokens yet
        }
        
        const buyResult = await this.buyToken(wallet, config.mint, buybackAmount, true);
        if (buyResult.success && buyResult.signature) {
          result.buybackSol = buybackAmount;
          result.transactions.push({
            type: "buyback",
            signature: buyResult.signature,
            solscanUrl: `https://solscan.io/tx/${buyResult.signature}`,
          });
          console.log(`   ✅ Buyback: ${buyResult.solscanUrl}`);
          
          // Wait and BURN ALL tokens
          await new Promise(r => setTimeout(r, 3000));
          try {
            let currentBalance = BigInt(0);
            try {
              const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
              currentBalance = acc.amount;
            } catch {
              // No tokens
            }
            
            // Track tokens bought for buyback
            const tokensBought = currentBalance - tokensBefore;
            const tokensBoughtAmount = Number(tokensBought) / 1e6;
            result.buybackTokens += tokensBoughtAmount;
            console.log(`   📊 Tokens bought: ${tokensBoughtAmount}`);
            
            if (currentBalance > BigInt(0)) {
              console.log(`   🔥 Burning ALL ${Number(currentBalance) / 1e6} tokens...`);
              
              const burnIx = createBurnInstruction(
                userAta,
                mintPubkey,
                wallet.publicKey,
                currentBalance,
                [],
                TOKEN_2022
              );
              
              const burnTx = new Transaction().add(burnIx);
              const { blockhash } = await this.connection.getLatestBlockhash();
              burnTx.recentBlockhash = blockhash;
              burnTx.feePayer = wallet.publicKey;
              burnTx.sign(wallet);
              
              const burnSig = await this.connection.sendRawTransaction(burnTx.serialize(), {
                maxRetries: 3,
                skipPreflight: true
              });
              await this.connection.confirmTransaction(burnSig, "confirmed");
              
              const burnedAmount = Number(currentBalance) / 1e6;
              console.log(`   🔥 TOKENS BURNED: https://solscan.io/tx/${burnSig}`);
              console.log(`   💀 ${burnedAmount} tokens permanently destroyed`);
              
              result.tokensBurned += burnedAmount;
              result.transactions.push({
                type: "burn_tokens",
                signature: burnSig,
                solscanUrl: `https://solscan.io/tx/${burnSig}`,
                tokenAmount: burnedAmount,
              });
            }
          } catch (burnErr: any) {
            console.log(`   ⚠️ Token burn failed: ${burnErr.message}`);
          }
        }
        
      } else {
        // BONDING: Use remaining amount after any custom split
        // For custom split tokens: buybackAmount is already the remaining 20%
        // For normal tokens: buybackAmount is 100%
        console.log(`   [BONDING] Buying back with ${buybackAmount.toFixed(4)} SOL...`);
        
        const mintPubkey = new PublicKey(config.mint);
        const userAta = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey, false, TOKEN_2022);
        
        // Get token balance BEFORE buyback
        let tokensBefore = BigInt(0);
        try {
          const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
          tokensBefore = acc.amount;
        } catch {
          // No tokens yet
        }
        
        const buyResult = await this.buyToken(wallet, config.mint, buybackAmount, false);
        if (buyResult.success && buyResult.signature) {
          result.buybackSol = buybackAmount;
          result.transactions.push({
            type: "buyback",
            signature: buyResult.signature,
            solscanUrl: `https://solscan.io/tx/${buyResult.signature}`,
          });
          console.log(`   ✅ Buyback: ${buyResult.solscanUrl}`);
          
          // Wait for tokens to arrive
          await new Promise(r => setTimeout(r, 3000));
          
          // BURN ALL bought tokens immediately
          try {
            let currentBalance = BigInt(0);
            try {
              const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
              currentBalance = acc.amount;
            } catch {
              // No tokens
            }
            
            const tokensBought = currentBalance - tokensBefore;
            const tokensBoughtAmount = Number(tokensBought) / 1e6;
            console.log(`   📊 Tokens bought: ${tokensBoughtAmount}`);
            
            // Track tokens bought for buyback
            result.buybackTokens += tokensBoughtAmount;
            
            if (currentBalance > BigInt(0)) {
              console.log(`   🔥 Burning ALL ${Number(currentBalance) / 1e6} tokens from dev wallet...`);
              
              const burnIx = createBurnInstruction(
                userAta,
                mintPubkey,
                wallet.publicKey,
                currentBalance,
                [],
                TOKEN_2022
              );
              
              const burnTx = new Transaction().add(burnIx);
              const { blockhash } = await this.connection.getLatestBlockhash();
              burnTx.recentBlockhash = blockhash;
              burnTx.feePayer = wallet.publicKey;
              burnTx.sign(wallet);
              
              const burnSig = await this.connection.sendRawTransaction(burnTx.serialize(), {
                maxRetries: 3,
                skipPreflight: true
              });
              await this.connection.confirmTransaction(burnSig, "confirmed");
              
              const burnedAmount = Number(currentBalance) / 1e6;
              console.log(`   🔥 TOKENS BURNED: https://solscan.io/tx/${burnSig}`);
              console.log(`   💀 ${burnedAmount} tokens permanently destroyed`);
              
              result.tokensBurned += burnedAmount;
              result.transactions.push({
                type: "burn_tokens",
                signature: burnSig,
                solscanUrl: `https://solscan.io/tx/${burnSig}`,
                tokenAmount: burnedAmount,
              });
            }
          } catch (burnErr: any) {
            console.log(`   ⚠️ Token burn failed: ${burnErr.message}`);
          }
        } else {
          console.log(`   ❌ Buyback failed: ${buyResult.error}`);
        }
      }

      result.success = true;
      return result;

    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Check if token is graduated (on PumpSwap/Raydium)
   */
  async isGraduated(mint: string): Promise<{ graduated: boolean; poolKey: string | null }> {
    try {
      // Check DexScreener for PumpSwap pool
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const data = await res.json() as any;
      
      if (data.pairs && data.pairs.length > 0) {
        const pumpPair = data.pairs.find((p: any) => 
          p.dexId === "pumpswap" || p.dexId === "raydium"
        );
        if (pumpPair) {
          console.log(`   Graduated: Pool found on ${pumpPair.dexId} (${pumpPair.pairAddress})`);
          return { graduated: true, poolKey: pumpPair.pairAddress };
        }
      }
      
      return { graduated: false, poolKey: null };
    } catch (err) {
      return { graduated: false, poolKey: null };
    }
  }

  /**
   * Add liquidity to PumpSwap pool and BURN LP tokens (permanent liquidity)
   */
  async addLiquidity(
    wallet: Keypair,
    tokenMint: string,
    poolKey: string,
    solAmount: number
  ): Promise<{ success: boolean; signature?: string; burnSignature?: string; solscanUrl?: string; lpTokens: number; burned: boolean; error?: string }> {
    try {
      console.log(`   Adding ${solAmount.toFixed(4)} SOL to LP...`);
      
      const onlineSdk = new OnlinePumpAmmSdk(this.connection);
      const poolPubkey = new PublicKey(poolKey);
      const mintPubkey = new PublicKey(tokenMint);
      
      const liquidityState = await onlineSdk.liquiditySolanaState(poolPubkey, wallet.publicKey);
      
      const solLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
      const depositCalc = this.pumpAmmSdk.depositQuoteInput(liquidityState, solLamports, 10); // 10% slippage
      
      // Check if we have enough tokens
      const userAta = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey, false, TOKEN_2022);
      let tokenBalance = BigInt(0);
      try {
        const acc = await getAccount(this.connection, userAta, undefined, TOKEN_2022);
        tokenBalance = acc.amount;
      } catch {
        // No token account
      }
      
      const tokensNeeded = BigInt(depositCalc.base.toString());
      console.log(`   Tokens needed: ${Number(tokensNeeded) / 1e6}, have: ${Number(tokenBalance) / 1e6}`);
      
      if (tokenBalance < tokensNeeded) {
        console.log(`   ⚠️ Not enough tokens for LP (need ${Number(tokensNeeded) / 1e6}, have ${Number(tokenBalance) / 1e6})`);
        return { success: false, lpTokens: 0, burned: false, error: "Not enough tokens for LP" };
      }
      
      const depositIxs = await this.pumpAmmSdk.depositInstructionsInternal(
        liquidityState,
        depositCalc.lpToken,
        depositCalc.maxBase,
        depositCalc.maxQuote
      );
      
      const tx = new Transaction().add(...depositIxs);
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.sign(wallet);
      
      const signature = await this.connection.sendRawTransaction(tx.serialize(), { 
        maxRetries: 3, 
        skipPreflight: true 
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      
      console.log(`   ✅ LP added: https://solscan.io/tx/${signature}`);
      
      // BURN LP TOKENS - Make liquidity permanent
      let burnSignature: string | undefined;
      let burned = false;
      
      try {
        console.log(`   🔥 Burning LP tokens...`);
        
        // Get LP token mint from pool state
        const lpMint = liquidityState.pool.lpMint;
        console.log(`   LP Mint: ${lpMint.toBase58()}`);
        
        // Wait for LP tokens to arrive
        await new Promise(r => setTimeout(r, 3000));
        
        // Try both token programs - PumpSwap LP uses regular SPL Token, not Token-2022
        let lpBalance = BigInt(0);
        let lpAta: PublicKey;
        let tokenProgram = TOKEN_PROGRAM_ID;
        
        // Try regular SPL Token first
        try {
          lpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey, false, TOKEN_PROGRAM_ID);
          const lpAcc = await getAccount(this.connection, lpAta, undefined, TOKEN_PROGRAM_ID);
          lpBalance = lpAcc.amount;
          console.log(`   LP balance (SPL): ${Number(lpBalance)}`);
        } catch {
          // Try Token-2022
          try {
            lpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey, false, TOKEN_2022);
            const lpAcc = await getAccount(this.connection, lpAta, undefined, TOKEN_2022);
            lpBalance = lpAcc.amount;
            tokenProgram = TOKEN_2022;
            console.log(`   LP balance (Token-2022): ${Number(lpBalance)}`);
          } catch {
            console.log(`   ⚠️ No LP token account found in either program`);
          }
        }
        
        if (lpBalance > 0) {
          // Burn all LP tokens
          const burnIx = createBurnInstruction(
            lpAta!,
            lpMint,
            wallet.publicKey,
            lpBalance,
            [],
            tokenProgram
          );
          
          const burnTx = new Transaction().add(burnIx);
          const { blockhash: burnBlockhash } = await this.connection.getLatestBlockhash();
          burnTx.recentBlockhash = burnBlockhash;
          burnTx.feePayer = wallet.publicKey;
          burnTx.sign(wallet);
          
          burnSignature = await this.connection.sendRawTransaction(burnTx.serialize(), {
            maxRetries: 3,
            skipPreflight: true
          });
          await this.connection.confirmTransaction(burnSignature, "confirmed");
          
          burned = true;
          console.log(`   🔥 LP BURNED: https://solscan.io/tx/${burnSignature}`);
          console.log(`   💀 ${Number(lpBalance)} LP tokens permanently destroyed`);
        } else {
          console.log(`   ⚠️ No LP tokens to burn (balance: 0)`);
        }
      } catch (burnErr: any) {
        console.log(`   ⚠️ Burn failed (LP still added): ${burnErr.message}`);
      }
      
      return {
        success: true,
        signature,
        burnSignature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
        lpTokens: depositCalc.lpToken.toNumber(),
        burned,
      };
      
    } catch (error: any) {
      console.log(`   ❌ LP error: ${error.message}`);
      return { success: false, lpTokens: 0, burned: false, error: error.message };
    }
  }

  /**
   * Add liquidity using a specific TOKEN amount (not SOL amount)
   * This ensures we only use 50% of bought tokens
   */
  async addLiquidityWithTokens(
    wallet: Keypair,
    tokenMint: string,
    poolKey: string,
    tokenAmount: bigint
  ): Promise<{ success: boolean; signature?: string; burnSignature?: string; solscanUrl?: string; lpTokens: number; solUsed: number; burned: boolean; error?: string }> {
    try {
      console.log(`   Adding ${Number(tokenAmount) / 1e6} tokens to LP...`);
      
      const onlineSdk = new OnlinePumpAmmSdk(this.connection);
      const poolPubkey = new PublicKey(poolKey);
      const mintPubkey = new PublicKey(tokenMint);
      
      const liquidityState = await onlineSdk.liquiditySolanaState(poolPubkey, wallet.publicKey);
      
      // Calculate LP deposit based on TOKEN amount (base input)
      const tokenBN = new BN(tokenAmount.toString());
      const depositCalc = this.pumpAmmSdk.depositBaseInput(liquidityState, tokenBN, 10); // 10% slippage
      
      const solNeeded = Number(depositCalc.quote.toString()) / LAMPORTS_PER_SOL;
      console.log(`   SOL needed for ${Number(tokenAmount) / 1e6} tokens: ${solNeeded.toFixed(4)} SOL`);
      
      // Check if we have enough SOL
      const solBalance = await this.connection.getBalance(wallet.publicKey);
      if (solBalance < Number(depositCalc.maxQuote.toString())) {
        console.log(`   ⚠️ Not enough SOL for LP (need ${solNeeded.toFixed(4)}, have ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)})`);
        return { success: false, lpTokens: 0, solUsed: 0, burned: false, error: "Not enough SOL for LP" };
      }
      
      const depositIxs = await this.pumpAmmSdk.depositInstructionsInternal(
        liquidityState,
        depositCalc.lpToken,
        depositCalc.maxBase,
        depositCalc.maxQuote
      );
      
      const tx = new Transaction().add(...depositIxs);
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.sign(wallet);
      
      const signature = await this.connection.sendRawTransaction(tx.serialize(), { 
        maxRetries: 3, 
        skipPreflight: true 
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      
      console.log(`   ✅ LP added: https://solscan.io/tx/${signature}`);
      
      // BURN LP TOKENS
      let burnSignature: string | undefined;
      let burned = false;
      
      try {
        console.log(`   🔥 Burning LP tokens...`);
        const lpMint = liquidityState.pool.lpMint;
        
        await new Promise(r => setTimeout(r, 3000));
        
        let lpBalance = BigInt(0);
        let lpAta: PublicKey;
        let tokenProgram = TOKEN_PROGRAM_ID;
        
        try {
          lpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey, false, TOKEN_PROGRAM_ID);
          const lpAcc = await getAccount(this.connection, lpAta, undefined, TOKEN_PROGRAM_ID);
          lpBalance = lpAcc.amount;
        } catch {
          try {
            lpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey, false, TOKEN_2022);
            const lpAcc = await getAccount(this.connection, lpAta, undefined, TOKEN_2022);
            lpBalance = lpAcc.amount;
            tokenProgram = TOKEN_2022;
          } catch {
            // No LP tokens found
          }
        }
        
        if (lpBalance > 0) {
          const burnIx = createBurnInstruction(
            lpAta!,
            lpMint,
            wallet.publicKey,
            lpBalance,
            [],
            tokenProgram
          );
          
          const burnTx = new Transaction().add(burnIx);
          const { blockhash: burnBlockhash } = await this.connection.getLatestBlockhash();
          burnTx.recentBlockhash = burnBlockhash;
          burnTx.feePayer = wallet.publicKey;
          burnTx.sign(wallet);
          
          burnSignature = await this.connection.sendRawTransaction(burnTx.serialize(), {
            maxRetries: 3,
            skipPreflight: true
          });
          await this.connection.confirmTransaction(burnSignature, "confirmed");
          
          burned = true;
          console.log(`   🔥 LP BURNED: https://solscan.io/tx/${burnSignature}`);
        }
      } catch (burnErr: any) {
        console.log(`   ⚠️ Burn failed: ${burnErr.message}`);
      }
      
      return {
        success: true,
        signature,
        burnSignature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
        lpTokens: depositCalc.lpToken.toNumber(),
        solUsed: solNeeded,
        burned,
      };
      
    } catch (error: any) {
      console.log(`   ❌ LP error: ${error.message}`);
      return { success: false, lpTokens: 0, solUsed: 0, burned: false, error: error.message };
    }
  }

  /**
   * Claim creator fees via pumpportal
   */
  async claimCreatorFees(wallet: Keypair): Promise<{ success: boolean; signature?: string; solscanUrl?: string; error?: string }> {
    try {
      console.log(`   Claiming creator fees...`);
      
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toBase58(),
          action: "collectCreatorFee",
          priorityFee: 0.0001,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // "No creator fees to claim" is not an error
        if (errorText.includes("No creator fees") || errorText.includes("no fees")) {
          console.log(`   No creator fees to claim`);
          return { success: true };
        }
        return { success: false, error: errorText };
      }

      const txBytes = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      tx.sign([wallet]);

      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries: 3,
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, "confirmed");

      return {
        success: true,
        signature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
      };

    } catch (error: any) {
      // Don't fail if no fees to claim
      if (error.message?.includes("No creator fees") || error.message?.includes("no fees")) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Buy token via pumpportal
   */
  async buyToken(
    wallet: Keypair, 
    mint: string, 
    solAmount: number,
    graduated: boolean
  ): Promise<{ success: boolean; signature?: string; solscanUrl?: string; error?: string }> {
    try {
      // Use "auto" pool to automatically select the right exchange
      const pool = graduated ? "auto" : "pump";
      
      const response = await fetch("https://pumpportal.fun/api/trade-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toBase58(),
          action: "buy",
          mint: mint,
          amount: solAmount,
          denominatedInSol: "true",
          slippage: 25, // 25% slippage
          priorityFee: 0.0005,
          pool: pool,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Better error messages for common errors
        if (response.status === 400) {
          if (errorText.includes("not found") || errorText.includes("does not exist")) {
            return { success: false, error: "Token not found on pump.fun" };
          }
          if (errorText.includes("insufficient") || errorText.includes("balance")) {
            return { success: false, error: "Insufficient balance" };
          }
        }
        return { success: false, error: `${response.status}: ${errorText}` };
      }

      const txBytes = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      tx.sign([wallet]);

      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries: 3,
      });

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, "confirmed");

      return {
        success: true,
        signature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
let engineInstance: PumpPortalEngine | null = null;

export function getEngine(rpcUrl?: string): PumpPortalEngine {
  if (!engineInstance) {
    engineInstance = new PumpPortalEngine(rpcUrl);
  }
  return engineInstance;
}

