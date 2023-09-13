// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.18;

/**
 * @title Bid
 * @author: Mariosso
 * @notice This smart contract allows the deployer to create prizes in a form of NFTs and lets bidder bid on
 * them with ETH. Prizes are created with a name and starting bid price. Bidders can then place bids on this
 * prize, and the bidder with the highest bid wins the prize when the auction closes. Winner can then claim
 * the prize they won by sending the bid amount in ETH. The owner of the contract can manage the auctions,
 * including closing and canceling them. There can only be one ongoing auction at a time.
 * Deployer can withdraw the ETH sent to the contract.
 */

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721URIStorage, ERC721, IERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract Bid is ERC721URIStorage, Ownable {
    /////////
    // Errors
    /////////
    error Bid__StartingBidPriceMustBeGreaterThanZero();
    error Bid__NameCannotBeEmpty();
    error Bid__ThisPrizeIdDoesNotExistOrItsSoldOrCanceled();
    error Bid__BidIsTooLow();
    error Bid__YouAreNotTheWinner();
    error Bid__NotEnoughEthSent(uint256);
    error Bid__ThereIsAlreadyAnOngoingBid();
    error Bid__ThereIsNoBidOnThisPrize();
    error Bid__PrizeAlreadyClaimed();
    error Bid__PrizeCanceled();

    //////////////////
    // State variables
    //////////////////
    struct Prize {
        string name;
        uint256 startingBidPrice;
        uint256 highestBid;
        address highestBidder;
        bool sold;
        bool claimed;
        address winner;
        bool canceled;
    }

    uint256 private prizeIds = 0;
    mapping(uint256 prizeId => Prize prize) private prizes;

    ////////////
    // Functions
    ////////////
    constructor() ERC721("Prize", "PRZ") {}

    // creates a prize with a name and starting bid price. There can be only one ongoin prize bid at the moment (only owner)
    function createPrize(string memory _name, uint256 _startingBidPrice) external onlyOwner {
        if (bytes(_name).length == 0) {
            revert Bid__NameCannotBeEmpty();
        }
        if (_startingBidPrice == 0) {
            revert Bid__StartingBidPriceMustBeGreaterThanZero();
        }
        if (prizeIds > 0) {
            require(
                prizes[prizeIds].sold == true || prizes[prizeIds].canceled == true,
                "Bid__ThereIsAlreadyAnOngoingBid"
            );
        }

        prizeIds++;
        prizes[prizeIds] = Prize(
            _name,
            _startingBidPrice,
            0,
            address(0),
            false,
            false,
            address(0),
            false
        );
        _mint(address(this), prizeIds);
    }

    // bids on the current prize. The bid price must be greater then the starting bid price and the highest bid price
    function bid(uint256 _prizeId, uint256 _bidPrice) public {
        if (
            _exists(_prizeId) == false ||
            prizes[_prizeId].sold == true ||
            prizes[_prizeId].canceled == true
        ) {
            revert Bid__ThisPrizeIdDoesNotExistOrItsSoldOrCanceled();
        }
        if (
            _bidPrice <= prizes[_prizeId].startingBidPrice ||
            _bidPrice <= prizes[_prizeId].highestBid
        ) {
            revert Bid__BidIsTooLow();
        }
        prizes[_prizeId].highestBid = _bidPrice;
        prizes[_prizeId].highestBidder = msg.sender;
    }

    // claim the prize, only can be called by the winner and they must send eth equal to their highest bid
    function claimPrize(uint256 _prizeId) public payable {
        if (msg.sender != prizes[_prizeId].winner) {
            revert Bid__YouAreNotTheWinner();
        }
        uint256 bidAmount = prizes[_prizeId].highestBid;
        if (msg.value < bidAmount) {
            revert Bid__NotEnoughEthSent(bidAmount);
        }
        if (prizes[_prizeId].claimed == true) {
            revert Bid__PrizeAlreadyClaimed();
        }
        if (prizes[_prizeId].canceled == true) {
            revert Bid__PrizeCanceled();
        }

        prizes[_prizeId].claimed = true;
        IERC721(address(this)).safeTransferFrom(ownerOf(_prizeId), msg.sender, _prizeId);
    }

    // closes the ongoing bid and sets the highest bidder as winner (only owner)
    function closeBid(uint256 _prizeId) external onlyOwner {
        if (prizes[_prizeId].highestBid == 0) {
            revert Bid__ThereIsNoBidOnThisPrize();
        }
        if (prizes[_prizeId].canceled == true) {
            revert Bid__PrizeCanceled();
        }
        prizes[_prizeId].sold = true;
        prizes[_prizeId].winner = prizes[_prizeId].highestBidder;
    }

    // cancels the ongoing bid (only owner)
    function cancelBid(uint256 _prizeId) external onlyOwner {
        prizes[_prizeId].canceled = true;
    }

    // withdraws eth (only owner)
    function withdraw() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    ///////////////////
    // Getter functions
    ///////////////////

    function getNameOfThePrize(uint256 _prizeId) public view returns (string memory) {
        return prizes[_prizeId].name;
    }

    function getStartingPrice(uint256 _prizeId) public view returns (uint256) {
        return prizes[_prizeId].startingBidPrice;
    }

    function getHighestBid(uint256 _prizeId) public view returns (uint256) {
        return prizes[_prizeId].highestBid;
    }

    function getHighestBidder(uint256 _prizeId) public view returns (address) {
        return prizes[_prizeId].highestBidder;
    }

    function getSoldStatus(uint256 _prizeId) public view returns (bool) {
        return prizes[_prizeId].sold;
    }

    function getClaimStatus(uint256 _prizeId) public view returns (bool) {
        return prizes[_prizeId].claimed;
    }

    function getWinner(uint256 _prizeId) public view returns (address) {
        return prizes[_prizeId].winner;
    }

    function getCancelStatus(uint256 _prizeId) public view returns (bool) {
        return prizes[_prizeId].canceled;
    }
}
