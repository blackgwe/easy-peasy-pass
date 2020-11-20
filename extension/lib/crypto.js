const cryptoJs = (() => {
  const
    subtle = window.crypto.subtle,
    pbkdf2KeyType = {"name": "AES-GCM", "length": 256},
    pbkdf2KeyUsages = ["encrypt", "decrypt"],
    pbkdf2Params = (saltData) => {
      return {"name": "PBKDF2",  salt: saltData, "iterations": 100000, "hash": "SHA-256"}
    },
    tplDef = {};

  tplDef.letter = [...Array(62)].map((_, i) => String.fromCharCode(i < 26 ? i + 97 : (i < 52 ? i + 39 : i - 4)));
  tplDef.name = tplDef.letter.concat(['$', '_']);

  tplDef.simplest = tplDef.name.concat(Array.from('.,:;$!?#+-*/│\()^@'));
  tplDef.simple = tplDef.simplest.concat(Array.from('-¼½¾²³º«»×µØÆƒß®©═±§¶-½²¾³º«»×µØÆí'));
  tplDef.strong = tplDef.simple.concat(Array.from('℠↯↺↻↩⇄⇆⇦⇧⇨⇩⌃⌄⍺'));
  tplDef.strongest = tplDef.strong.concat(Array.from('∑∀∃∄∂∫∬∅∈∉∊∏∗∘∙√∛∝∞∡∢∧∨∩∪∼≈≉≅≝≤≥≪≫⊂⊆⊄⊗⊖⊕'));

  let
    templatesDef= {},
    secretKey=null,
    hash=null,
    getTemplate = () => templatesDef[hash] ?? {},
    _getPasswordCharArr = () => tplDef[(getTemplate().template ?? '24×simple').split('×')][1],
    _getPasswordLength = () =>  (getTemplate().template ?? '24×simple').split('×')[0] * 1;

  async function _deriveKey(salt, rawKey) {
    const
      keyData = new TextEncoder().encode(rawKey),
      saltData = new TextEncoder().encode(salt),
      baseKey = await subtle.importKey("raw", keyData, "PBKDF2", false, ["deriveBits", "deriveKey"]),
      derivedKey = subtle.deriveKey(pbkdf2Params(saltData), baseKey, pbkdf2KeyType, true, pbkdf2KeyUsages);

    return new Uint8Array(await subtle.exportKey('raw', await derivedKey));
  }

  async function _deriveKey64Bit(rawKey, salt) {
    const result = new Uint8Array(64);
    result.set(await _deriveKey(salt || '', rawKey));
    result.set(await _deriveKey('X' + (salt || ''), rawKey), 32);
    return result;
  }

  async function setSecret(_v, _salt) {
    secretKey = [...await _deriveKey64Bit(_v, typeof _salt === 'undefined' ? '' : _salt)];
    hash = '_';
    new Uint8Array(secretKey)
      .slice(0, 5)
      .map(chrCode => chrCode % tplDef.name.length)
      .forEach((v) => hash += tplDef.name[v]);
    return this;
  }

  async function getDerived(templateSection, offset) {
    const
      charArr = _getPasswordCharArr(),
      tpl = getTemplate()[templateSection],
      correctingCodeStr = tpl ?? '',
      correctingCode = Array.from(atob(correctingCodeStr)).map(v => v.charCodeAt(0)),
      length = tpl ? correctingCode[0] : _getPasswordLength(),
      code = correctingCode.slice(1, 31);

    let result = '';
    new Uint8Array(secretKey)
          .slice(offset, offset + length)
          .map((hashByte, idx) => hashByte ^ code[idx])
          .map(chrCode => chrCode % charArr.length)
          .forEach((v) => result += charArr[v]);

    return result.substring(0, length);
  }

  function getCorrection(offset, str) {
    const
      target = Array.from(str).map(c => _getPasswordCharArr().indexOf(c)),
      correctionArr = Array.from(
        new Uint8Array(secretKey)
          .slice(offset, offset + _getPasswordLength())
          .map((hashByte, idx) => hashByte ^ target[idx])
      );
    return btoa(String.fromCharCode.apply(null, [str.length].concat(correctionArr)));
  }

  async function getDerivedMaster() {
    const holdTime = getTemplate().holdTime ?? 7 * 24 * 3600 * 1000;
    return {
      'hash': hash,
      'holdTime': holdTime,
      'template': null,
      'expired': new Date().getTime() + holdTime,
      'value': secretKey.map((n) => String.fromCharCode(n)).join('')
    };
  }

  /** Symmetric Encryption for meta-data like comments*/

  const _getAesIv = async (s) => new Uint8Array([...await _deriveKey64Bit(s)]);

  function _getAesKey(secret) {
    const keyData = new TextEncoder().encode(secret.padEnd(16, '.')).slice(0,16);
    return subtle.importKey("raw", keyData, "AES-GCM", true, ["encrypt", "decrypt"]);
  }

  async function symmetricEncrypt(secret, str) {
    const
      key = await _getAesKey(secret),
      value = new TextEncoder().encode(str),
      buf = await subtle.encrypt( { name: "AES-GCM", iv: await _getAesIv(secret) }, key, value),
      cipher = String.fromCharCode.apply(null, new Uint8Array(buf));

    return btoa(cipher);
  }

  async function symmetricDecrypt(secret, cipherText) {
    const
      key = await _getAesKey(secret),
      buf = new Uint8Array(Array.from(atob(cipherText)).map(v => v.charCodeAt(0))).buffer,
      plainBuf = await subtle.decrypt( { name: "AES-GCM", iv: await _getAesIv(secret)}, key, buf);

    return new TextDecoder().decode(plainBuf);
  }

  return {
    'setTemplateDefs': (v) => templatesDef = v,
    'setSecret': setSecret,
    'getTemplateHash': () => hash,
    'getCorrection': getCorrection,
    'getDerivedPass': () => getDerived('pass_correct', 32),
    'getDerivedUser': () => getDerived('user_correct', 5),
    'getDerivedMaster': getDerivedMaster,
    'encrypt': symmetricEncrypt,
    'decrypt': symmetricDecrypt,
    'isMasterKey': () => getTemplate().masterPass ?? false,
    'masterKeyHoldTime': () => getTemplate().holdTime ?? 7* 24 * 3600 * 1000,
  }
})();
