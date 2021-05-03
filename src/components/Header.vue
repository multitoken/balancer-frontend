<template>
    <div class="header">
        <div class="header-left">
            <router-link
                class="brand"
                :to="'/'"
            >
                <Icon
                    class="logo"
                    :title="'brand'"
                />
                <span class="title">Multitoken</span>
                <span class="alpha-warning">Alpha</span>
            </router-link>
            <a
                v-if="isDev"
                :href="commitLink"
                target="_blank"
                class="commit-label"
            >
                <div>
                    #{{ commitLabel }}
                </div>
            </a>
            <div class="page-links">
                <div
                    class="link active"
                >
                    Trade
                </div>
                <a
                    class="link"
                    href="https://etfs.multitoken.com/"
                    target="_blank"
                >
                    ETFs
                </a>
            </div>
        </div>
        <div class="header-middle">
            <span v-text="networkName" />
        </div>
        <div class="header-right">
            <Icon
                class="mode-icon"
                :title="modeLogo"
                @click="toggleMode"
            />
            <Account class="account" />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, capitalize } from 'vue';

import Storage from '@/utils/storage';

import Account from '@/components/Account.vue';
import Icon from '@/components/Icon.vue';
import config from '@/config';
import provider from '@/utils/provider';

export default defineComponent({
    components: {
        Account,
        Icon,
    },
    setup() {
        // eslint-disable-next-line no-undef
        const isDev = ref(process.env.APP_ENV === 'dev');
        // eslint-disable-next-line no-undef
        const commit = ref(process.env.APP_COMMIT || '');
        const commitLabel = computed(() => commit.value.substr(0, 6));
        const commitLink = computed(() => 
            `https://github.com/multitoken/balancer-frontend/commit/${commit.value}`,
        );

        const chainParams = {
            mainnet: {
                chainId: '0x1',
                chainName: 'Ethereum',
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                },
                rpcUrls: ['https://mainnet.infura.io/v3'],
                blockExplorerUrls: ['https://etherscan.io'],
            },
            kovan: {
                chainId: '0x2a',
                chainName: 'Kovan',
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                },
                rpcUrls: ['https://kovan.infura.io/v3'],
                blockExplorerUrls: ['https://kovan.etherscan.io'],
            },
            fantom: {
                chainId: '0xfa',
                chainName: 'Fantom',
                nativeCurrency: {
                    name: 'Fantom',
                    symbol: 'FTM',
                    decimals: 18,
                },
                rpcUrls: ['https://rpcapi.fantom.network'],
                blockExplorerUrls: ['https://ftmscan.com'],
            },
            bsc: {
                chainId: '0x38',
                chainName: 'BSC',
                nativeCurrency: {
                    name: 'Binance Coin',
                    symbol: 'BNB',
                    decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org'],
                blockExplorerUrls: ['https://bscscan.com'],
            },
            matic: {
                chainId: '0x89',
                chainName: 'Matic',
                nativeCurrency: {
                    name: 'Matic',
                    symbol: 'MATIC',
                    decimals: 18,
                },
                rpcUrls: ['https://rpc-mainnet.maticvigil.com'],
                blockExplorerUrls: ['https://explorer-mainnet.maticvigil.com'],
            },
            heco: {
                chainId: '0x80',
                chainName: 'Heco',
                nativeCurrency: {
                    name: 'Heco Token',
                    symbol: 'HT',
                    decimals: 18,
                },
                rpcUrls: ['https://http-mainnet.hecochain.com'],
                blockExplorerUrls: ['https://hecoinfo.com'],
            },
            xdai: {
                chainId: '0x64',
                chainName: 'xDai',
                nativeCurrency: {
                    name: 'xDai Token',
                    symbol: 'xDai',
                    decimals: 18,
                },
                rpcUrls: ['https://rpc.xdaichain.com'],
                blockExplorerUrls: ['https://blockscout.com/poa/xdai'],
            },
            harmony: {
                chainId: '0x63564C40',
                chainName: 'Harmony One',
                nativeCurrency: {
                    name: 'One Token',
                    symbol: 'ONE',
                    decimals: 18,
                },
                rpcUrls: ['https://api.s0.t.hmny.io'],
                blockExplorerUrls: ['https://explorer.harmony.one/'],
            },
        };

        const mode = ref(Storage.isDarkmode());
        const modeLogo = computed(() => getLogo(mode.value));
        const networkName = computed(() => {
            console.log(provider);
            console.log(window.ethereum);
            if (chainParams['kovan'].chainId !== provider.network.name) {
                return 'Please select Kovan network in Metamask';
            } else {
                return `${capitalize(config.network)} network`;
            }
        });

        function toggleMode(): void {
            mode.value = Storage.toggleMode();
            if (mode.value) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }

        function getLogo(isDarkmode: boolean): string {
            return isDarkmode ? 'moon' : 'sun';
        }

        return {
            isDev,
            commitLabel,
            commitLink,

            modeLogo,
            networkName,

            toggleMode,
        };
    },
});
</script>

<style scoped>
.header {
    height: 80px;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--background-primary);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid var(--border);
}

.header-left {
    display: flex;
    align-items: center;
}

.header-middle {
    position: absolute;
    left: calc(50% - 60px);
    
    width: 120px;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    text-align: center;

    color: #ffa600;
}

.header-right {
    display: flex;
    align-items: center;
}

a {
    text-decoration: none;
    color: var(--text-primary);
}

.brand {
    margin-left: 20px;
    display: flex;
    align-items: center;
}

.logo {
    width: 50px;
}

.title {
    margin-left: 12px;
    font-size: var(--font-size-large);
}

.alpha-warning {
    position: relative;

    top: -10px;

    font-size: var(--font-size-small);
    color: #f00;
}

.commit-label {
    margin-left: 8px;
    font-size: var(--font-size-small);
    color: var(--text-secondary);
}

.page-links {
    display: flex;
    align-items: flex-end;
    margin-left: 48px;
}

.link {
    margin-right: 20px;
    color: var(--text-secondary);
    cursor: pointer;
}

.link.active {
    color: var(--text-primary);
}

.mode-icon {
    height: 24px;
    width: 24px;
    cursor: pointer;
}

.account {
    margin: 0 16px;
}

@media only screen and (max-width: 768px) {
    .header-middle {
        left: 70px;
    }

    .brand {
        margin-left: 16px;
    }

    .title,
    .commit-label,
    .link {
        display: none;
    }
}

@media (max-width: 416px) {
    .header-middle {
        position: absolute;
        bottom: 180px;
        right: 20px;
        left: unset;
    }
}
</style>
