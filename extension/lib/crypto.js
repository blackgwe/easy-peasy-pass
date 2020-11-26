var easyPeasyAuth = easyPeasyAuth || (() => {

    function sendMessagePromise(item) {
        return new Promise((resolve) => chrome.runtime.sendMessage(null, item, null, _ => resolve(_)));
    }

    const
        crypto = window.crypto,
        subtle = window.crypto.subtle,
        pbkdf2KeyType = {'name': 'AES-GCM', 'length': 256},
        pbkdf2KeyUsages = ['encrypt', 'decrypt'],
        pbkdf2Params = (saltData) => {
            return {'name': 'PBKDF2', salt: saltData, 'iterations': 100000, 'hash': 'SHA-256'};
        },
        tplDef = {};

    tplDef.lowerCaseNum = [...Array(35)].map((_, i) => String.fromCharCode(i > 25 ? i + 23 : i + 97));
    tplDef.letter = [...Array(62)].map((_, i) => String.fromCharCode(i < 26 ? i + 97 : (i < 52 ? i + 39 : i - 4)));
    tplDef.name = tplDef.letter.concat(['$', '_']);
    tplDef.simplest = tplDef.name.concat(Array.from('.,:;$!?#+-*/│\()^@€'));
    tplDef.simple = tplDef.simplest.concat(Array.from('-¼½¾²³º«»×µØÆƒß®©═±§¶-½²¾³º«»×µØÆí'));
    tplDef.strong = tplDef.simple.concat(Array.from('℠↯↺↻↩⇄⇆⇦⇧⇨⇩⌃⌄⍺'));
    tplDef.strongest = tplDef.strong.concat(Array.from('∑∀∃∄∂∫∬∅∈∉∊∏∗∘∙√∛∝∞∡∢∧∨∩∪∼≈≉≅≝≤≥≪≫⊂⊆⊄⊗⊖⊕'));

    let
        settings = new Map(),
        secretKey = null,
        hash = null;
    
    const
        getSiteTemplate = () => settings.get(hash) ?? {},
        _getPasswordCharArr = () => tplDef[(getSiteTemplate().template ?? '24×simple').split('×')[1]],
        _getPasswordLength = () => (getSiteTemplate().template ?? '24×simple').split('×')[0] * 1;

    async function _deriveKey(salt, rawKey) {
        const
            keyData = new TextEncoder().encode(rawKey),
            saltData = new TextEncoder().encode(salt),
            baseKey = await subtle.importKey('raw', keyData, 'PBKDF2', false, ['deriveBits', 'deriveKey']),
            derivedKey = subtle.deriveKey(pbkdf2Params(saltData), baseKey, pbkdf2KeyType, true, pbkdf2KeyUsages);

        return new Uint8Array(await subtle.exportKey('raw', await derivedKey));
    }

    async function _deriveKey64Bit(rawKey, salt) {
        const result = new Uint8Array(96);
        result.set(await _deriveKey(salt || '', rawKey));
        result.set(await _deriveKey('_' + (salt || ''), rawKey), 32);
        result.set(await _deriveKey('X' + (salt || ''), rawKey), 64);
        return result;
    }

    async function setSecret(_v, _salt) {
        secretKey = [...await _deriveKey64Bit(_v ?? '', _salt ?? '')];
        hash = '_';
        new Uint8Array(secretKey)
            .slice(0, 5)
            .map(chrCode => chrCode % tplDef.name.length)
            .forEach((v) => hash += tplDef.name[v]);

        return this;
    }

    async function getDerivedPass(templateSection, offset) {
        return getDerived(offset, templateSection, _getPasswordCharArr(), _getPasswordLength());
    }

    async function getDerivedUser(templateSection, offset) {
        return getDerived(offset, templateSection, tplDef.simple, 59);
    }

    function getDerived(offset, templateSection, charArr, maxLen) {
        const
            tpl = getSiteTemplate()[templateSection] ?? null,
            correctingCodeStr = tpl ?? '',
            correctingCode = Array.from(atob(correctingCodeStr)).map(v => v.charCodeAt(0)),
            code = correctingCode.slice(1, maxLen),
            length = tpl ? correctingCode[0] : maxLen;

        let result = '';
        new Uint8Array(secretKey)
            .slice(offset, offset + length)
            .map((hashByte, idx) => hashByte ^ code[idx])
            .map(chrCode => chrCode % charArr.length)
            .forEach((v) => result += charArr[v]);

        return result.substring(0, length);
    }

    function getCorrectionUser(str) {
        return getCorrection(5, str, tplDef.simple, 59);
    }
    function getCorrectionPass(str) {
        return getCorrection(64, str, _getPasswordCharArr(), _getPasswordLength());
    }
    function getCorrection(offset, str, charArr, maxLen) {
        const
            target = Array.from(str).map(c => charArr.indexOf(c)),
            correctionArr = Array.from(
                new Uint8Array(secretKey)
                    .slice(offset, offset + Math.min(maxLen, str.length+1))
                    .map((hashByte, idx) => hashByte ^ target[idx])
            ),
            randomArrLen = Math.max(0, 16 - Math.min(maxLen, str.length+1)),
            randomArr = Array.from(crypto
                .getRandomValues(new Uint8Array(randomArrLen))
                .map((hashByte, idx) => hashByte ^ target[idx])
            );

        return btoa(String.fromCharCode.apply(null, [str.length].concat(correctionArr).concat(randomArr)));
    }

    /** Symmetric Encryption for meta-data like comments*/
    const _getAesIv = async (s) => new Uint8Array([...await _deriveKey64Bit(s)]);

    function _getAesKey(secret) {
        const keyData = new TextEncoder().encode(secret.padEnd(16, '.')).slice(0, 16);
        return subtle.importKey('raw', keyData, 'AES-GCM', true, ['encrypt', 'decrypt']);
    }

    async function symmetricEncrypt(secret, str) {
        const
            key = await _getAesKey(secret),
            value = new TextEncoder().encode(str),
            buf = await subtle.encrypt({name: 'AES-GCM', iv: await _getAesIv(secret)}, key, value),
            cipher = String.fromCharCode.apply(null, new Uint8Array(buf));

        return btoa(cipher);
    }

    async function symmetricDecrypt(secret, cipherText) {
        const
            key = await _getAesKey(secret),
            buf = new Uint8Array(Array.from(atob(cipherText)).map(v => v.charCodeAt(0))).buffer,
            plainBuf = await subtle.decrypt({name: 'AES-GCM', iv: await _getAesIv(secret)}, key, buf);

        return new TextDecoder().decode(plainBuf);
    }

    async function getMySecretBlocks(key, isShort, salt) {
        const secretKey = [...await _deriveKey64Bit(key, `SALT_TRANSFER_SECRET_${salt}`)];
        let result = '';
        new Uint8Array(secretKey)
            .map(chrCode => chrCode % 35)
            .forEach((v) => result += tplDef.lowerCaseNum[v]);

        return isShort
            ? result.slice(0, 3) + '-' + result.slice(3, 6)
            : result;
    }

    function getScript(key) {
        const cipherJs = getSiteTemplate().__comment_script;
        return cipherJs ? symmetricDecrypt(key, cipherJs) : '';
    }

    return {
        'setSettings': (v) => { for (let k of Object.keys(v)) settings.set(k, v[k]) },
        'getSettings': () => { let obj = Object.create(null);  for (let [k,v] of strMap) obj[k] = v; return obj;} ,
        'setSecret': setSecret,
        'getTemplateHash': () => hash,
        'getCorrectionUser': getCorrectionUser,
        'getCorrectionPass': getCorrectionPass,
        'getDerivedPass': () => getDerivedPass('pass_correct', 64),
        'getDerivedUser': () => getDerivedUser('user_correct', 5),
        'getScript': (key) => getScript(key),
        'doImmediatelySubmit': () => getSiteTemplate().submit ?? false,
        'getMySecretBlocks': (secret, isShort, salt) => getMySecretBlocks(secret, isShort, salt),
        'encrypt': symmetricEncrypt,
        'decrypt': symmetricDecrypt,
        'masterKeyHoldTime': () => getSiteTemplate().holdTime ?? 7 * 24 * 3600 * 1000,
        'sendMessagePromise': (item) => sendMessagePromise(item),
    };
})();
