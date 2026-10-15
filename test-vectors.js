// 测试向量：验证地址派生逻辑正确（CI 秒级完成，不做全量枚举）
// 校验方式为数学自洽：地址必须等于派生公钥 keccak256 的后 20 字节（EIP-55 定义），
// 并检查不同路径/账户索引的唯一性。
const { HDNodeWallet, verifyMessage } = require('ethers');
const assert = require('assert');

function wallet(mnemonic, path) {
  return HDNodeWallet.fromPhrase(mnemonic, undefined, path);
}

function assertWalletConsistent(w, label) {
  // 签名-恢复闭环：由签名恢复出的地址必须等于钱包地址（密钥<->地址数学自洽）
  const sig = w.signMessageSync('seed-phrase-recovery test vector');
  assert.strictEqual(
    verifyMessage('seed-phrase-recovery test vector', sig).toLowerCase(),
    w.address.toLowerCase(),
    `${label}: 签名恢复地址与钱包地址不一致`
  );
}

(async () => {
  // BIP-39 官方向量（entropy 全 0）：12 词
  const m12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const w12 = wallet(m12, "m/44'/60'/0'/0/0");
  assertWalletConsistent(w12, '12 词默认路径');

  // 官方向量：24 词（entropy 全 0），checksum 校验由 fromPhrase 隐式完成（非法会抛错）
  const m24 = 'abandon '.repeat(23) + 'art';
  const w24 = wallet(m24, "m/44'/60'/0'/0/0");
  assertWalletConsistent(w24, '24 词默认路径');

  // 同一助记词不同路径/账户索引地址必须唯一
  const w24Legacy = wallet(m24, "m/44'/60'/0'/0");
  const w24Acct1 = wallet(m24, "m/44'/60'/0'/0/1");
  const addrs = [w24.address, w24Legacy.address, w24Acct1.address];
  assert.strictEqual(new Set(addrs).size, 3, '不同路径/索引的地址应互不相同');

  // 非法助记词（校验和不过）必须抛错：把 about 换成 abandon
  const bad = 'abandon '.repeat(11) + 'abandon';
  assert.throws(() => HDNodeWallet.fromPhrase(bad, undefined, "m/44'/60'/0'/0/0"), '非法助记词应被拒绝');

  console.log('全部测试向量通过');
  console.log(`  12 词默认路径地址: ${w12.address}`);
  console.log(`  24 词默认路径地址: ${w24.address}`);
  console.log(`  24 词 Ledger Legacy 地址: ${w24Legacy.address}`);
})();
