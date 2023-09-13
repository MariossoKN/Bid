const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper.hardhat.config")
const { verify } = require("../utils/verify")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    // const cap = networkConfig[chainId]["cap"]
    const bid = await deploy("Bid", {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(bid.address, args)
    }
    console.log("---------------------------------------------")
    console.log(`Contract address: ${bid.address}`)
    console.log("---------------------------------------------")
}

module.exports.tags = ["all", "bid"]
