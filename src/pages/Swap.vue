<template>
    <div
        v-if="swapping"
        class="page"
    >
        <div class="pair">
            <div class="header">
                <div
                    class="header-text"
                >
                    <div class="header-toggle-option header-toggle-option-selected">
                        Swap
                    </div>
                    <div
                        v-if="chainParams['kovan'].chainName.toLowerCase() == provider.network.name"
                        class="header-text-secondary header-toggle-option"
                        @click="toggleSwapping"
                    >
                        Get test tokens
                    </div>
                </div>
                <Settings />
            </div>
            <SwapPair
                v-model:address-in="assetInAddressInput"
                v-model:amount-in="assetInAmountInput"
                v-model:address-out="assetOutAddressInput"
                v-model:amount-out="assetOutAmountInput"
                v-model:is-exact-in="isExactIn"
                :slippage="slippage"
                :swaps-loading="swapsLoading"
                :validation="validation"
                @change="value => {
                    handleAmountChange(value);
                }"
            />
            <SwapButton
                class="swap-button"
                :address-in="assetInAddressInput"
                :amount-in="assetInAmountInput"
                :address-out="assetOutAddressInput"
                :transaction-pending="transactionPending"
                :validation="validation"
                @unlock="unlock"
                @swap="swap"
            />
            <Routing
                :address-in="assetInAddressInput"
                :amount-in="assetInAmountInput"
                :address-out="assetOutAddressInput"
                :amount-out="assetOutAmountInput"
                :pools="pools"
                :swaps="swaps"
                class="routing"
            />
        </div>

        <ModalAssetSelector
            :open="isModalOpen"
            :hidden="[assetInAddressInput, assetOutAddressInput]"
            @select="handleAssetSelect"
        />
    </div>

    <div
        v-else
        class="page"
    >
        <div class="minting">
            <div
                class="header header-text"
            >
                <div
                    class="header-text-secondary header-toggle-option"
                    @click="toggleSwapping"
                >
                    Swap
                </div>
                <div class="header-toggle-option header-toggle-option-selected">
                    Get test tokens
                </div>
            </div>
            <AssetInput
                :address="assetMintAddress"
                :amount="assetMintAmount"
                :modal-key="'mint'"
                @change="value => {
                    handleMintAmountChange(value);
                }"
            />
            <Button
                :text="'Mint'"
                :primary="true"
                :loading="transactionPending"
                :disabled="mintButtonDisabled"
                class="swap-button"
                @click="mintToken"
            />
        </div>
        <ModalAssetSelector
            :open="isModalOpen"
            :hidden="[assetInAddressInput, assetOutAddressInput]"
            @select="handleAssetSelect"
        />
    </div>
</template>

<script lang="ts">
import { ref, defineComponent, onMounted, watch, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { useIntervalFn } from '@vueuse/core';
import BigNumber from 'bignumber.js';
import { getAddress } from '@ethersproject/address';
import { ErrorCode } from '@ethersproject/logger';
import { SOR } from '@balancer-labs/sor';
import { Swap, Pool } from '@balancer-labs/sor/dist/types';

import config from '@/config';
import provider from '@/utils/provider';
import { ETH_KEY, scale, isAddress, getEtherscanLink } from '@/utils/helpers';
import { ValidationError, SwapValidation, validateNumberInput } from '@/utils/validation';
import Storage from '@/utils/storage';
import Swapper from '@/web3/swapper';
import Helper from '@/web3/helper';
import { RootState } from '@/store';

import ModalAssetSelector from '@/components/ModalAssetSelector.vue';
import Routing from '@/components/swap/Routing.vue';
import Settings from '@/components/Settings.vue';
import SwapButton from '@/components/swap/Button.vue';
import SwapPair from '@/components/swap/Pair.vue';
import Button from '@/components/Button.vue';
import AssetInput from '@/components/AssetInput.vue';
import { setGoal } from '@/utils/fathom';
import chainParams from '@/utils/chainParams.json';

// eslint-disable-next-line no-undef
const GAS_PRICE = process.env.APP_GAS_PRICE || '100000000000';
const MAX_POOLS = 4;

interface Pair {
    assetIn: string;
    assetOut: string;
}

export default defineComponent({
    components: {
        ModalAssetSelector,
        Routing,
        Settings,
        SwapButton,
        SwapPair,
        AssetInput,
        Button,
    },
    setup() {
        let sor: SOR | undefined = undefined;

        const router = useRouter();
        const store = useStore<RootState>();

        const swapping = ref(true);

        const isExactIn = ref(true);
        const assetInAddressInput = ref('');
        const assetInAmountInput = ref('');
        const assetOutAddressInput = ref('');
        const assetOutAmountInput = ref('');
        const assetMintAddress = ref('');
        const assetMintAmount = ref('');
        const slippage = ref(0);
        const transactionPending = ref(false);
        const swapsLoading = ref(false);
        const swaps = ref<Swap[][]>([]);
        const pools = ref<Pool[]>([]);

        const isModalOpen = computed(() => store.state.ui.modal.asset.isOpen);

        const account = computed(() => {
            const { connector, address } = store.state.account;
            if (!connector || !connector.id || !address) {
                return '';
            }
            return address;
        });

        const validation = computed(() => {
            // Invalid input
            const inputError = validateNumberInput(activeInput.value);
            if (inputError === ValidationError.EMPTY) {
                return SwapValidation.EMPTY_INPUT;
            }
            if (inputError !== ValidationError.NONE) {
                return SwapValidation.INVALID_INPUT;
            }
            // No swaps
            if ((swapsLoading.value || swaps.value.length === 0) &&
                !isWrapPair(assetInAddressInput.value, assetOutAddressInput.value)
            ) {
                return SwapValidation.NO_SWAPS;
            }
            // No account
            if (!account.value) {
                return SwapValidation.NO_ACCOUNT;
            }
            // Wrong network
            const { chainId } = store.state.account;
            if (config.chainId !== chainId) {
                return SwapValidation.WRONG_NETWORK;
            }
            // Insufficient balance
            const { balances } = store.state.account;
            const metadata = store.getters['assets/metadata'];
            const assetInBalance = balances[assetInAddressInput.value];
            const assetInMetadata = metadata[assetInAddressInput.value];
            if (!assetInMetadata) {
                return SwapValidation.INSUFFICIENT_BALANCE;
            }
            const assetInDecimals = assetInMetadata.decimals;
            const assetInAmountRaw = new BigNumber(assetInAmountInput.value);
            const assetInAmount = scale(assetInAmountRaw, assetInDecimals);
            if (!assetInBalance || assetInAmount.gt(assetInBalance)) {
                return SwapValidation.INSUFFICIENT_BALANCE;
            }
            return SwapValidation.NONE;
        });

        const activeInput = computed(() => {
            if (isExactIn.value) {
                return assetInAmountInput.value;
            } else {
                return assetOutAmountInput.value;
            }
        });

        const mintAsset = computed(() => {
            const assets = store.getters['assets/metadata'];
            let asset = assets[Object.keys(assets)[0]];
            if (isAddress(assetMintAddress.value)) {
                asset = assets[assetMintAddress.value];
            }
            console.log(assets);

            return asset;
        });

        const mintButtonDisabled = computed(() => {
            return assetMintAmount.value === ''
            || assetMintAmount.value === '0'
            || transactionPending.value;
        });

        onMounted(async () => {
            const { assetIn, assetOut } = getInitialPair();
            await fetchAssetMetadata(assetIn, assetOut);
            assetInAddressInput.value = assetIn;
            assetOutAddressInput.value = assetOut;

            const assets = store.getters['assets/metadata'];
            const asset = assets[Object.keys(assets)[0]];
            assetMintAddress.value = asset.address;

            initSor();
        });

        useIntervalFn(async () => {
            if (sor) {
                console.time('[SOR] fetchPools');
                await sor.fetchPools();
                console.timeEnd('[SOR] fetchPools');
                await onAmountChange(activeInput.value);
            }
        }, 60 * 1000);

        useIntervalFn(async () => {
            const assets = Object.keys(store.getters['assets/metadata']);
            store.dispatch('account/fetchAssets', assets);
        }, 5 * 60 * 1000);

        watch(assetInAddressInput, () => {
            Storage.saveInputAsset(config.chainId, assetInAddressInput.value);
            onAmountChange(activeInput.value);
        });

        watch(assetOutAddressInput, async () => {
            Storage.saveOutputAsset(config.chainId, assetOutAddressInput.value);
            if (sor) {
                const assetOutAddress = assetOutAddressInput.value === ETH_KEY
                    ? config.addresses.weth
                    : assetOutAddressInput.value;
                await sor.setCostOutputToken(assetOutAddress);
            }
            onAmountChange(activeInput.value);
        });

        function handleAmountChange(amount: string): void {
            onAmountChange(amount);
        }

        function handleMintAmountChange(amount: string): void {
            assetMintAmount.value = amount;
        }

        function handleAssetSelect(assetAddress: string): void {
            const assetModalKey = store.state.ui.modal.asset.key;
            if (assetModalKey === 'input') {
                assetInAddressInput.value = assetAddress;
            }
            if (assetModalKey === 'output') {
                assetOutAddressInput.value = assetAddress;
            }
            if (assetModalKey === 'mint') {
                assetMintAddress.value = assetAddress;
            }
        }

        function toggleSwapping(): void {
            swapping.value = !swapping.value;
        }

        async function unlock(): Promise<void> {
            transactionPending.value = true;
            const provider = await store.getters['account/provider'];
            const assetInAddress = assetInAddressInput.value;
            const spender = config.addresses.exchangeProxy;
            const tx = await Helper.unlock(provider, assetInAddress, spender);
            setGoal('approve');
            const metadata = store.getters['assets/metadata'];
            const assetSymbol = metadata[assetInAddress].symbol;
            const text = `Unlock ${assetSymbol}`;
            await handleTransaction(tx, text);
            store.dispatch('account/fetchAssets', [ assetInAddress ]);
        }

        async function swap(): Promise<void> {
            const metadata = store.getters['assets/metadata'];
            transactionPending.value = true;
            const assetInAddress = assetInAddressInput.value;
            const assetOutAddress = assetOutAddressInput.value;
            const assetInDecimals = metadata[assetInAddress].decimals;
            const assetOutDecimals = metadata[assetOutAddress].decimals;
            const assetInAmountNumber = new BigNumber(assetInAmountInput.value);
            const assetInAmount = scale(assetInAmountNumber, assetInDecimals);
            const slippageBufferRate = Storage.getSlippage();
            const provider = await store.getters['account/provider'];
            if (isWrapPair(assetInAddress, assetOutAddress)) {
                if (assetInAddress === ETH_KEY) {
                    const tx = await Helper.wrap(provider, assetInAmount);
                    const text = 'Wrap ether';
                    await handleTransaction(tx, text);
                } else {
                    const tx = await Helper.unwrap(provider, assetInAmount);
                    const text = 'Unwrap ether';
                    await handleTransaction(tx, text);
                }
                store.dispatch('account/fetchAssets', [ config.addresses.weth ]);
                return;
            }
            const assetInSymbol = metadata[assetInAddress].symbol;
            const assetOutSymbol = metadata[assetOutAddress].symbol;
            const text = `Swap ${assetInSymbol} for ${assetOutSymbol}`;
            if (isExactIn.value) {
                const assetOutAmountNumber = new BigNumber(assetOutAmountInput.value);
                const assetOutAmount = scale(assetOutAmountNumber, assetOutDecimals);
                const minAmount = assetOutAmount.div(1 + slippageBufferRate).integerValue(BigNumber.ROUND_DOWN);
                const tx = await Swapper.swapIn(provider, swaps.value, assetInAddress, assetOutAddress, assetInAmount, minAmount);
                await handleTransaction(tx, text);
                setGoal('swapIn');
            } else {
                const assetInAmountMax = assetInAmount.times(1 + slippageBufferRate).integerValue(BigNumber.ROUND_DOWN);
                const tx = await Swapper.swapOut(provider, swaps.value, assetInAddress, assetOutAddress, assetInAmountMax);
                await handleTransaction(tx, text);
                setGoal('swapOut');
            }
            store.dispatch('account/fetchAssets', [ assetInAddress, assetOutAddress ]);
            if (sor) {
                sor.fetchPools();
                onAmountChange(activeInput.value);
            }
        }

        async function initSor(): Promise<void> {
            // const poolsUrl = `${config.subgraphBackupUrl}?timestamp=${Date.now()}`;
            const poolsUrl = '/pools';
            sor = new SOR(
                provider,
                new BigNumber(GAS_PRICE),
                MAX_POOLS,
                config.chainId,
                poolsUrl,
            );

            const assetInAddress = assetInAddressInput.value === ETH_KEY
                ? config.addresses.weth
                : assetInAddressInput.value;
            const assetOutAddress = assetOutAddressInput.value === ETH_KEY
                ? config.addresses.weth
                : assetOutAddressInput.value;
            console.time(`[SOR] setCostOutputToken: ${assetOutAddress}`);
            await sor.setCostOutputToken(assetOutAddress);
            console.timeEnd(`[SOR] setCostOutputToken: ${assetOutAddress}`);
            console.time(`[SOR] fetchFilteredPairPools: ${assetInAddress}, ${assetOutAddress}`);
            await sor.fetchFilteredPairPools(assetInAddress, assetOutAddress);
            console.timeEnd(`[SOR] fetchFilteredPairPools: ${assetInAddress}, ${assetOutAddress}`);
            await onAmountChange(activeInput.value);
            console.time('[SOR] fetchPools');
            await sor.fetchPools();
            console.timeEnd('[SOR] fetchPools');
            await onAmountChange(activeInput.value);
            pools.value = sor.onChainCache.pools;
        }

        async function onAmountChange(amount: string): Promise<void> {
            const metadata = store.getters['assets/metadata'];
            if (validateNumberInput(amount) !== ValidationError.NONE) {
                if (isExactIn.value) {
                    assetOutAmountInput.value = '';
                } else {
                    assetInAmountInput.value = '';
                }
                slippage.value = 0;
                swaps.value = [];
                return;
            }

            if (isWrapPair(assetInAddressInput.value, assetOutAddressInput.value)) {
                if (isExactIn.value) {
                    assetOutAmountInput.value = amount;
                } else {
                    assetInAmountInput.value = amount;
                }
                swaps.value = [];
                return;
            }

            const assetInAddress = assetInAddressInput.value === ETH_KEY
                ? config.addresses.weth
                : assetInAddressInput.value;
            const assetOutAddress = assetOutAddressInput.value === ETH_KEY
                ? config.addresses.weth
                : assetOutAddressInput.value;

            if (assetInAddress === assetOutAddress) {
                return;
            }

            if (!sor || !sor.hasDataForPair(assetInAddress, assetOutAddress)) {
                swapsLoading.value = true;
                return;
            }

            const assetInDecimals = metadata[assetInAddress].decimals;
            const assetOutDecimals = metadata[assetOutAddress].decimals;

            swapsLoading.value = true;
            if (isExactIn.value) {
                const assetInAmountRaw = new BigNumber(amount);
                const assetInAmount = scale(assetInAmountRaw, assetInDecimals);

                console.time(`[SOR] getSwaps ${assetInAddress} ${assetOutAddress} exactIn`);
                const [tradeSwaps, tradeAmount, spotPrice] = await sor.getSwaps(
                    assetInAddress,
                    assetOutAddress,
                    'swapExactIn',
                    assetInAmount,
                );
                console.timeEnd(`[SOR] getSwaps ${assetInAddress} ${assetOutAddress} exactIn`);
                swaps.value = tradeSwaps;
                const assetOutAmountRaw = scale(tradeAmount, -assetOutDecimals);
                const assetOutPrecision = config.precision;
                assetOutAmountInput.value = assetOutAmountRaw.toFixed(assetOutPrecision, BigNumber.ROUND_DOWN);
                if (tradeSwaps.length === 0) {
                    slippage.value = 0;
                } else {
                    const price = assetInAmount.div(tradeAmount).times('1e18');
                    const slippageNumber = price.div(spotPrice).minus(1);
                    slippage.value = slippageNumber.isNegative()
                        ? 0.00001
                        : slippageNumber.toNumber();
                }
            } else {
                const assetOutAmountRaw = new BigNumber(amount);
                const assetOutAmount = scale(assetOutAmountRaw, assetOutDecimals);

                console.time(`[SOR] getSwaps ${assetInAddress} ${assetOutAddress} exactOut`);
                const [tradeSwaps, tradeAmount, spotPrice] = await sor.getSwaps(
                    assetInAddress,
                    assetOutAddress,
                    'swapExactOut',
                    assetOutAmount,
                );
                console.timeEnd(`[SOR] getSwaps ${assetInAddress} ${assetOutAddress} exactOut`);
                swaps.value = tradeSwaps;
                const assetInAmountRaw = scale(tradeAmount, -assetInDecimals);
                const assetInPrecision = config.precision;
                assetInAmountInput.value = assetInAmountRaw.toFixed(assetInPrecision, BigNumber.ROUND_UP);

                if (tradeSwaps.length === 0) {
                    slippage.value = 0;
                } else {
                    const price = tradeAmount.div(assetOutAmount).times('1e18');
                    const slippageNumber = price.div(spotPrice).minus(1);
                    slippage.value = slippageNumber.isNegative()
                        ? 0.00001
                        : slippageNumber.toNumber();
                }
            }
            swapsLoading.value = false;
        }

        async function handleTransaction(transaction: any, text: string): Promise<void> {
            if (transaction.code) {
                transactionPending.value = false;
                if (transaction.code === ErrorCode.UNPREDICTABLE_GAS_LIMIT) {
                    store.dispatch('ui/notify', {
                        text: `${text} failed`,
                        type: 'warning',
                    });
                }
                return;
            }

            store.dispatch('account/saveTransaction', {
                transaction,
                text,
            });

            const transactionReceipt = await provider.waitForTransaction(transaction.hash, 1);
            transactionPending.value = false;
            store.dispatch('account/saveMinedTransaction', {
                receipt: transactionReceipt,
                timestamp: Date.now(),
            });

            const type = transactionReceipt.status === 1
                ? 'success'
                : 'error';
            const link = getEtherscanLink(transactionReceipt.transactionHash);
            store.dispatch('ui/notify', {
                text,
                type,
                link,
            });
        }

        async function fetchAssetMetadata(assetIn: string, assetOut: string): Promise<void> {
            const metadata = store.getters['assets/metadata'];
            const unknownAssets = [];
            if (!metadata[assetIn]) {
                unknownAssets.push(assetIn);
            }
            if (!metadata[assetOut]) {
                unknownAssets.push(assetOut);
            }
            if (unknownAssets.length === 0) {
                return;
            }
            await store.dispatch('assets/fetchMetadata', unknownAssets);
            await store.dispatch('account/fetchAssets', unknownAssets);
        }

        function getInitialPair(): Pair {
            const pair = Storage.getPair(config.chainId);
            let assetIn =
                router.currentRoute.value.params.assetIn as string ||
                pair.inputAsset;
            let assetOut =
                router.currentRoute.value.params.assetOut as string ||
                pair.outputAsset;
            if (isAddress(assetIn)) {
                assetIn = getAddress(assetIn);
            }
            if (isAddress(assetOut)) {
                assetOut = getAddress(assetOut);
            }
            return {
                assetIn,
                assetOut,
            };
        }

        function isWrapPair(assetIn: string, assetOut: string): boolean {
            if (assetIn === ETH_KEY && assetOut === config.addresses.weth) {
                return true;
            }
            if (assetOut === ETH_KEY && assetIn === config.addresses.weth) {
                return true;
            }
            return false;
        }

        async function mintToken(): Promise<void> {
            transactionPending.value = true;
            const provider = await store.getters['account/provider'];
            await Helper.mintToken(provider, assetMintAddress.value, assetMintAmount.value);
            assetMintAmount.value = '';
            transactionPending.value = false;
        }

        return {
            swapping,

            isExactIn,
            assetInAddressInput,
            assetInAmountInput,
            assetOutAddressInput,
            assetOutAmountInput,
            assetMintAddress,
            assetMintAmount,

            pools,
            swaps,
            slippage,
            validation,

            account,
            transactionPending,
            swapsLoading,
            isModalOpen,
            mintAsset,
            mintButtonDisabled,

            handleAmountChange,
            handleAssetSelect,
            handleMintAmountChange,
            unlock,
            swap,
            toggleSwapping,
            mintToken,

            chainParams,
            provider,
        };
    },
});
</script>

<style scoped>
.page {
    flex-direction: column;
}

.pair,
.minting {
    margin: 20px;
    padding: 40px 40px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: var(--border-radius-large);
    background: var(--background-secondary);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.header {
    width: 100%;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
}

.header-text {
    display: flex;

    font-size: var(--font-size-header);

    background: var(--background-control);

    border: 1px solid var(--border);
    border-radius: var(--border-radius-medium);
}

.header-toggle-option {
    padding: 5px 10px;
}

.header-toggle-option-selected {
    background: var(--background-hightlight);

    border-radius: var(--border-radius-medium);
}

.header-text-secondary {
    color: var(--text-secondary);
    text-decoration: none;
    cursor: pointer;
}

.header-text-secondary:hover {
    color: var(--text-hightlight);
}

.validation-message {
    margin-top: 16px;
    min-height: 16.5px;
    font-size: 14px;
    color: var(--error);
}

.status-label {
    margin-top: 32px;
    font-size: 14px;
}

.reimbursement-message {
    margin-top: 40px;
}

.swap-button {
    margin-top: 40px;
    width: 100%;
}

.routing {
    max-width: 385px;
    margin-top: 40px;
}

@media only screen and (max-width: 768px) {
    .pair {
        margin: 0;
        padding: 16px 8px;
        border: none;
        background: transparent;
        box-shadow: none;
    }

    .routing {
        max-width: initial;
        width: 100%;
    }
}
</style>
