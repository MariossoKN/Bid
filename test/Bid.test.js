const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers } = require("hardhat")
const { networkConfig } = require("../helper.hardhat.config")

describe("Bid", async function () {
    let deployer,
        bid,
        startingBidPrice,
        bidPrice,
        zeroAddress,
        bidPriceLowerThenStartingBidPrice,
        bidPriceLowerThenHighestBidPrice,
        bidPriceHigherThenHighestBidPrice
    const chainId = network.config.chainId

    beforeEach(async () => {
        const accounts = await ethers.getSigners()
        deployer = accounts[0]
        bidder1 = accounts[1]
        bidder2 = accounts[2]
        await deployments.fixture(["all"])
        bid = await ethers.getContract("Bid", deployer)
        startingBidPrice = ethers.parseEther("0.1")
        bidPrice = ethers.parseEther("1")
        bidPriceLowerThenStartingBidPrice = ethers.parseEther("0.05")
        bidPriceLowerThenHighestBidPrice = ethers.parseEther("0.5")
        bidPriceHigherThenHighestBidPrice = ethers.parseEther("2")
        zeroAddress = "0x0000000000000000000000000000000000000000"
    })
    describe("constructor", function () {
        it("Sets nft contract correctly", async function () {
            const name = await bid.name()
            const symbol = await bid.symbol()
            const owner = await bid.owner()
            assert.equal(name, "Prize")
            assert.equal(symbol, "PRZ")
            assert.equal(owner, deployer.address)
            console.log(`Contract name: ${name}`)
            console.log(`Contract symbol: ${symbol}`)
            console.log(`Contract owner: ${owner}`)
        })
    })
    describe("createPrize", function () {
        it("Can be called only by owner", async function () {
            await expect(
                bid.connect(bidder1).createPrize("Prize", startingBidPrice),
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("Should revert if the name is empty", async function () {
            // call the createPrize function with an empty name
            // await bid.connect(deployer).createPrize("", startingBidPrice)
            await expect(bid.connect(deployer).createPrize("", startingBidPrice)).to.be.reverted
            // await expect(
            //     bid.connect(deployer).createPrize("", startingBidPrice),
            // ).to.be.revertedWithCustomError(bid, "Bid__NameCannotBeEmpty")
        })
        it("Should revert if the bid price is 0", async function () {
            // call the createPrize function with a bid price of 0
            await expect(bid.connect(deployer).createPrize("Prize", 0)).to.be.reverted
            // await expect(
            //     bid.connect(deployer).createPrize("Prize", 0),
            // ).to.be.revertedWithCustomError(bid, "Bid__StartingBidPriceMustBeGreaterThanZero")
        })
        it("#1 Should revert if there is an ongoin bid (one prize)", async function () {
            // create a prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            // try to create an other prize
            // await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await expect(bid.connect(deployer).createPrize("Prize", startingBidPrice)).to.be
                .reverted
            // await expect(
            //     bid.connect(deployer).createPrize("Prize", startingBidPrice),
            // ).to.be.revertedWithCustomError(bid, "Bid__ThereIsAlreadyAnOngoingBid")
        })
        it("#2 Should revert if there is an ongoin bid (multiple prizes)", async function () {
            // create a prize and bid on it
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the previous prize and reate a new prize and bid on it
            await bid.connect(deployer).closeBid("1")
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            // try to create an other prize
            // await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await expect(bid.connect(deployer).createPrize("Prize", startingBidPrice)).to.be
                .reverted
            // await expect(
            //     bid.connect(deployer).createPrize("Prize", startingBidPrice),
            // ).to.be.revertedWithCustomError(bid, "Bid__ThereIsAlreadyAnOngoingBid")
        })
        it("Should create a new prize with tokenId and correct data", async function () {
            // create a prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            // check if the data is correct
            assert.equal(await bid.connect(deployer).getNameOfThePrize("1"), "Prize")
            assert.equal(await bid.getStartingPrice("1"), startingBidPrice)
            assert.equal(await bid.getHighestBid("1"), "0")
            assert.equal(await bid.getHighestBidder("1"), zeroAddress)
            assert.equal(await bid.getSoldStatus("1"), false)
            assert.equal(await bid.getClaimStatus("1"), false)
            assert.equal(await bid.getWinner("1"), zeroAddress)
            assert.equal(await bid.getCancelStatus("1"), false)
        })
        it("#1 Should mint a prize NFT to the bid contract - one project)", async function () {
            // check if the amount of NFTs is 0
            assert.equal(await bid.connect(deployer).balanceOf(bid.target), "0")
            // create a prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            // check if the owner is the bid contract
            const owner = await bid.connect(deployer).ownerOf("1")
            assert.equal(owner, bid.target)
            // check if the amount of NFTs is 1
            assert.equal(await bid.connect(deployer).balanceOf(bid.target), "1")
        })
        it("#2 Should mint a prize NFT to the bid contract - multiple projects)", async function () {
            // create a prize
            await bid.connect(deployer).createPrize("Car", startingBidPrice)
            // check if the owner is the bid contract
            const owner = await bid.connect(deployer).ownerOf("1")
            assert.equal(owner, bid.target)
            // check if the amount of NFTs is 1
            assert.equal(await bid.connect(deployer).balanceOf(bid.target), "1")
            // close the current prize
            await bid.connect(deployer).cancelBid("1")
            // create a new prize
            await bid.connect(deployer).createPrize("NFT art", startingBidPrice)
            // check if the owner is the bid contract
            const owner2 = await bid.connect(deployer).ownerOf("2")
            assert.equal(owner2, bid.target)
            // check if the amount of NFTs is 2
            assert.equal(await bid.connect(deployer).balanceOf(bid.target), "2")
        })
    })
    describe("bid", function () {
        it("Should revert if the prizeId doesnt exists (not existing token)", async function () {
            // bid on a non existing prize
            // await bid.bid("1", bidPrice)
            await expect(bid.connect(bidder1).bid("1", bidPrice)).to.be.reverted
            // await expect(bid.connect(bidder1).bid("1", bidPrice)).to.be.revertedWithCustomError(
            //     bid,
            //     "Bid__ThisPrizeIdDoesNotExistOrItsSoldOrCanceled",
            // )
        })
        it("Should revert if the prize is already closed", async function () {
            // create and bid on a prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // try to bid on the already closed prize
            // await bid.bid("1", bidPriceHigherThenHighestBidPrice)
            await expect(bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)).to.be
                .reverted
            // await expect(
            //     bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice),
            // ).to.be.revertedWithCustomError(bid, "Bid__ThisPrizeIdDoesNotExistOrItsSoldOrCanceled")
        })
        it("#1 Should revert if the cancel status is true (without bid)", async function () {
            // create and cancel the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(deployer).cancelBid("1")
            // try to bid on canceled prize
            // await bid.bid("1", bidPrice)
            await expect(bid.connect(bidder1).bid("1", bidPrice)).to.be.reverted
            // await expect(
            //     bid.connect(bidder2).bid("1", bidPrice),
            // ).to.be.revertedWithCustomError(bid, "Bid__ThisPrizeIdDoesNotExistOrItsSoldOrCanceled")
        })
        it("#2 Should revert if the cancel status is true (with bid)", async function () {
            // create and bi on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // cancel the bid
            await bid.connect(deployer).cancelBid("1")
            // try to bid on canceled prize
            // await bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)
            await expect(bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)).to.be
                .reverted
            // await expect(bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)).to.be
            // .revertedWithCustomError(bid, "Bid__ThisPrizeIdDoesNotExistOrItsSoldOrCanceled")
        })
        it("Should revert if the bidPrice is lower then startingBidPrice", async function () {
            // create a prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            // try to bid on the prize with a lower bid price then the starting bid price
            // await bid.connect(bidder1).bid("1", bidPriceLowerThenStartingBidPrice)
            await expect(bid.connect(bidder1).bid("1", bidPriceLowerThenStartingBidPrice)).to.be
                .reverted
            // await expect(
            //     bid.connect(bidder2).bid("1", bidPriceLowerThenStartingBidPrice),
            // ).to.be.revertedWithCustomError(bid, "Bid__BidIsTooLow")
        })
        it("Should revert if the bidPrice is less then highestBid", async function () {
            // create and bid on a prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // try to bid on the prize with a lower bid price then the starting bid price
            // await bid.connect(bidder2).bid("1", bidPriceLowerThenHighestBidPrice)
            await expect(bid.connect(bidder2).bid("1", bidPriceLowerThenHighestBidPrice)).to.be
                .reverted
            // await expect(bid.connect(bidder2).bid("1", bidPriceLowerThenHighestBidPrice)).to.be
            // .revertedWithCustomError(bid, "Bid__BidIsTooLow")
        })
        it("#1 Should create a new highest bid on the prize (with one bid)", async function () {
            // create and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // check if the bid and the bidder is correct
            assert.equal(await bid.getHighestBid("1"), bidPrice)
            assert.equal(await bid.getHighestBidder("1"), bidder1.address)
        })
        it("#2 Should create a new highest bid on the prize (with multiple bids)", async function () {
            // create and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            await bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)
            // check if the bid and the bidder is correct
            assert.equal(await bid.getHighestBid("1"), bidPriceHigherThenHighestBidPrice)
            assert.equal(await bid.getHighestBidder("1"), bidder2.address)
        })
    })
    describe("claimPrize", function () {
        it("Should revert if called by not the winner", async function () {
            // create and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // try to claim the prize as not the winner
            await expect(bid.connect(deployer).claimPrize("1")).to.be.reverted
            await expect(bid.connect(bidder2).claimPrize("1")).to.be.reverted
        })
        it("#1 Should revert if not enough eth is sent (with one bid)", async function () {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // try to claim the prize with not enough eth sent
            // await bid.connect(bidder1).claimPrize("1", { value: bidPriceLowerThenHighestBidPrice })
            await expect(
                bid.connect(bidder1).claimPrize("1", { value: bidPriceLowerThenHighestBidPrice }),
            ).to.be.reverted
            // await expect(
            //     bid.connect(bidder1).claimPrize("1", { value: bidPriceLowerThenHighestBidPrice }),
            // ).to.be.revertedWithCustomError(bid, "Bid__NotEnoughEthSent")
        })
        it("#2 Should revert if not enough eth is sent (with multiple bids)", async function () {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            await bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // try to claim the prize with not enough eth sent
            // await bid.connect(bidder2).claimPrize("1", { value: bidPriceLowerThenHighestBidPrice })
            await expect(
                bid.connect(bidder2).claimPrize("1", { value: bidPriceLowerThenHighestBidPrice }),
            ).to.be.reverted
            // await expect(
            //     bid.connect(bidder2).claimPrize("1", { value: bidPriceLowerThenHighestBidPrice }),
            // ).to.be.revertedWithCustomError(bid, "Bid__NotEnoughEthSent")
        })
        it("Should revert if the prize is already claimed", async function () {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // claim the prize
            await bid.connect(bidder1).claimPrize("1", { value: bidPrice })
            // try to claim the prize again
            // await bid.connect(bidder1).claimPrize("1", { value: bidPrice })
            await expect(bid.connect(bidder1).claimPrize("1", { value: bidPrice })).to.be.reverted
            // await expect(
            //     bid.connect(bidder1).claimPrize("1", { value: bidPrice }),
            // ).to.be.revertedWithCustomError(bid, "Bid__PrizeAlreadyClaimed")
        })
        it("#1 Should revert if the prize is canceled (with one bid)", async function () {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid to set the winner
            await bid.connect(deployer).closeBid("1")
            // cancel the current bid
            await bid.connect(deployer).cancelBid("1")
            // try to claim the canceled prize
            // await bid.connect(bidder1).claimPrize("1", { value: bidPrice })
            await expect(bid.connect(bidder1).claimPrize("1", { value: bidPrice })).to.be.reverted
            // await expect(
            //     bid.connect(bidder1).claimPrize("1", { value: bidPrice }),
            // ).to.be.revertedWithCustomError(bid, "Bid__PrizeCanceled")
        })
        it("#2 Should revert if the prize is canceled (with multiple bids)", async function () {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            await bid.connect(bidder2).bid("1", bidPriceHigherThenHighestBidPrice)
            // close the current bid to set the winner
            await bid.connect(deployer).closeBid("1")
            // cancel the current bid
            await bid.connect(deployer).cancelBid("1")
            // try to claim the canceled prize
            // await bid.connect(bidder2).claimPrize("1", { value: bidPriceHigherThenHighestBidPrice })
            await expect(
                bid.connect(bidder2).claimPrize("1", { value: bidPriceHigherThenHighestBidPrice }),
            ).to.be.reverted
            // await expect(
            //     bid.connect(bidder2).claimPrize("1", { value: bidPriceHigherThenHighestBidPrice }),
            // ).to.be.revertedWithCustomError(bid, "Bid__PrizeCanceled")
        })
        it("Should send the prize nft to the winner and set claimed to true", async function () {
            // check if the balance of the bidder is 0
            assert.equal(await bid.connect(deployer).balanceOf(bidder1), "0")
            // check if the claim status is false
            assert.equal(await bid.getClaimStatus("1"), false)
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // claim the prize
            await bid.connect(bidder1).claimPrize("1", { value: bidPrice })
            // check if the balance of the bidder is 1
            assert.equal(await bid.connect(deployer).balanceOf(bidder1), "1")
            // check if the claim status is true
            assert.equal(await bid.getClaimStatus("1"), true)
        })
    })
    describe("closeBid", function () {
        it("Should revert if there is not bid on the prize", async function () {
            // create prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            // try to close the bid without any bid
            // await bid.connect(deployer).closeBid("1")
            await expect(bid.connect(deployer).closeBid("1")).to.be.reverted
            // await expect(bid.connect(deployer).closeBid("1")).to.be.revertedWithCustomError(
            //     bid,
            //     "Bid__ThereIsNoBidOnThisPrize",
            // )
        })
        it("Should revert if cancel status is true", async function () {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // cancel the current bid
            await bid.connect(deployer).cancelBid("1")
            // try to close the canceled bid
            // await bid.connect(deployer).closeBid("1")
            await expect(bid.connect(deployer).closeBid("1")).to.be.reverted
            // await expect(bid.connect(deployer).closeBid("1")).to.be.revertedWithCustomError(
            //     bid,
            //     "Bid__PrizeCanceled",
            // )
        })
        it("Should set the status of sold to true", async function () {
            // check if the sold status is false
            assert.equal(await bid.getSoldStatus("1"), false)
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // check if the sold status is true
            assert.equal(await bid.getSoldStatus("1"), true)
        })
        it("Should set the winner to the highestBidder address", async function () {
            // check if the winner is zero address
            assert.equal(await bid.getWinner("1"), zeroAddress)
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // check if the winner is bidder1
            assert.equal(await bid.getWinner("1"), bidder1.address)
            assert.equal(await bid.getWinner("1"), await bid.getHighestBidder("1"))
        })
    })
    describe("cancelBid", function () {
        it("Should revert if called by not owner", async function () {
            // try to call the cancelBid function as not owner
            await expect(bid.connect(bidder1).cancelBid("1")).to.be.reverted
            await expect(bid.connect(bidder2).cancelBid("1")).to.be.reverted
        })
        it("Should change the canceled status to true", async function () {
            // check if the canceled status is false
            assert.equal(await bid.getCancelStatus("1"), false)
            // cancle the prize
            await bid.connect(deployer).cancelBid("1")
            // check if the canceled status is true
            assert.equal(await bid.getCancelStatus("1"), true)
        })
    })
    describe("withdraw", function () {
        beforeEach(async () => {
            // create prize and bid on the prize
            await bid.connect(deployer).createPrize("Prize", startingBidPrice)
            await bid.connect(bidder1).bid("1", bidPrice)
            // close the current bid
            await bid.connect(deployer).closeBid("1")
            // claim the prize
            await bid.connect(bidder1).claimPrize("1", { value: bidPrice })
        })
        it("Can only be called by the owner (deployer)", async function () {
            // try to call the withdraw function as not owner
            await expect(bid.connect(bidder1).withdraw()).to.be.reverted
            await expect(bid.connect(bidder2).withdraw()).to.be.reverted
        })
        it("Witdraws all eth from contract to owner", async function () {
            // check the balances of the deployer and bid contract before withdraw
            const contractStartingBalance = await ethers.provider.getBalance(bid.target)
            const deployerStartingBalance = await ethers.provider.getBalance(deployer.address)
            // console.log(`Deployers starting balance: ${deployerStartingBalance}`)
            // console.log(`Contract starting balance: ${contractStartingBalance}`)
            // calculate the gas cost
            const txResponse = await bid.connect(deployer).withdraw()
            const txReceipt = await txResponse.wait(1)
            const { gasUsed, gasPrice } = txReceipt
            const gasCost = Number(gasUsed) * Number(gasPrice)
            // check the balances of the deployer and bid contract after withdraw
            const contractEndingBalance = await ethers.provider.getBalance(bid.target)
            const deployerEndingBalance = await ethers.provider.getBalance(deployer.address)
            // check if the balances are correct
            assert.equal(contractEndingBalance.toString(), "0")
            assert.equal(
                BigInt(deployerStartingBalance) + BigInt(contractStartingBalance),
                BigInt(deployerEndingBalance) + BigInt(gasCost),
            )
            // console.log(`Deployers ending balance: ${deployerEndingBalance}`)
            // console.log(`Contract ending balance: ${contractEndingBalance}`)
        })
    })
})
