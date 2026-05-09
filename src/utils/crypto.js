import CryptoJS from 'crypto-js'

export function md5(message) {
  return CryptoJS.MD5(message).toString()
}

export function aesDecrypt(ciphertext, key, iv) {
  const keyHash = CryptoJS.enc.Utf8.parse(md5(key))
  const ivHash = CryptoJS.enc.Utf8.parse(md5(iv))
  const encHex = CryptoJS.enc.Hex.parse(ciphertext)
  const encrypted = CryptoJS.enc.Base64.stringify(encHex)
  const decrypted = CryptoJS.AES.decrypt(encrypted, keyHash, {
    iv: ivHash,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

/**
 * AES-128-CBC 解密，输入为 URL-safe Base64 编码的密文
 * 与 Easydict Swift 实现一致：Base64 解码 → AES 解密（key/iv 取 MD5）
 * 使用 Web Crypto API 确保兼容性
 */
export async function aesDecryptBase64(encryptedBase64, key, iv) {
  // URL-safe Base64 → 标准 Base64
  let standardBase64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/')
  // 补齐 padding
  const pad = standardBase64.length % 4
  if (pad === 2) standardBase64 += '=='
  else if (pad === 3) standardBase64 += '='

  // Base64 解码为字节数组
  const ciphertext = Uint8Array.from(atob(standardBase64), c => c.charCodeAt(0))

  // key/iv 取 MD5 原始字节（16 字节），与 Swift 的 Insecure.MD5.hash(data:) 一致
  const keyHash = md5ToBytes(CryptoJS.MD5(key))
  const ivHash = md5ToBytes(CryptoJS.MD5(iv))


  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyHash, { name: 'AES-CBC' }, false, ['decrypt']
  )

  // AES-128-CBC 解密
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivHash },
    cryptoKey,
    ciphertext
  )

  const result = new TextDecoder().decode(decrypted)
  return result
}

export function hmacSha1(message, key) {
  return CryptoJS.HmacSHA1(message, key).toString(CryptoJS.enc.Base64)
}

export function hmacSha256(message, key) {
  return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex)
}

/** CryptoJS WordArray → Uint8Array */
function wordArrayToBytes(wordArray) {
  const words = wordArray.words
  const sigBytes = wordArray.sigBytes
  const bytes = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i++) {
    bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return bytes
}

/** MD5 返回原始 16 字节（与 Swift MD5 hash 一致） */
function md5ToBytes(wordArray) {
  return wordArrayToBytes(wordArray)
}
