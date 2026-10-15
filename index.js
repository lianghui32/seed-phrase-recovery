const { HDNodeWallet, LangEn } = require('ethers'); // BIP-39 + BIP-32 + EVM 地址，经广泛审计

// ==================== 配置区：只改这里 ====================
const CONFIG = {
  // 已知词，按原顺序填写，丢失的那个位置不填。
  // 12 词助记词 -> 填 11 个；15 词 -> 14 个；18 -> 17；21 -> 20；24 词 -> 填 23 个
  knownWords: [
    'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
  ],

  // 目标钱包地址（EVM 链通用），大小写不敏感
  targetAddress: '0x4...........................8',

  // BIP-44 派生路径，常见值：
  //   MetaMask / Trust / Ledger Live -> m/44'/60'/0'/0/0
  //   Ledger Legacy                  -> m/44'/60'/0'/0
  derivationPath: "m/44'/60'/0'/0/0",
};
// =========================================================

const WORDS = 2048; // BIP-39 英文词表大小
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];
const CONCURRENCY = 16; // 并发推导数，CPU 核心多可调大

async function addressFromMnemonic(mnemonic) {
  // 短语校验和非法时 fromPhrase 抛错，由调用方忽略
  const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, CONFIG.derivationPath);
  return wallet.address.toLowerCase();
}

// 在 missingIndex（0 基）位置枚举全部候选词
async function findWord(missingIndex) {
  const target = CONFIG.targetAddress.toLowerCase();
  let found = null;

  for (let start = 0; start < WORDS && !found; start += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, WORDS - start) }, (_, j) => {
      const wordIndex = start + j;
      const candidate = [...CONFIG.knownWords];
      candidate.splice(missingIndex, 0, bip39Word(wordIndex));
      return { wordIndex, word: candidate, mnemonic: candidate.join(' ') };
    });

    await Promise.all(batch.map(async ({ wordIndex, mnemonic }) => {
      if (found) return;
      let address;
      try {
        address = await addressFromMnemonic(mnemonic);
      } catch {
        return; // 校验和不合法，约半数组合在此被淘汰
      }
      if (address === target) {
        found = { wordIndex, mnemonic, address };
      }
    }));

    process.stdout.write(`\r  位置 ${missingIndex + 1}: 进度 ${Math.min(start + CONCURRENCY, WORDS)}/${WORDS}`);
  }
  process.stdout.write('\n');
  return found;
}

// BIP-39 英文词表（ethers 内置，与标准词表一致）
const WORDLIST = LangEn.wordlist();
function bip39Word(i) {
  return WORDLIST.getWord(i);
}

(async () => {
  const wordCount = CONFIG.knownWords.length + 1;
  console.log(`目标词数: ${wordCount} | 缺失 1 词 | 派生路径: ${CONFIG.derivationPath}\n`);

  if (!VALID_WORD_COUNTS.includes(wordCount)) {
    console.error(`已知词数量不对：应为 11/14/17/20/23 个（对应 12/15/18/21/24 词助记词），当前 ${CONFIG.knownWords.length} 个。`);
    process.exit(1);
  }

  for (let i = 0; i <= CONFIG.knownWords.length; i++) {
    const found = await findWord(i);
    if (found) {
      console.log(`\n=== 匹配成功 ===`);
      console.log(`缺失位置: 第 ${i + 1} 个词 | 候选词: ${bip39Word(found.wordIndex)}`);
      console.log(`完整助记词:\n${found.mnemonic}`);
      console.log(`钱包地址: ${found.address}`);
      process.exit(0);
    }
    console.log(`位置 ${i + 1} 未找到匹配。\n`);
  }

  console.log('全部位置均已穷举，未找到匹配。请检查：\n' +
    '  1. 已知词的顺序是否与原助记词一致\n' +
    '  2. 目标地址与派生路径是否匹配（如 Ledger Legacy 应改为 m/44\'/60\'/0\'/0）\n' +
    '  3. 地址是否属于当前助记词的第一对账户（可尝试改路径末位 0/1/2...）');
})();
