const {expect} = require("chai");
const {ethers, network} = require("hardhat");

const {abi} = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json");

const provider = waffle.provider;

describe("OptimalLiquidity Contract", () => {
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const DAI_WHALE = "0x60faae176336dab62e284fe19b885b095d29fb7f";
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    let DAI_INSTANCE, DAI_AMOUNT, WETH_INSTANCE, OPTIMAL_LIQUIDITY;

    beforeEach(async () => {
        DAI_INSTANCE = new ethers.Contract(DAI, abi, provider);
        WETH_INSTANCE = new ethers.Contract(WETH, abi, provider);

        const DAI_DECIMALS = await DAI_INSTANCE.decimals();

        let dai_amount = "10000";
        DAI_AMOUNT = ethers.utils.parseUnits(dai_amount, DAI_DECIMALS);

        // contract deployment
        const optimalLiquidity = await ethers.getContractFactory("OptimalLiquidity");
        OPTIMAL_LIQUIDITY = await optimalLiquidity.deploy();
        await OPTIMAL_LIQUIDITY.deployed();
    });

    const snapshot = async () => {
        const lp = await OPTIMAL_LIQUIDITY.getPair(DAI, WETH);
        const LP_INSTANCE = new ethers.Contract(lp, abi, provider);
        return {
            lp_tokens:  await LP_INSTANCE.balanceOf(OPTIMAL_LIQUIDITY.address),
            DAI: await DAI_INSTANCE.balanceOf(OPTIMAL_LIQUIDITY.address),
            WETH: await WETH_INSTANCE.balanceOf(OPTIMAL_LIQUIDITY.address)
        }
    }
    
    it("should ensure whale has sufficient ETH", async () => {
        const DAI_WHALE_ETH = await provider.getBalance(DAI_WHALE);
        expect(DAI_WHALE_ETH).to.be.gte(ethers.utils.parseEther("1"));
    });

    it("should ensure whale has sufficient DAI", async () => {
        const whale_DAI_balance = await DAI_INSTANCE.balanceOf(DAI_WHALE);
        expect(whale_DAI_balance).to.be.gte(DAI_AMOUNT);
    });
    
    it("should deploy OptimalLiquidity contract", async () => {
        expect(OPTIMAL_LIQUIDITY.address).to.exist;
    });

    describe("Contract execution", () => {
        it("optimal swap", async () => {
            const before = await snapshot();
            console.log("before.lp_tokens: ", before.lp_tokens.toString());
            console.log("before.DAI: ", before.DAI.toString());
            console.log("before.WETH: ", before.WETH.toString());

            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [DAI_WHALE],
            });
            const dai_whale_signer = await ethers.getSigner(DAI_WHALE);
            await DAI_INSTANCE.connect(dai_whale_signer).approve(OPTIMAL_LIQUIDITY.address, DAI_AMOUNT);

            await OPTIMAL_LIQUIDITY.connect(dai_whale_signer).optimalAddLiquidity(DAI, WETH, DAI_AMOUNT);

            await network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [DAI_WHALE],
            });

            const after = await snapshot();
            console.log("\nafter.lp_tokens: ", after.lp_tokens.toString());
            console.log("after.DAI: ", after.DAI.toString());
            console.log("after.WETH: ", after.WETH.toString());
        });

        it("sub-optimal swap", async () => {
            const before = await snapshot();
            console.log("before.lp_tokens: ", before.lp_tokens.toString());
            console.log("before.DAI: ", before.DAI.toString());
            console.log("before.WETH: ", before.WETH.toString());

            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [DAI_WHALE],
            });
            const dai_whale_signer = await ethers.getSigner(DAI_WHALE);
            await DAI_INSTANCE.connect(dai_whale_signer).approve(OPTIMAL_LIQUIDITY.address, DAI_AMOUNT);

            await OPTIMAL_LIQUIDITY.connect(dai_whale_signer).subOptimalAddLiquidity(DAI, WETH, DAI_AMOUNT);

            await network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [DAI_WHALE],
            });

            const after = await snapshot();
            console.log("\nafter.lp_tokens: ", after.lp_tokens.toString());
            console.log("after.DAI: ", after.DAI.toString());
            console.log("after.WETH: ", after.WETH.toString());
        });
    });
});