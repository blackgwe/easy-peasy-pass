// eslint-disable-next-line no-var,no-use-before-define
var easyPeasyAuth = easyPeasyAuth || (() => {
  function sendMessagePromise(item) {
    return new Promise((resolve) => chrome.runtime.sendMessage(null, item, null, (_) => resolve(_)));
  }

  const { crypto } = window;
  const { subtle } = window.crypto;
  const pbkdf2KeyType = { name: 'AES-GCM', length: 256 };
  const pbkdf2KeyUsages = ['encrypt', 'decrypt'];
  const pbkdf2Params = (saltData) => ({
    name: 'PBKDF2', salt: saltData, iterations: 100000, hash: 'SHA-256',
  });
  const tplDef = {};

  tplDef.lowerCaseNum = [...Array(35)].map((_, i) => String.fromCharCode(i > 25 ? i + 23 : i + 97));
  // eslint-disable-next-line no-nested-ternary
  tplDef.letter = [...Array(62)].map((_, i) => String.fromCharCode(i < 26 ? i + 97 : (i < 52 ? i + 39 : i - 4)));
  tplDef.name = tplDef.letter.concat(['$', '_']);
  // eslint-disable-next-line no-useless-escape
  tplDef.simplest = tplDef.name.concat(Array.from('.,:;$!?#+-*/│\()^@€'));
  tplDef.simple = tplDef.simplest.concat(Array.from('-¼½¾²³º«»×µØÆƒß®©═±§¶-½²¾³º«»×µØÆí'));
  tplDef.strong = tplDef.simple.concat(Array.from('℠↯↺↻↩⇄⇆⇦⇧⇨⇩⌃⌄⍺'));
  tplDef.strongest = tplDef.strong.concat(Array.from('∑∀∃∄∂∫∬∅∈∉∊∏∗∘∙√∛∝∞∡∢∧∨∩∪∼≈≉≅≝≤≥≪≫⊂⊆⊄⊗⊖⊕'));

  let settings = {};
  let secretKey = null;
  let hash = null;
  const getSiteTemplate = () => settings[hash] ?? {};
  const getPasswordCharArr = (_) => tplDef[(_ ?? getSiteTemplate().template ?? '24×simple').split('×')[1]];
  const getPasswordLength = (_) => (_ ?? getSiteTemplate().template ?? '24×simple').split('×')[0] * 1;

  async function deriveKey(salt, rawKey) {
    const keyData = new TextEncoder().encode(rawKey);
    const saltData = new TextEncoder().encode(salt);
    const baseKey = await subtle.importKey('raw', keyData, 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    const derivedKey = subtle.deriveKey(pbkdf2Params(saltData), baseKey, pbkdf2KeyType, true, pbkdf2KeyUsages);

    return new Uint8Array(await subtle.exportKey('raw', await derivedKey));
  }

  async function deriveKey64Bit(rawKey, salt) {
    const result = new Uint8Array(96);
    result.set(await deriveKey(salt || '', rawKey));
    result.set(await deriveKey(`_${salt || ''}`, rawKey), 32);
    result.set(await deriveKey(`X${salt || ''}`, rawKey), 64);
    return result;
  }

  async function setSecret(_v, _salt) {
    secretKey = [...await deriveKey64Bit(_v ?? '', _salt ?? '')];
    hash = '_';
    new Uint8Array(secretKey)
      .slice(0, 5)
      .map((chrCode) => chrCode % tplDef.name.length)
      .forEach((v) => {
        hash += tplDef.name[v];
        return 0;
      });

    return this;
  }

  function getDerived(offset, templateSection, charArr, maxLen) {
    const tpl = getSiteTemplate()[templateSection];
    const correctingCodeStr = tpl ?? '';
    const correctingCode = Array.from(atob(correctingCodeStr)).map((v) => v.charCodeAt(0));
    const length = tpl ? correctingCode[0] : maxLen;
    const code = correctingCode.slice(1, maxLen);

    let result = '';
    new Uint8Array(secretKey)
      .slice(offset, offset + length)
      .map((hashByte, idx) => hashByte ^ code[idx])
      .map((chrCode) => chrCode % charArr.length)
      .forEach((v) => { result += charArr[v]; return undefined; });

    return result.substring(0, length);
  }

  async function getDerivedPass(templateSection, offset) {
    return getDerived(offset, templateSection, getPasswordCharArr(), getPasswordLength());
  }

  async function getDerivedUser(templateSection, offset) {
    return getDerived(offset, templateSection, tplDef.simple, 59);
  }

  function getCorrection(offset, str, charArr, maxLen) {
    const target = Array.from(str).map((c) => charArr.indexOf(c));
    const correctionArr = Array.from(
      new Uint8Array(secretKey)
        .slice(offset, offset + Math.min(maxLen, str.length + 1))
        .map((hashByte, idx) => hashByte ^ target[idx]),
    );
    const randomArrLen = Math.max(0, 16 - Math.min(maxLen, str.length + 1));
    const randomArr = Array.from(crypto
      .getRandomValues(new Uint8Array(randomArrLen))
      .map((hashByte, idx) => hashByte ^ target[idx]));

    return btoa(String.fromCharCode.apply(null, [str.length].concat(correctionArr).concat(randomArr)));
  }

  function getCorrectionUser(str) {
    return getCorrection(5, str, tplDef.simple, 59);
  }

  function getCorrectionPass(str) {
    return getCorrection(64, str, getPasswordCharArr(), getPasswordLength());
  }

  /** Symmetric Encryption for meta-data like comments */
  const getAesIv = async (s) => new Uint8Array([...await deriveKey64Bit(s)]);

  function getAesKey(secret) {
    const keyData = new TextEncoder().encode(secret.padEnd(16, '.')).slice(0, 16);
    return subtle.importKey('raw', keyData, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  async function symmetricEncrypt(secret, str) {
    const key = await getAesKey(secret);
    const value = new TextEncoder().encode(str);
    const buf = await subtle.encrypt({ name: 'AES-GCM', iv: await getAesIv(secret) }, key, value);
    const cipher = String.fromCharCode.apply(null, new Uint8Array(buf));

    return btoa(cipher);
  }

  async function symmetricDecrypt(secret, cipherText) {
    const key = await getAesKey(secret);
    const buf = new Uint8Array(Array.from(atob(cipherText)).map((v) => v.charCodeAt(0))).buffer;
    const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv: await getAesIv(secret) }, key, buf);

    return new TextDecoder().decode(plainBuf);
  }

  async function getMySecretBlocks(key, isShort, salt) {
    const blockKey = [...await deriveKey64Bit(key, `SALT_TRANSFER_SECRET_${salt}`)];
    let result = '';
    new Uint8Array(blockKey)
      .map((chrCode) => chrCode % 35)
      .forEach((v) => { result += tplDef.lowerCaseNum[v]; return undefined; });

    return isShort
      ? `${result.slice(0, 3)}-${result.slice(3, 6)}`
      : result;
  }

  function getScript(key) {
    const cipherJs = getSiteTemplate().script;
    return cipherJs ? symmetricDecrypt(key, cipherJs) : '';
  }

  return {
    setSettings: (v) => { settings = v; return undefined; },
    setSecret,
    getTemplateHash: () => hash,
    getCorrectionUser,
    getCorrectionPass,
    getDerivedPass: () => getDerivedPass('pass_correct', 64),
    getDerivedUser: () => getDerivedUser('user_correct', 5),
    getScript: (key) => getScript(key),
    doImmediatelySubmit: () => getSiteTemplate().submit ?? false,
    getMySecretBlocks: (secret, isShort, salt) => getMySecretBlocks(secret, isShort, salt),
    encrypt: symmetricEncrypt,
    decrypt: symmetricDecrypt,
    masterKeyHoldTime: () => getSiteTemplate().holdTime ?? 7 * 24 * 3600 * 1000,
    sendMessagePromise: (item) => sendMessagePromise(item),
  };
})();
