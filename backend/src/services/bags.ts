/**
 * Bags.fm Token Service
 * Uses official @bagsfm/bags-sdk
 * API Docs: https://docs.bags.fm/how-to-guides/launch-token
 * 
 * - Launch tokens on Bags.fm
 * - Claim creator fees
 * - Buy/Sell tokens
 * 
 * Requires API key from dev.bags.fm
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  BagsSDK,
  signAndSendTransaction,
  BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT,
  waitForSlotsToPass,
  createTipTransaction,
  sendBundleAndConfirm,
} from "@bagsfm/bags-sdk";

// Get API key from environment
const getApiKey = () => process.env.BAGS_API_KEY || "";
const getRpcUrl = () => process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface BagsTokenInfo {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  creator: string;
  pool_address?: string;
  complete: boolean;
  lifetime_fees?: number;
}

export interface CreateTokenResult {
  success: boolean;
  mint?: string;
  signature?: string;
  poolAddress?: string;
  error?: string;
}

export interface ClaimFeesResult {
  success: boolean;
  amount?: number;
  signature?: string;
  error?: string;
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  amount?: number;
  error?: string;
}

/**
 * Helper: Get or create fee share config
 * Based on: https://docs.bags.fm/how-to-guides/launch-token
 * 
 * Handles:
 * - Creating lookup tables if needed (>15 claimers)
 * - Creating the fee share config
 * - Sending bundles via Jito if needed
 */
async function getOrCreateFeeShareConfig(
  sdk: BagsSDK,
  connection: Connection,
  tokenMint: PublicKey,
  keypair: Keypair,
  feeClaimers: Array<{ user: PublicKey; userBps: number }>
): Promise<PublicKey> {
  const commitment = sdk.state.getCommitment();

  // Check if lookup tables are needed (when there are more than MAX_CLAIMERS_NON_LUT claimers)
  let additionalLookupTables: PublicKey[] | undefined;
  
  if (feeClaimers.length > BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT) {
    console.log(`[Bags] 📋 Creating lookup tables for ${feeClaimers.length} fee claimers...`);
    
    // Get LUT creation transactions
    const lutResult = await sdk.config.getConfigCreationLookupTableTransactions({
      payer: keypair.publicKey,
      baseMint: tokenMint,
      feeClaimers: feeClaimers,
    });

    if (!lutResult) {
      throw new Error("Failed to create lookup table transactions");
    }

    // Execute the LUT creation transaction first
    console.log("[Bags] 🔧 Executing lookup table creation transaction...");
    await signAndSendTransaction(connection, commitment, lutResult.creationTransaction, keypair);

    // Wait for one slot to pass (required before extending LUT)
    console.log("[Bags] ⏳ Waiting for one slot to pass...");
    await waitForSlotsToPass(connection, commitment, 1);

    // Execute all extend transactions
    console.log(`[Bags] 🔧 Executing ${lutResult.extendTransactions.length} lookup table extend transaction(s)...`);
    for (const extendTx of lutResult.extendTransactions) {
      await signAndSendTransaction(connection, commitment, extendTx, keypair);
    }

    additionalLookupTables = lutResult.lutAddresses;
    console.log("[Bags] ✅ Lookup tables created successfully!");
  }

  // Create the fee share config
  console.log(`[Bags] 📝 Creating config with params:`);
  console.log(`[Bags]    - Payer: ${keypair.publicKey.toBase58()}`);
  console.log(`[Bags]    - BaseMint: ${tokenMint.toBase58()}`);
  console.log(`[Bags]    - FeeClaimers: ${feeClaimers.length} (${feeClaimers.map(fc => `${fc.user.toBase58().slice(0,8)}...=${fc.userBps}bps`).join(', ')})`);
  
  const configResult = await sdk.config.createBagsFeeShareConfig({
    payer: keypair.publicKey,
    baseMint: tokenMint,
    feeClaimers: feeClaimers,
    additionalLookupTables: additionalLookupTables,
  });

  console.log(`[Bags] 🔧 Config transactions: ${configResult.transactions?.length || 0}`);
  console.log(`[Bags] 📦 Config bundles: ${configResult.bundles?.length || 0}`);

  // Send bundles if any (via Jito for atomic execution)
  if (configResult.bundles && configResult.bundles.length > 0) {
    console.log(`[Bags] 📦 Sending ${configResult.bundles.length} bundle(s) via Jito...`);
    
    for (let i = 0; i < configResult.bundles.length; i++) {
      const bundle = configResult.bundles[i];
      
      try {
        // Send bundle with tip
        const bundleId = await sendBundleWithTip(sdk, connection, bundle, keypair);
        console.log(`[Bags] ✅ Bundle ${i + 1} confirmed: ${bundleId}`);
      } catch (bundleError: any) {
        console.error(`[Bags] ⚠️ Bundle ${i + 1} failed, trying individual txs:`, bundleError.message);
        
        // Fallback: send transactions individually
        for (let j = 0; j < bundle.length; j++) {
          try {
            const sig = await signAndSendTransaction(connection, commitment, bundle[j], keypair);
            console.log(`[Bags] ✅ Bundle ${i + 1} tx ${j + 1} confirmed: ${sig}`);
          } catch (txError: any) {
            console.error(`[Bags] ❌ Bundle ${i + 1} tx ${j + 1} failed:`, txError.message);
          }
        }
      }
    }
  }

  // Send individual transactions if any
  if (configResult.transactions && configResult.transactions.length > 0) {
    console.log(`[Bags] 📝 Sending ${configResult.transactions.length} config transaction(s)...`);
    
    for (let i = 0; i < configResult.transactions.length; i++) {
      const tx = configResult.transactions[i];
      try {
        const sig = await signAndSendTransaction(connection, commitment, tx, keypair);
        console.log(`[Bags] ✅ Config tx ${i + 1} confirmed: ${sig}`);
      } catch (txError: any) {
        console.error(`[Bags] ❌ Config tx ${i + 1} failed:`, txError.message);
        // Continue - config might already exist
      }
    }
  }

  // Wait for config to be fully confirmed on Bags servers
  console.log("[Bags] ⏳ Waiting for config confirmation (5 seconds)...");
  await new Promise(r => setTimeout(r, 5000));

  return configResult.meteoraConfigKey;
}

/**
 * Helper: Send bundle with Jito tip
 * Based on: https://docs.bags.fm/how-to-guides/launch-token
 */
async function sendBundleWithTip(
  sdk: BagsSDK,
  connection: Connection,
  unsignedTransactions: VersionedTransaction[],
  keypair: Keypair
): Promise<string> {
  const commitment = sdk.state.getCommitment();
  const FALLBACK_JITO_TIP_LAMPORTS = 0.015 * LAMPORTS_PER_SOL;

  // Get blockhash from the first bundle transaction
  const bundleBlockhash = unsignedTransactions[0]?.message.recentBlockhash;

  if (!bundleBlockhash) {
    throw new Error("Bundle transactions must have a blockhash");
  }

  let jitoTip = FALLBACK_JITO_TIP_LAMPORTS;

  // Try to get recommended Jito tip
  try {
    const recommendedJitoTip = await sdk.solana.getJitoRecentFees();
    if (recommendedJitoTip?.landed_tips_95th_percentile) {
      jitoTip = Math.floor(recommendedJitoTip.landed_tips_95th_percentile * LAMPORTS_PER_SOL);
    }
  } catch (err: any) {
    console.log(`[Bags] ⚠️ Failed to get Jito recent fees, using fallback: ${err.message}`);
  }

  console.log(`[Bags] 💰 Jito tip: ${jitoTip / LAMPORTS_PER_SOL} SOL`);

  // Create tip transaction
  const tipTransaction = await createTipTransaction(connection, commitment, keypair.publicKey, jitoTip, {
    blockhash: bundleBlockhash,
  });

  // Sign all transactions (tip first, then the rest)
  const signedTransactions = [tipTransaction, ...unsignedTransactions].map((tx) => {
    tx.sign([keypair]);
    return tx;
  });

  console.log(`[Bags] 📦 Sending bundle via Jito...`);

  // Send bundle and wait for confirmation
  const bundleId = await sendBundleAndConfirm(signedTransactions, sdk);

  console.log(`[Bags] ✅ Bundle confirmed! Bundle ID: ${bundleId}`);
  return bundleId;
}

/**
 * Create a new token on Bags.fm using the official SDK
 * Based on: https://docs.bags.fm/how-to-guides/launch-token
 * 
 * Flow:
 * 1. Create metadata
 * 2. Create config (fee share configuration)
 * 3. Get token creation transaction
 * 4. Sign transaction
 * 5. Broadcast transaction
 * 
 * @param imageInput - Either a hosted URL string OR an image buffer
 */
export async function createToken(
  connection: Connection,
  creatorKeypair: Keypair,
  metadata: TokenMetadata,
  imageInput: string | Buffer,
  initialBuySol: number = 0
): Promise<CreateTokenResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: "BAGS_API_KEY not configured. Get one from dev.bags.fm" };
    }

    console.log(`[Bags] 🚀 Creating token: ${metadata.name} (${metadata.symbol})`);
    console.log(`[Bags] Creator: ${creatorKeypair.publicKey.toBase58()}`);
    console.log(`[Bags] Initial buy: ${initialBuySol} SOL`);
    
    const isBuffer = Buffer.isBuffer(imageInput);
    const isUrl = typeof imageInput === "string" && imageInput.startsWith("http");
    console.log(`[Bags] Image type: ${isBuffer ? "Buffer" : isUrl ? "URL" : "base64/other"}`);

    // Initialize SDK
    const sdk = new BagsSDK(apiKey, connection, "processed");
    const commitment = sdk.state.getCommitment();

    // ========================================
    // Step 1: Create token info and metadata
    // ========================================
    console.log("[Bags] Step 1: Creating token info and metadata...");
    
    // SDK accepts either imageUrl (hosted URL) OR image (buffer/file)
    let tokenInfoParams: any = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description || "",
      twitter: metadata.twitter,
      website: metadata.website,
      telegram: metadata.telegram,
    };

    if (isBuffer) {
      // Use buffer directly
      tokenInfoParams.image = imageInput;
      console.log(`[Bags] Using image buffer (${imageInput.length} bytes)`);
    } else if (isUrl) {
      // Use hosted URL
      tokenInfoParams.imageUrl = imageInput;
      console.log(`[Bags] Using image URL: ${imageInput}`);
    } else {
      // Fallback placeholder
      tokenInfoParams.imageUrl = "https://img.freepik.com/premium-vector/white-abstract-vactor-background-design_665257-153.jpg";
      console.log(`[Bags] Using fallback image URL`);
    }

    const tokenInfoResponse = await sdk.tokenLaunch.createTokenInfoAndMetadata(tokenInfoParams);

    console.log(`[Bags] ✅ Token info created!`);
    console.log(`[Bags] 🪙 Token mint: ${tokenInfoResponse.tokenMint}`);
    console.log(`[Bags] 📄 Metadata URI: ${tokenInfoResponse.tokenMetadata}`);

    const tokenMint = new PublicKey(tokenInfoResponse.tokenMint);

    // Wait for token info to propagate on Bags servers
    console.log("[Bags] ⏳ Waiting for token info to propagate (10 seconds)...");
    await new Promise(r => setTimeout(r, 10000));
    
    // Check wallet balance - Bags requires minimum 0.1 SOL to launch
    const balance = await connection.getBalance(creatorKeypair.publicKey);
    const balanceSol = balance / LAMPORTS_PER_SOL;
    console.log(`[Bags] 💰 Wallet balance: ${balanceSol.toFixed(4)} SOL`);
    
    const BAGS_MIN_BALANCE = 0.1;
    if (balanceSol < BAGS_MIN_BALANCE) {
      return { 
        success: false, 
        error: `Insufficient SOL balance: ${balanceSol.toFixed(4)} SOL. Bags requires at least ${BAGS_MIN_BALANCE} SOL to launch.` 
      };
    }

    // ========================================
    // Step 2: Get or create fee share config
    // ========================================
    console.log("[Bags] Step 2: Getting or creating fee share config...");
    
    // All fees go to creator (100% = 10000 bps)
    // IMPORTANT: Creator must always explicitly set their BPS
    const feeClaimers = [{ user: creatorKeypair.publicKey, userBps: 10000 }];
    console.log(`[Bags] 💰 All fees will go to creator wallet (10000 bps)`);

    let configKey: PublicKey | null = null;
    let configRetries = 2;
    
    while (configRetries > 0) {
      try {
        configKey = await getOrCreateFeeShareConfig(
          sdk,
          connection,
          tokenMint,
          creatorKeypair,
          feeClaimers
        );
        break; // Success, exit loop
      } catch (configError: any) {
        configRetries--;
        console.error(`[Bags] ⚠️ Config creation failed (${configRetries} retries left):`, configError.message);
        
        if (configRetries > 0) {
          console.log("[Bags] ⏳ Waiting 5 seconds before retry...");
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
    
    // If config creation failed, try to get existing config or skip
    if (!configKey) {
      console.log("[Bags] ⚠️ Config creation failed. Trying direct launch without custom fee share...");
      
      // Try to create launch transaction without custom config
      // The token creator will still receive fees, just not via custom share mechanism
      try {
        console.log("[Bags] 🎯 Creating direct launch transaction (no custom fee share)...");
        
        const tokenLaunchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
          metadataUrl: tokenInfoResponse.tokenMetadata,
          tokenMint: tokenMint,
          launchWallet: creatorKeypair.publicKey,
          initialBuyLamports: initialBuySol > 0 ? Math.floor(initialBuySol * LAMPORTS_PER_SOL) : 0,
          configKey: creatorKeypair.publicKey, // Use wallet as fallback (might not work)
        });

        console.log("[Bags] 📡 Signing and broadcasting transaction...");
        const signature = await signAndSendTransaction(
          connection,
          commitment,
          tokenLaunchTransaction,
          creatorKeypair
        );

        console.log(`[Bags] 🎉 Token launched (without custom fee share)!`);
        console.log(`[Bags] 🪙 Token Mint: ${tokenInfoResponse.tokenMint}`);
        console.log(`[Bags] 🔑 Launch Signature: ${signature}`);

        return {
          success: true,
          mint: tokenInfoResponse.tokenMint,
          signature,
        };
      } catch (directLaunchError: any) {
        console.error("[Bags] ❌ Direct launch also failed:", directLaunchError.message);
        return { 
          success: false, 
          error: `Fee share config failed: ${directLaunchError.message}. Please ensure you have enough SOL and try again.` 
        };
      }
    }

    console.log(`[Bags] 🔑 Config Key: ${configKey.toBase58()}`);

    // ========================================
    // Step 3: Create token launch transaction
    // ========================================
    console.log("[Bags] Step 3: Creating token launch transaction...");
    
    // Re-check balance after config creation
    const balanceAfterConfig = await connection.getBalance(creatorKeypair.publicKey);
    const balanceAfterConfigSol = balanceAfterConfig / LAMPORTS_PER_SOL;
    console.log(`[Bags] 💰 Balance after config: ${balanceAfterConfigSol.toFixed(4)} SOL`);
    
    // Bags requires minimum 0.1 SOL even after config
    if (balanceAfterConfigSol < 0.05) {
      return { 
        success: false, 
        error: `Insufficient SOL after config creation: ${balanceAfterConfigSol.toFixed(4)} SOL. Config transactions used too much SOL.` 
      };
    }
    
    // Calculate how much we can spend on initial buy
    // Reserve at least 0.05 SOL for rent + launch fees
    const reserveForFees = 0.05;
    const maxInitialBuy = Math.max(0, balanceAfterConfigSol - reserveForFees);
    
    let actualInitialBuy = initialBuySol;
    if (initialBuySol > maxInitialBuy) {
      console.log(`[Bags] ⚠️ Reducing initial buy from ${initialBuySol} to ${maxInitialBuy.toFixed(4)} SOL (insufficient balance)`);
      actualInitialBuy = maxInitialBuy;
    }
    
    const initialBuyLamports = actualInitialBuy > 0 
      ? Math.floor(actualInitialBuy * LAMPORTS_PER_SOL) 
      : 0;

    console.log(`[Bags] 💵 Initial buy: ${initialBuyLamports} lamports (${actualInitialBuy} SOL)`);

    const launchParams = {
      metadataUrl: tokenInfoResponse.tokenMetadata,
      tokenMint: tokenMint,
      launchWallet: creatorKeypair.publicKey,
      initialBuyLamports: initialBuyLamports,
      configKey: configKey,
    };
    
    console.log(`[Bags] 📝 Launch params:`);
    console.log(`[Bags]    - metadataUrl: ${launchParams.metadataUrl}`);
    console.log(`[Bags]    - tokenMint: ${launchParams.tokenMint.toBase58()}`);
    console.log(`[Bags]    - launchWallet: ${launchParams.launchWallet.toBase58()}`);
    console.log(`[Bags]    - initialBuyLamports: ${launchParams.initialBuyLamports}`);
    console.log(`[Bags]    - configKey: ${launchParams.configKey.toBase58()}`);

    // Retry logic for launch transaction (API can be flaky)
    let tokenLaunchTransaction;
    let launchRetries = 3;
    let lastError;
    
    while (launchRetries > 0) {
      try {
        console.log(`[Bags] 🚀 Attempting to create launch transaction (attempt ${4 - launchRetries}/3)...`);
        tokenLaunchTransaction = await sdk.tokenLaunch.createLaunchTransaction(launchParams);
        break; // Success!
      } catch (launchError: any) {
        lastError = launchError;
        launchRetries--;
        
        console.error(`[Bags] ❌ Launch API error: ${launchError.message}`);
        if (launchError.status) {
          console.error(`[Bags]    Status: ${launchError.status}`);
        }
        if (launchError.data) {
          console.error(`[Bags]    Response: ${JSON.stringify(launchError.data)}`);
        }
        
        if (launchRetries > 0) {
          console.log(`[Bags] ⏳ Waiting 5 seconds before retry...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
    
    if (!tokenLaunchTransaction) {
      throw lastError || new Error("Failed to create launch transaction after 3 attempts");
    }

    console.log(`[Bags] ✅ Launch transaction created!`);

    // ========================================
    // Step 4 & 5: Sign and broadcast transaction
    // ========================================
    console.log("[Bags] Step 4 & 5: Signing and broadcasting transaction...");
    
    // First simulate to get better error messages
    console.log("[Bags] 🔍 Simulating transaction first...");
    tokenLaunchTransaction.sign([creatorKeypair]);
    
    const simulation = await connection.simulateTransaction(tokenLaunchTransaction, {
      commitment: "confirmed",
    });
    
    if (simulation.value.err) {
      console.error("[Bags] ❌ Simulation failed!");
      console.error("[Bags] Error:", JSON.stringify(simulation.value.err, null, 2));
      if (simulation.value.logs) {
        console.error("[Bags] Logs:");
        simulation.value.logs.forEach((log, i) => console.error(`  ${i}: ${log}`));
      }
      throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
    }
    
    console.log("[Bags] ✅ Simulation passed, sending transaction...");
    
    let signature: string;
    try {
      // Get fresh blockhash and send
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
      
      signature = await connection.sendTransaction(tokenLaunchTransaction, {
        skipPreflight: true,
        maxRetries: 3,
      });
      
      console.log(`[Bags] 📤 Transaction sent: ${signature}`);
      
      // Wait for confirmation
      const confirmed = await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      }, commitment);
      
      if (confirmed.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmed.value.err)}`);
      }
      
      console.log(`[Bags] ✅ Transaction confirmed!`);
    } catch (txError: any) {
      console.error("[Bags] Transaction error details:");
      console.error("[Bags] - Message:", txError.message);
      
      // Try to get transaction logs
      if (txError.signature || signature!) {
        try {
          const txDetails = await connection.getTransaction(txError.signature || signature!, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          if (txDetails?.meta?.logMessages) {
            console.error("[Bags] Transaction logs:");
            txDetails.meta.logMessages.forEach((log, i) => console.error(`  ${i}: ${log}`));
          }
        } catch (e) {
          // Ignore
        }
      }
      
      throw txError;
    }

    console.log(`[Bags] 🎉 Token launched successfully!`);
    console.log(`[Bags] 🪙 Token Mint: ${tokenInfoResponse.tokenMint}`);
    console.log(`[Bags] 🔑 Launch Signature: ${signature}`);
    console.log(`[Bags] 📄 Metadata URI: ${tokenInfoResponse.tokenMetadata}`);
    console.log(`[Bags] 🌐 View your token at: https://bags.fm/${tokenInfoResponse.tokenMint}`);

    return {
      success: true,
      mint: tokenInfoResponse.tokenMint,
      signature,
    };
  } catch (error: any) {
    console.error("[Bags] Error creating token:", error);
    
    // Log more details for API errors
    if (error.url) {
      console.error(`[Bags] API URL: ${error.url}`);
      console.error(`[Bags] API Status: ${error.status}`);
      console.error(`[Bags] API Response:`, error.data);
    }
    
    // Try to extract useful error info
    let errorMessage = "Token creation failed";
    if (error.message) {
      errorMessage = error.message;
    }
    if (error.logs) {
      console.error("[Bags] Transaction logs:", error.logs);
      errorMessage = error.logs.join("; ");
    }
    if (error.error) {
      console.error("[Bags] Inner error:", JSON.stringify(error.error, null, 2));
      errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload metadata - now handled internally by createToken
 * This is kept for backwards compatibility but just returns an error
 */
export async function uploadMetadata(
  metadata: TokenMetadata,
  imageBuffer?: Buffer
): Promise<{ metadataUri: string; tokenInfoId: string } | { error: string }> {
  return { 
    error: "Use createToken directly - Bags SDK handles metadata internally. Provide imageUrl to createToken instead." 
  };
}

/**
 * Get token info from Bags
 */
export async function getTokenInfo(mint: string): Promise<BagsTokenInfo | null> {
  try {
    const response = await fetch(`https://bags.fm/api/token/${mint}`);
    if (!response.ok) return null;
    return await response.json() as BagsTokenInfo;
  } catch (error) {
    console.error("[Bags] Error getting token info:", error);
    return null;
  }
}

/**
 * Claim creator fees from Bags
 * Based on: https://docs.bags.fm/how-to-guides/claim-fees
 */
export async function claimCreatorFees(
  connection: Connection,
  creatorKeypair: Keypair,
  mint: string
): Promise<ClaimFeesResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: "BAGS_API_KEY not configured" };
    }

    console.log(`[Bags] Claiming fees for ${mint}...`);

    const sdk = new BagsSDK(apiKey, connection, "processed");
    const commitment = sdk.state.getCommitment();

    // Get all claimable positions for the wallet
    console.log("[Bags] Fetching all claimable positions...");
    const allPositions = await sdk.fee.getAllClaimablePositions(creatorKeypair.publicKey);

    if (!allPositions || allPositions.length === 0) {
      console.log("[Bags] No claimable positions found");
      return { success: true, amount: 0 };
    }

    console.log(`[Bags] Found ${allPositions.length} total claimable position(s)`);

    // Filter positions for the specific token mint
    const targetPositions = allPositions.filter((position: any) => position.baseMint === mint);

    if (targetPositions.length === 0) {
      console.log(`[Bags] No claimable positions found for token mint: ${mint}`);
      return { success: true, amount: 0 };
    }

    console.log(`[Bags] Found ${targetPositions.length} claimable position(s) for target token`);

    let totalClaimed = 0;
    let lastSignature = "";

    // Process each target position
    for (let i = 0; i < targetPositions.length; i++) {
      const position = targetPositions[i] as any;
      console.log(`[Bags] Processing position ${i + 1}/${targetPositions.length}...`);

      // Calculate claimable amount - properties may vary by SDK version
      let claimableAmount = 0;
      if (position.virtualPoolClaimableAmount) {
        claimableAmount += Number(position.virtualPoolClaimableAmount);
      }
      if (position.dammPoolClaimableAmount) {
        claimableAmount += Number(position.dammPoolClaimableAmount);
      }
      if (position.totalClaimableLamportsUserShare) {
        claimableAmount = Number(position.totalClaimableLamportsUserShare);
      }

      console.log(`[Bags] Claimable: ${claimableAmount / LAMPORTS_PER_SOL} SOL`);

      // Generate claim transactions for this position
      const claimTransactions = await sdk.fee.getClaimTransaction(
        creatorKeypair.publicKey,
        position
      );

      if (!claimTransactions || claimTransactions.length === 0) {
        console.log(`[Bags] No claim transactions generated for this position`);
        continue;
      }

      console.log(`[Bags] Generated ${claimTransactions.length} claim transaction(s)`);

      // Sign and send transactions
      for (let j = 0; j < claimTransactions.length; j++) {
        const transaction = claimTransactions[j] as any;
        try {
          if (!transaction) {
            console.log(`[Bags] Transaction ${j + 1} is undefined, skipping`);
            continue;
          }

          // Check if it's a legacy Transaction (has instructions property)
          if (transaction.instructions) {
            console.log(`[Bags] Transaction ${j + 1}: Legacy Transaction format`);
            
            // Debug: Check existing signatures
            const existingSigs = transaction.signatures || [];
            console.log(`[Bags] Existing signatures: ${existingSigs.length}`);
            for (const sig of existingSigs) {
              const hasSig = sig.signature && sig.signature.length > 0 && !sig.signature.every((b: number) => b === 0);
              console.log(`[Bags]   - ${sig.publicKey?.toBase58()}: ${hasSig ? "SIGNED" : "MISSING"}`);
            }
            
            // Add our signature
            console.log(`[Bags] Adding our signature: ${creatorKeypair.publicKey.toBase58()}`);
            transaction.partialSign(creatorKeypair);
            
            // Check if all signatures are now present
            const allSigned = transaction.signatures.every((sig: any) => {
              return sig.signature && sig.signature.length > 0 && !sig.signature.every((b: number) => b === 0);
            });
            
            console.log(`[Bags] All signatures present: ${allSigned}`);
            
            if (allSigned) {
              // All signatures present, send the transaction
              lastSignature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: commitment,
              });
              await connection.confirmTransaction(lastSignature, commitment);
              console.log(`[Bags] Transaction ${j + 1} confirmed: ${lastSignature}`);
              totalClaimed += claimableAmount;
            } else {
              // Missing signatures - try sending with skipPreflight
              console.log(`[Bags] Trying to send with missing signatures (skipPreflight)...`);
              try {
                lastSignature = await connection.sendRawTransaction(
                  transaction.serialize({ requireAllSignatures: false }), 
                  { skipPreflight: true }
                );
                await connection.confirmTransaction(lastSignature, commitment);
                console.log(`[Bags] Transaction ${j + 1} confirmed: ${lastSignature}`);
                totalClaimed += claimableAmount;
              } catch (sendErr: any) {
                console.error(`[Bags] Send with missing sigs failed:`, sendErr.message);
              }
            }
          } 
          // VersionedTransaction (has message property but not instructions)
          else if (transaction.message) {
            console.log(`[Bags] Transaction ${j + 1}: VersionedTransaction format`);
            lastSignature = await signAndSendTransaction(connection, commitment, transaction, creatorKeypair);
            console.log(`[Bags] Transaction ${j + 1} confirmed: ${lastSignature}`);
            totalClaimed += claimableAmount;
          }
          // Wrapped transaction
          else if (transaction.transaction) {
            console.log(`[Bags] Transaction ${j + 1}: Wrapped transaction format`);
            lastSignature = await signAndSendTransaction(connection, commitment, transaction.transaction, creatorKeypair);
            console.log(`[Bags] Transaction ${j + 1} confirmed: ${lastSignature}`);
            totalClaimed += claimableAmount;
          } 
          else {
            console.log(`[Bags] Unknown transaction format, keys:`, Object.keys(transaction));
          }
        } catch (txError: any) {
          console.error(`[Bags] Failed to send transaction ${j + 1}:`, txError.message);
        }
      }
    }

    console.log(`[Bags] Fee claiming completed! Total: ${totalClaimed / LAMPORTS_PER_SOL} SOL`);

    return {
      success: true,
      amount: totalClaimed / LAMPORTS_PER_SOL,
      signature: lastSignature,
    };
  } catch (error: any) {
    console.error("[Bags] Error claiming fees:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Buy tokens on Bags (alias for tokenFeeder compatibility)
 */
export async function buyTokens(
  connection: Connection,
  buyerKeypair: Keypair,
  mint: string,
  solAmount: number,
  slippage: number = 10
): Promise<{ success: boolean; tokenAmount?: number; signature?: string; error?: string }> {
  const result = await buyToken(connection, buyerKeypair, mint, solAmount, slippage);
  return {
    success: result.success,
    tokenAmount: result.amount,
    signature: result.signature,
    error: result.error,
  };
}

/**
 * Buy tokens on Bags using Trade API
 * Based on: https://docs.bags.fm/how-to-guides/trade-tokens
 */
export async function buyToken(
  connection: Connection,
  buyerKeypair: Keypair,
  mint: string,
  solAmount: number,
  slippage: number = 10
): Promise<TradeResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: "BAGS_API_KEY not configured" };
    }

    console.log(`[Bags] Buying ${solAmount} SOL worth of ${mint}`);

    const sdk = new BagsSDK(apiKey, connection, "processed");
    const commitment = sdk.state.getCommitment();

    // SOL mint for input
    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
    const tokenMint = new PublicKey(mint);
    const amountLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

    // Get quote first to know expected output
    console.log(`[Bags] Getting quote...`);
    const quoteResponse = await sdk.trade.getQuote({
      inputMint: SOL_MINT,
      outputMint: tokenMint,
      amount: amountLamports,
      slippageMode: "auto",
    });

    console.log(`[Bags] Expected output: ${quoteResponse.outAmount} tokens`);
    console.log(`[Bags] Price impact: ${quoteResponse.priceImpactPct}%`);

    // Create swap transaction using quote response
    console.log(`[Bags] Creating swap transaction...`);
    const swapResult = await sdk.trade.createSwapTransaction({
      quoteResponse,
      userPublicKey: buyerKeypair.publicKey,
    });

    // Sign and send
    const signature = await signAndSendTransaction(
      connection,
      commitment,
      swapResult.transaction,
      buyerKeypair
    );

    console.log(`[Bags] Buy successful: ${signature}`);

    return { 
      success: true, 
      signature,
      amount: Number(quoteResponse.outAmount) || 0,
    };
  } catch (error: any) {
    console.error("[Bags] Error buying token:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sell tokens on Bags
 */
export async function sellToken(
  connection: Connection,
  sellerKeypair: Keypair,
  mint: string,
  tokenAmount: number,
  slippage: number = 10
): Promise<TradeResult> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: "BAGS_API_KEY not configured" };
    }

    console.log(`[Bags] Selling ${tokenAmount} tokens of ${mint}`);

    const sdk = new BagsSDK(apiKey, connection, "processed");
    const commitment = sdk.state.getCommitment();

    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
    const tokenMint = new PublicKey(mint);

    // Get quote for selling tokens to SOL
    const quoteResponse = await sdk.trade.getQuote({
      inputMint: tokenMint,
      outputMint: SOL_MINT,
      amount: tokenAmount,
      slippageMode: "auto",
    });

    console.log(`[Bags] Expected output: ${quoteResponse.outAmount} lamports`);

    // Create swap transaction
    const swapResult = await sdk.trade.createSwapTransaction({
      quoteResponse,
      userPublicKey: sellerKeypair.publicKey,
    });

    const signature = await signAndSendTransaction(
      connection,
      commitment,
      swapResult.transaction,
      sellerKeypair
    );

    console.log(`[Bags] Sell successful: ${signature}`);

    return { success: true, signature };
  } catch (error: any) {
    console.error("[Bags] Error selling token:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get quote for buy/sell on Bags
 * Based on: https://docs.bags.fm/how-to-guides/trade-tokens
 */
export async function getQuote(
  connection: Connection,
  mint: string,
  amount: number,
  isBuy: boolean
): Promise<{ outAmount: number; minOutAmount: number; priceImpactPct: number } | null> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const sdk = new BagsSDK(apiKey, connection, "processed");
    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
    const tokenMint = new PublicKey(mint);

    const quote = await sdk.trade.getQuote({
      inputMint: isBuy ? SOL_MINT : tokenMint,
      outputMint: isBuy ? tokenMint : SOL_MINT,
      amount: Math.floor(amount * (isBuy ? LAMPORTS_PER_SOL : 1)), // SOL in lamports, tokens in raw
      slippageMode: "auto",
    });

    return {
      outAmount: Number(quote.outAmount) || 0,
      minOutAmount: Number(quote.minOutAmount) || 0,
      priceImpactPct: Number(quote.priceImpactPct) || 0,
    };
  } catch (error) {
    console.error("[Bags] Error getting quote:", error);
    return null;
  }
}

/**
 * Burn tokens
 * Handles both SPL Token and Token-2022 programs
 */
export async function burnTokens(
  connection: Connection,
  ownerKeypair: Keypair,
  mint: string,
  tokenAmount: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const { 
      createBurnInstruction, 
      TOKEN_PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID,
    } = await import("@solana/spl-token");
    const { Transaction } = await import("@solana/web3.js");

    console.log(`[Burn] Burning ${tokenAmount} tokens of ${mint}`);

    const mintPubkey = new PublicKey(mint);
    
    // Find the token account dynamically (works with both token programs)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerKeypair.publicKey, {
      mint: mintPubkey,
    });

    if (tokenAccounts.value.length === 0) {
      return { success: false, error: "No token account found" };
    }

    // Get the first token account with balance
    const tokenAccountInfo = tokenAccounts.value.find(
      ta => Number(ta.account.data.parsed?.info?.tokenAmount?.amount || 0) > 0
    );
    
    if (!tokenAccountInfo) {
      return { success: false, error: "No token account with balance found" };
    }

    const tokenAccount = tokenAccountInfo.pubkey;
    const accountOwner = tokenAccountInfo.account.owner;
    
    // Determine which token program to use based on account owner
    const tokenProgramId = accountOwner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;

    console.log(`[Burn] Using token program: ${tokenProgramId.toBase58()}`);
    console.log(`[Burn] Token account: ${tokenAccount.toBase58()}`);

    // Create burn instruction
    const burnIx = createBurnInstruction(
      tokenAccount,
      mintPubkey,
      ownerKeypair.publicKey,
      BigInt(Math.floor(tokenAmount)),
      [],
      tokenProgramId
    );

    // Create and send transaction
    const tx = new Transaction().add(burnIx);
    tx.feePayer = ownerKeypair.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(ownerKeypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    console.log(`[Burn] Burn successful: ${signature}`);

    return { success: true, signature };
  } catch (error: any) {
    console.error("[Burn] Error burning tokens:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get token balance for a wallet
 * Checks both ATA and all token accounts owned by wallet
 * Handles both SPL Token and Token-2022 programs
 */
export async function getTokenBalance(
  connection: Connection,
  wallet: PublicKey,
  mint: string,
  returnHumanReadable: boolean = false
): Promise<number> {
  try {
    const mintPubkey = new PublicKey(mint);
    
    // Use getParsedTokenAccountsByOwner which works with both token programs
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      mint: mintPubkey,
    });
    
    let totalRaw = 0;
    let decimals = 6; // Default
    
    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed;
      if (parsed?.info?.tokenAmount) {
        totalRaw += Number(parsed.info.tokenAmount.amount || 0);
        decimals = parsed.info.tokenAmount.decimals || 6;
      }
    }
    
    if (totalRaw > 0) {
      if (returnHumanReadable) {
        return totalRaw / Math.pow(10, decimals);
      }
      return totalRaw;
    }
    
    return 0;
  } catch (error) {
    console.error("[getTokenBalance] Error:", error);
    return 0;
  }
}

/**
 * Buyback and burn tokens
 * 1. Buy tokens with SOL using trade API
 * 2. Burn the purchased tokens
 */
export async function buybackAndBurn(
  connection: Connection,
  keypair: Keypair,
  mint: string,
  solAmount: number
): Promise<{ success: boolean; tokensBurned?: number; signature?: string; error?: string }> {
  try {
    console.log(`[Bags] Starting buyback & burn for ${mint} with ${solAmount} SOL`);

    // Step 1: Buy tokens
    const buyResult = await buyToken(connection, keypair, mint, solAmount);
    if (!buyResult.success) {
      return { success: false, error: `Buy failed: ${buyResult.error}` };
    }

    console.log(`[Bags] Bought tokens, waiting for confirmation...`);
    await new Promise(r => setTimeout(r, 2000)); // Wait for token account update

    // Step 2: Get token balance (raw for burning, human-readable for stats)
    const tokenBalanceRaw = await getTokenBalance(connection, keypair.publicKey, mint, false);
    const tokenBalanceHuman = await getTokenBalance(connection, keypair.publicKey, mint, true);
    
    if (tokenBalanceRaw === 0) {
      return { success: false, error: "No tokens to burn after purchase" };
    }

    console.log(`[Bags] Token balance to burn: ${tokenBalanceHuman} tokens (raw: ${tokenBalanceRaw})`);

    // Step 3: Burn all tokens (use raw amount for burning)
    const burnResult = await burnTokens(connection, keypair, mint, tokenBalanceRaw);
    if (!burnResult.success) {
      return { success: false, error: `Burn failed: ${burnResult.error}` };
    }

    console.log(`[Bags] Buyback & burn complete! Burned ${tokenBalanceHuman} tokens`);

    return {
      success: true,
      tokensBurned: tokenBalanceHuman, // Return human-readable amount for stats
      signature: burnResult.signature,
    };
  } catch (error: any) {
    console.error("[Bags] Error in buyback & burn:", error);
    return { success: false, error: error.message };
  }
}
