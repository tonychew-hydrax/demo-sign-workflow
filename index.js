const express = require('express')
const app = express()
const port = 3001

const helmet = require('helmet');
var cors = require('cors')

var bip39 = require('bip39')
var crypto = require('crypto')
var { ethers, JsonRpcProvider } = require('ethers')
// var HDNodeWallet = require('ethers/wallet')
var { EthersAdapter } = require('@safe-global/protocol-kit')
var SafeProtocol = require('@safe-global/protocol-kit')

var SafeApiKit = require('@safe-global/api-kit')
var { SafeFactory } = require('@safe-global/protocol-kit')
var { SafeAccountConfig } = require('@safe-global/protocol-kit')
var { ContractNetworksConfig } = require(  '@safe-global/protocol-kit')
var Safe = require('@safe-global/protocol-kit')

// https://chainlist.org/?search=goerli&testnets=true
// const RPC_URL='https://eth-goerli.public.blastapi.io'
var RPC_URL = "https://goerli.infura.io/v3/fa926a9d3c2a4067af17c4df5b3d6079"
// const provider = new ethers.providers.JsonRpcProvider(RPC_URL)

// const provider = new JsonRpcProvider(RPC_URL);
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
console.log("provider ", provider);

app.use(cors())
app.use(helmet());

const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc)

const rootPath = "m/44'/60'/0'";

// var { EthSignSignature, EthSafeTransaction } = require('@safe-global/protocol-kit')
var EthSignSignature = require("@safe-global/protocol-kit/dist/src/utils/signatures/SafeSignature").default;
var EthSafeTransaction = require("@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction").default;


// demo mnemonic. do not use with actual funds
var mnemonic1 = "cabin version vessel crash eye hero left pool frown stable uphold prevent rude couch primary drum student heavy sail airport lens ball swap first"

var mnemonic2 = "outer unusual this swamp endorse wrong sauce dash camp argue mention poem refuse goat engage flip second pyramid guess lounge sound gun craft noble"



// create wallet
// generate unsigned
// generate signed


app.get('/', async (req, res) => {
  res.send('Hello World!')
})

app.get('/test', async (req, res) => {
    let walletName = req.query.walletName;
    let blockchain = req.query.blockchain;
    let network = req.query.network;
    let quorumM = req.query.quorumM;
    let quorumN = req.query.quorumN;

    let data = {};
    data.walletName = walletName;
    data.blockchain = blockchain;
    data.network = network;
    data.quorumM = quorumM;
    data.quorumN = quorumN;

    console.log("data", data);
    return res.json(data);
})

app.get('/wallet/new', async (req, res) => {
// app.post('/wallet', (req, res) => {
    let keys = req.query.keys;
    let threshold = parseInt(req.query.threshold);

    let data = {};
    data.keys = keys;
    data.threshold = threshold;

    let address1 = "0xa3c0318941267ec2C62A23aa711ebECC5D677263";
    let address2 = "0x1181f6E644B5FAe2748f6c674Fe3e7B8683Dc7De";
    let address3 = keys;

    let privateKey1 = genDerivationPrivateKey(mnemonic1, rootPath, "0/0")
    
    let contract;
    contract = await genContractAddress(
        [address1, address2, address3], 
        [privateKey1, "", ""],
        threshold
    )

    console.log("data", data);
    console.log("contract", contract);

    return res.json({data, contract});
})

app.get('/unsigned', async (req, res) => {
// app.post('/unsigned', (req, res) => {
    let safeAddress = req.query.safeAddress;
    let amount = req.query.amount;
    let destinationAddress = req.query.destinationAddress;
    console.log("destinationAddress", destinationAddress);
    
    destinationAddress = "0x073b965F98734DaDd401c33dc55EbD36d232AF58";

    let data = {};
    data.safeAddress = safeAddress;
    data.amount = amount;
    data.destinationAddress = destinationAddress;

    let amountParsed = ethers.utils.parseEther(amount, 'ether')
    
    let unsignedTxData = await genMultisigUnsignTx(provider, safeAddress, destinationAddress, amountParsed, "", "");

    console.log("data", data);
    console.log("unsignedTxData", unsignedTxData);
    return res.json({data, unsignedTxData});
})

app.get('/sign_broadcast', async (req, res) => {
// app.post('/sign_broadcast', (req, res) => {
    let safeAddress = req.query.safeAddress;
    let signerAddress = req.query.signerAddress;
    let signedData = req.query.signedData;

    let data = {};
    data.safeAddress = safeAddress;
    data.signerAddress = signerAddress;
    data.signedData = signedData;

    // let rawTx2 = `{"blockchain":"ethereum","network":"mainnet","timestamp":1697018602783,"signedTx":"{\"signatures\":[{\"signer\":\"xxx\",\"data\":\"xxx\"}],\"data\":{\"to\":\"0x073b965F98734DaDd401c33dc55EbD36d232AF58\",\"value\":{\"type\":\"BigNumber\",\"hex\":\"0x2386f26fc10000\"},\"data\":\"0x\",\"operation\":0,\"baseGas\":0,\"gasPrice\":0,\"gasToken\":\"0x0000000000000000000000000000000000000000\",\"refundReceiver\":\"0x0000000000000000000000000000000000000000\",\"nonce\":0,\"safeTxGas\":0}}"}`
    // console.log('rawTx2 ', rawTx2)

    let rawTx = `{"blockchain":"ethereum","network":"mainnet","timestamp":1697018602783,"signedTx":{"signatures":[{"signer":"${signerAddress}","data":"${signedData}"}],"data":{"to":"0x073b965F98734DaDd401c33dc55EbD36d232AF58","value":{"type":"BigNumber","hex":"0x2386f26fc10000"},"data":"0x","operation":0,"baseGas":0,"gasPrice":0,"gasToken":"0x0000000000000000000000000000000000000000","refundReceiver":"0x0000000000000000000000000000000000000000","nonce":0,"safeTxGas":0}}}`
    console.log('rawTx ', rawTx)

    let partiallySignedTxData = '';
    let partiallySignedTx = '';
    let partiallySignedTxSignature;
    console.log('------')
    
    partiallySignedTxData = JSON.parse(rawTx);
    console.log('partiallySignedTxData ', partiallySignedTxData)

    console.log('------')
    console.log('partiallySignedTxData["signedTx"] ', partiallySignedTxData["signedTx"])

    partiallySignedTx = (partiallySignedTxData["signedTx"])
    console.log('partiallySignedTx ', partiallySignedTx)

    console.log('------')
    console.log('------')
    console.log('------')

    console.log('partiallySignedTx ', partiallySignedTx)
    

    let privateKey1 = genDerivationPrivateKey(mnemonic1, rootPath, "0/0");
    let privateKey2 = genDerivationPrivateKey(mnemonic2, rootPath, "0/0");
    
    const signer1 = new ethers.Wallet(privateKey1, provider);
    const signer2 = new ethers.Wallet(privateKey2, provider);
    
    let fullySignedTx;
    let demoSignedTxWith2;
    fullySignedTx = await genMultisigSignedTx(signer1, partiallySignedTx, safeAddress);
    console.log('fullySignedTx ', fullySignedTx)

    demoSignedTxWith2 = await genMultisigSignedTx(signer2, partiallySignedTx, safeAddress);

    console.log('demoSignedTxWith2 ', demoSignedTxWith2)

    console.log('------')
    console.log('------')
    console.log('------')

    const safeTransactionToString = (safeTransaction) => {
        return JSON.stringify({
            signatures: [...safeTransaction.signatures.values()].map(s => ({signer: s.signer, data: s.data})),
            data: safeTransaction.data,
        })
    }

    const stringToSafeTransaction = (safeTransactionData) => {
        const { signatures, data } = JSON.parse(safeTransactionData)
        console.log('signatures ', signatures)
        console.log('signatures[0] ', signatures[0])
        console.log('data ', data)
        
        const t = new EthSafeTransaction(data)
        for (const { signer, data } of signatures) {
            console.log('signer ', signer)
            console.log('data ', data)
            let sig = new EthSignSignature(signer, data)
            console.log('sig ', sig)
            t.addSignature(new EthSignSignature(signer, data))
        }
        return t
    }

    let stringTx = safeTransactionToString(fullySignedTx)
    console.log('stringTx ', stringTx)
    let output = stringToSafeTransaction(stringTx)
    console.log('output ', output)
    
    let tx;
    tx = await broadcastSignedTx(signer1, output, safeAddress);
    console.log('tx ', tx)

    console.log("data", data);
    console.log("stringTx", stringTx);
    console.log("tx", tx);

    return res.json({data, stringTx, tx});
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})



function genXpub(mnemonic, rootPath) {
    var seed = bip39.mnemonicToSeedSync(mnemonic)
    console.log("seed ", seed);
    
    const root = bip32.fromSeed(seed)
    console.log("root ", root);
    
    var acct = root.derivePath(rootPath);
    
    const xpub = acct.neutered().toBase58();
    console.log("xpub ", xpub);

    return xpub
}

function genDerivationAddress(xpub, rootPath, subPath) {
    let HDNode = ethers.utils.HDNode.fromExtendedKey(xpub);
    console.log("HDNode ", HDNode);
    
    const address = HDNode.derivePath(subPath);
    console.log("address ", address.address)

    return address.address
}


function genDerivationPrivateKey(mnemonic, rootPath, subPath) {
  let fullPath = rootPath + "/" + subPath;
  let hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  console.log("hdNode ", hdNode);

  let mnemonicWallet = hdNode.derivePath(fullPath);
  console.log("mnemonicWallet ", mnemonicWallet);

  let privateKey = mnemonicWallet.privateKey;
  console.log("privateKey ", privateKey);

  return privateKey
}

async function genContractAddress(addressArray, keyArray, threshold) {
  let quorum = addressArray.length;

  let ethAdapterOwnerArray = [];
  for (var i=0; i<quorum; i++) {
    if (keyArray[i] !== "") {
      let ownerSigner = new ethers.Wallet(keyArray[i], provider)
      console.log("ownerSigner ", ownerSigner)
  
      // only need 1 signer, the rest can be provider
      let ethAdapterOwner = new EthersAdapter({
        ethers,
        signerOrProvider: ownerSigner
      })
      console.log("ethAdapterOwner ", ethAdapterOwner)
  
      ethAdapterOwnerArray.push(ethAdapterOwner)
    }
  }
  console.log("ethAdapterOwnerArray ", ethAdapterOwnerArray) 

  let { chainId } = await provider.getNetwork()
  console.log(chainId) 
  
  // const Safe = SafeProtocol.default
  // console.log("Safe ", Safe)
  
  // const safeSdk = await Safe.create({
  //   ethAdapter: ethAdapterOwner,
  // });
  // console.log("safeSdk ", safeSdk)
  
  const safeAccountConfig = {
    owners: addressArray,
    threshold: threshold,
    // ... (Optional params)
  }

  let safeFactory = await SafeFactory.create({ ethAdapter: ethAdapterOwnerArray[0] })
  console.log("safeFactory ", safeFactory)
  
  /* This Safe is tied to owner 1 because the factory was initialized with
  an adapter that had owner 1 as the signer. */
  let safeSdkOwner1 = await safeFactory.deploySafe({ safeAccountConfig })
  
  let safeAddress = await safeSdkOwner1.getAddress()
  
  console.log('Your Safe has been deployed:')
  console.log(`https://goerli.etherscan.io/address/${safeAddress}`)
  console.log(`https://app.safe.global/gor:${safeAddress}`)

  return safeAddress
}

async function genMultisigUnsignTx(provider, sourceAddress, destinationAddress, amount, nonceProvided, gasPriceProvided, gasLimit = 250000) {
    let gasPrice;
    let nonce;

    let safeAddress = sourceAddress;

    const ethAdapterProvider = new EthersAdapter({
        ethers,
        signerOrProvider: provider //provider //privateKey1
    })
    console.log("ethAdapterProvider ", ethAdapterProvider)

    if (gasPriceProvided !== "") {
        gasPrice = gasPriceProvided
    } else {
        gasPrice = await provider.getFeeData()
    }
    console.log('gasPrice ', gasPrice)

    if (nonceProvided !== "") {
        nonce = nonceProvided
    } else {
        nonce = await provider.getTransactionCount(sourceAddress, "latest");
    }
    console.log('nonce ', nonce)
    
    let safeTransactionData = {
        to: destinationAddress,
        value: amount, //'<eth_value_in_wei>',
        data: '0x'
    }
    // operation, // Optional
    // safeTxGas, // Optional
    // baseGas, // Optional
    // gasPrice, // Optional
    // gasToken, // Optional
    // refundReceiver, // Optional
    // nonce // Optional
    
    const Safe = SafeProtocol.default
    const safeSdk = await Safe.create({ ethAdapter: ethAdapterProvider, safeAddress })
    
    const safeTransaction = await safeSdk.createTransaction({ safeTransactionData })
    console.log("safeTransaction ", safeTransaction)

    const txHash = await safeSdk.getTransactionHash(safeTransaction)
    console.log("txHash ", txHash)

    let unsignTx = safeTransaction

    return [unsignTx, {"txHash": txHash}]
}

async function genMultisigSignedTx(signer, unsignTx, safeAddress) {
    const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer //provider //privateKey1
    })
    console.log("ethAdapter ", ethAdapter)
    console.log("signer ", signer)
    
    console.log("unsignTx.signatures ", unsignTx.signatures)

    let Safe = SafeProtocol.default
    let safeSdk = await Safe.create({ ethAdapter: ethAdapter, safeAddress })
    console.log("safeSdk ", safeSdk)
    console.log("unsignTx ", unsignTx)

    const balance = await safeSdk.getBalance()
    console.log("balance ", ethers.utils.formatEther(balance))

    const nonce = await safeSdk.getNonce()
    console.log("nonce ", nonce)
    console.log("------------------")
    console.log("------------------")

    console.log("unsignTx ", unsignTx)

    const signedSafeTransaction = await safeSdk.signTransaction(unsignTx)
    console.log("signedSafeTransaction ", signedSafeTransaction)
    console.log("signedSafeTransaction ", signedSafeTransaction.signatures)

    const txHash = await safeSdk.getTransactionHash(signedSafeTransaction)
    console.log("txHash ", txHash)

    const ownerAddressesApprove = await safeSdk.getOwnersWhoApprovedTx(txHash)
    console.log("ownerAddressesApprove ", ownerAddressesApprove)

    let signedTx = signedSafeTransaction
    console.log("signedTx ", signedTx)

    return signedTx;
}

async function broadcastSignedTx(signer, signedTx, safeAddress) {
    console.log('broadcastSignedTx');
    console.log('signedTx ', signedTx);

    const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer //provider //privateKey1
    })

    let Safe = SafeProtocol.default
    let safeSdk = await Safe.create({ ethAdapter: ethAdapter, safeAddress })

    let broadcastTx = await safeSdk.executeTransaction(signedTx)
    await broadcastTx.transactionResponse?.wait()
    console.log('broadcastTx ', broadcastTx);

    return broadcastTx;
}