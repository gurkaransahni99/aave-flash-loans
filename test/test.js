// const truffleAssert = require('truffle-assertions');
const truffleContract = require('@truffle/contract');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
// console.log("RUNNNNNNNN");

const { BigNumber, utils } = require("ethers")
const BN = require('bn.js');

let exploit = artifacts.require("Exploit")
let flashLoan = artifacts.require("FlashLoan")

let aaveABI = require("../interfaces/Aave.json")
let wethABI = require("../interfaces/WETH.json")
let tokenABI = require("../interfaces/erc20.json")
// let uniswapABI = require('../abi/uniswapRouter.json');
// let tokenABI = require("../abi/erc20.json")
// let wethABI = require("../abi/WETH.json")
// let cTokenABI = require("../abi/CToken.json")
// let cETHABI = require("../abi/CEth.json")

const advancetime = (time) => new Promise((resolve, reject) => {
    web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        id: new Date().getTime(),
        params: [time]
    }, async (err, result) => {
        if (err) { return reject(err) }
        const newBlockHash = await web3.eth.getBlock('latest').hash

        return resolve(newBlockHash)
    })
})

// Helper function for toBaseUnit
function isString(s) {
    return (typeof s === 'string' || s instanceof String)
}

const toBaseUnit = (value, decimals) => {
    if (!isString(value)) {
        throw new Error('Pass strings to prevent floating point precision issues.')
    }
    const ten = new BN(10);
    const base = ten.pow(new BN(decimals));

    // Is it negative?
    let negative = (value.substring(0, 1) === '-');
    if (negative) {
        value = value.substring(1);
    }

    if (value === '.') {
        throw new Error(
            `Invalid value ${value} cannot be converted to`
            + ` base unit with ${decimals} decimals.`
        );
    }

    // Split it into a whole and fractional part
    let comps = value.split('.');
    if (comps.length > 2) { throw new Error('Too many decimal points'); }

    let whole = comps[0]; let
        fraction = comps[1];

    if (!whole) { whole = '0'; }
    if (!fraction) { fraction = '0'; }
    if (fraction.length > decimals) {
        throw new Error('Too many decimal places');
    }

    while (fraction.length < decimals) {
        fraction += '0';
    }

    whole = new BN(whole);
    fraction = new BN(fraction);
    let wei = (whole.mul(base)).add(fraction);

    if (negative) {
        wei = wei.neg();
    }

    return new BN(wei.toString(10), 10);
}

const parseBaseUnit = (value, decimals) => {
    if (BN.isBN(value)) {
        value = value.toString()
    }
    if (!isString(value)) {
        throw new Error("Not a String")
    }
    value = BigNumber.from(value)
    return utils.formatUnits(value, decimals)
}

const advanceBlock = () => new Promise((resolve, reject) => {
    web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime()
    }, async (err, result) => {
        if (err) { return reject(err) }
        // const newBlockHash =await web3.eth.getBlock('latest').hash
        return resolve()
    })
})

const advanceBlocks = async (num) => {
    let resp = []
    for (let i = 0; i < num; i++) {
        resp.push(advanceBlock())
    }
    await Promise.all(resp)
}

contract("Exploit Testing", () => {

    let aave;
    let aaveAdd = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
    let WETH;
    let WETHAdd = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    let usdt;
    let usdtAdd = "0xdac17f958d2ee523a2206206994597c13d831ec7"
    let accounts;

    before(async () => {

        aave = truffleContract({ abi: aaveABI })
        aave.setProvider(provider);
        aave = await aave.at(aaveAdd)

        WETH = truffleContract({ abi: wethABI });
        WETH.setProvider(provider);
        WETH = await WETH.at(WETHAdd)

        usdt = truffleContract({ abi: tokenABI });
        usdt.setProvider(provider);
        usdt = await usdt.at(usdtAdd)


        exploit = await exploit.deployed()    
        flashLoan = await flashLoan.deployed()

        accounts = await web3.eth.getAccounts()
    })

    it("should deposit weth to exploit contract", async() =>{
        console.log(accounts)
        await WETH.deposit({ from: accounts[0], value: toBaseUnit("1000", 18) })
        await WETH.transfer(exploit.address, toBaseUnit("1000", 18), {from:accounts[0]});
    })

    it("exploit test", async ()=>{
        let beforeWethBal = await WETH.balanceOf(exploit.address)
        console.log({
            beforeWethBal: parseBaseUnit(beforeWethBal, "18")
        })
        await exploit.myFlashLoanCall(WETH.address, toBaseUnit("100", 18))
    })

    it("flashloan test", async ()=>{
        let beforeWethBal = await WETH.balanceOf(flashLoan.address)
        console.log({
            beforeWethBal: parseBaseUnit(beforeWethBal, "18")
        })
        await flashLoan.flashLoan(WETH.address, toBaseUnit("100", 18), usdt.address)
    })
})