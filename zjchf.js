const bip39 = require('bip39') // BIP-39 库
const { hdkey } = require('ethereumjs-wallet')


// 正确的11个已知词（不含空位）
const knownWords = [
  'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'
];

const wordlist = bip39.wordlists.english; // 使用英文词汇表
const targetAddress = '0x4...........................8'; // 目标地址

async function getBSCAddressFromMnemonic(mnemonic) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const hdk = hdkey.fromMasterSeed(seed);
  const addrNode = hdk.derivePath("m/44'/60'/0'/0/0");
  const wallet = addrNode.getWallet();
  return `0x${wallet.getAddress().toString('hex').toLowerCase()}`; // 生成地址统一为小写
}

// 参数为丢失的助记词位置索引
async function findWord(missingWordIndex) {
  if (missingWordIndex > 10) return; // 修正索引检查（允许0-10所有位置）

  for (let word of wordlist) {
    const tryMnemonic = [...knownWords];
    tryMnemonic.splice(missingWordIndex, 0, word);
    let mnemonic = tryMnemonic.join(' ');

    try {
      const isValid = bip39.validateMnemonic(mnemonic);
      if (isValid) {
        let address = await getBSCAddressFromMnemonic(mnemonic);
        console.log(`测试位置 ${missingWordIndex} | 候选词: ${word.padEnd(8)} | 地址: ${address} | 找到正确助记词:\n${mnemonic}`);
       
        if (address === targetAddress) {
          console.log(`\n=== 匹配成功 ===`);
          console.log(`\n=== 匹配成功 ===\n位置 ${missingWordIndex} 找到正确助记词:\n${mnemonic}\n对应钱包地址:\n${address}\n`);
          console.log(`目标地址已验证: ${address}\n`);
          process.exit(0); // 找到后立即退出
          return;
        }
      }
    } catch (error) {
      console.error('发生错误:', error.message);
    }
  }
  console.log(`位置 ${missingWordIndex} 未找到匹配的助记词。`);
}

for (let i = 0; i < 11; i++) {
  findWord(i).catch(console.error);
}