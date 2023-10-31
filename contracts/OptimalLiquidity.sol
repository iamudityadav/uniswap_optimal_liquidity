// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Router.sol";

contract OptimalLiquidity {
    address private constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address private constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    function sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function getSwapAmount(uint256 r, uint256 a) private pure returns (uint256) {
        return (sqrt(r*((3988009*r) + (3988000*a))) - (1997*r)) / 1994;
    }

    function optimalAddLiquidity(address _tokenA, address _tokenB, uint256 _amountA) external {
        require(_tokenA == WETH || _tokenB == WETH, "One of the tokens must be WETH.");

        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);

        address liquidity_pool = IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(_tokenA, _tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(liquidity_pool).getReserves();

        uint256 swapAmount;
        if(IUniswapV2Pair(liquidity_pool).token0() == _tokenA) {
            swapAmount = getSwapAmount(reserve0, _amountA);
        } else {
            swapAmount = getSwapAmount(reserve1, _amountA);
        }

        _swap(_tokenA, _tokenB, swapAmount);
        _addLiquidity(_tokenA, _tokenB);
    }

    function subOptimalAddLiquidity(address _tokenA, address _tokenB, uint256 _amountA) external {
        require(_tokenA == WETH || _tokenB == WETH, "One of the tokens must be WETH.");

        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);

        _swap(_tokenA, _tokenB, _amountA/2);
        _addLiquidity(_tokenA, _tokenB);
    }

    function _swap(address _tokenIn, address _tokenOut, uint256 _amount) private {
        IERC20(_tokenIn).approve(UNISWAP_V2_ROUTER, _amount);

        address[] memory path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;

        IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            _amount,
            1,
            path, 
            address(this),
            block.timestamp
        );
    }

    function _addLiquidity(address _tokenA, address _tokenB) private {
        uint256 balanceA = IERC20(_tokenA).balanceOf(address(this));
        uint256 balanceB = IERC20(_tokenB).balanceOf(address(this));

        IERC20(_tokenA).approve(UNISWAP_V2_ROUTER, balanceA);
        IERC20(_tokenB).approve(UNISWAP_V2_ROUTER, balanceB);

        IUniswapV2Router(UNISWAP_V2_ROUTER).addLiquidity(
            _tokenA, 
            _tokenB, 
            balanceA, 
            balanceB, 
            1, 
            1, 
            address(this),
            block.timestamp
        );
    }

    function getPair(address _tokenA, address _tokenB) external view returns (address) {
        return IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(_tokenA, _tokenB);
    }
}