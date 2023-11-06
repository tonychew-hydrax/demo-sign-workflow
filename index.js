const express = require('express')
const app = express()
const port = 3001

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

const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc)

const rootPath = "m/44'/60'/0'";


// create wallet
// generate unsigned
// generate signed


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/wallet/new', async (req, res) => {
// app.post('/wallet', (req, res) => {
    let keys = req.query.keys;
    let threshold = parseInt(req.query.threshold);

    let data = {};
    data.keys = keys;
    data.threshold = threshold;

    // demo mnemonic. do not use with actual funds
    var mnemonic1 = "cabin version vessel crash eye hero left pool frown stable uphold prevent rude couch primary drum student heavy sail airport lens ball swap first"

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

    console.log("contract", contract);

    return res.json({data, contract});
})

app.get('/unsigned', (req, res) => {
// app.post('/unsigned', (req, res) => {
    let safeAddress = req.query.safeAddress;
    let amount = req.query.amount;
    let destinationAddress = req.query.destinationAddress;

    let data = {};
    data.safeAddress = safeAddress;
    data.amount = amount;
    data.destinationAddress = destinationAddress;

    return res.json(data);
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