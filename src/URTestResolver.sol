// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IExtendedResolver} from "@ens/resolvers/profiles/IExtendedResolver.sol";
import {IAddressResolver} from "@ens/resolvers/profiles/IAddressResolver.sol";
import {IAddrResolver} from "@ens/resolvers/profiles/IAddrResolver.sol";
import {ITextResolver} from "@ens/resolvers/profiles/ITextResolver.sol";
import {ENSIP19, COIN_TYPE_ETH} from "@ens/utils/ENSIP19.sol";

interface IProxy {
    function implementation() external view returns (address);
}

/// @dev ENS resolver that returns different values if it's called from the Universal Resolver for integration testing.
contract URTestResolver is
    IExtendedResolver,
    IAddressResolver,
    IAddrResolver,
    ITextResolver
{
    error UnreachableResolverProfile(bytes4);

    address public immutable UR;

    constructor(address ur) {
        UR = ur;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external view returns (bool) {
        return
            msg.sender == IProxy(UR).implementation()
                ? interfaceId == type(IExtendedResolver).interfaceId
                : (interfaceId == type(IAddressResolver).interfaceId ||
                    interfaceId == type(IAddrResolver).interfaceId ||
                    interfaceId == type(ITextResolver).interfaceId);
    }

    function addr(bytes32) public view returns (address payable) {
        return payable(_addr());
    }

    function addr(
        bytes32,
        uint256 coinType
    ) external view returns (bytes memory) {
        if (ENSIP19.isEVMCoinType(coinType)) {
            return abi.encodePacked(_addr());
        } else {
            return new bytes(0);
        }
    }

    function text(
        bytes32,
        string calldata key
    ) external view returns (string memory) {
        if (keccak256(bytes(key)) == keccak256(bytes("description"))) {
            if (msg.sender == address(this)) {
                return unicode"✅️ Universal Resolver";
            } else {
                return unicode"❌️ Universal Resolver";
            }
        } else {
            return "";
        }
    }

    function resolve(
        bytes calldata,
        bytes calldata data
    ) external view returns (bytes memory) {
        (bool ok, bytes memory v) = address(this).staticcall(data);
        if (ok) {
            return v;
        } else {
            revert UnreachableResolverProfile(bytes4(data));
        }
    }

    function _addr() internal view returns (address) {
        return
            msg.sender == address(this)
                ? 0x2222222222222222222222222222222222222222
                : 0x1111111111111111111111111111111111111111;
    }
}
